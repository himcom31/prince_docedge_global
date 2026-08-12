// controllers/notificationPlanController.js
const axios                    = require('axios');
const NotificationPlan         = require('../models/NotificationPlan');
const NotificationSubscription = require('../models/NotificationSubscription');

const CF_BASE = process.env.CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const cfHeaders = {
  'x-client-id':     process.env.CASHFREE_APP_ID,
  'x-client-secret': process.env.CASHFREE_SECRET_KEY,
  'x-api-version':   '2023-08-01',
  'Content-Type':    'application/json',
};

const nextMonthDate = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
};

// POST /api/notification-plans
exports.createPlan = async (req, res) => {
  try {
    const plan = await NotificationPlan.create(req.body);
    res.status(201).json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/notification-plans/all
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await NotificationPlan.find().sort({ displayOrder: 1, createdAt: -1 });
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/notification-plans/:id
exports.updatePlan = async (req, res) => {
  try {
    const plan = await NotificationPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/notification-plans/:id
exports.deletePlan = async (req, res) => {
  try {
    await NotificationPlan.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Plan deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/notification-plans
exports.getPlans = async (req, res) => {
  try {
    const plans = await NotificationPlan.find({ isActive: true }).sort({ displayOrder: 1, monthlyPrice: 1 });
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/notification-plans/subscribe
exports.subscribe = async (req, res) => {
  try {
    const { planId, interval } = req.body;
    const doctor = req.user;

    const newPlan = await NotificationPlan.findById(planId);
    if (!newPlan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const amount = interval === 'yearly' ? newPlan.yearlyPrice : newPlan.monthlyPrice;
    if (!amount) return res.status(400).json({ success: false, message: `${interval} price not set for this plan` });

    // Existing active subscription check
    const existingSub = await NotificationSubscription.findOne({
      doctorId: doctor._id,
      status:   'active',
    }).populate('planId');

    // Downgrade allowed nahi
    

    const orderId = `NOTIF_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const { data: cfOrder } = await axios.post(
      `${CF_BASE}/orders`,
      {
        order_id:       orderId,
        order_amount:   amount,
        order_currency: 'INR',
        customer_details: {
          customer_id:    doctor._id.toString(),
          customer_email: doctor.email,
          customer_phone: doctor.mobile || '9999999999',
          customer_name:  doctor.name,
        },
        order_meta: {
          return_url: `${process.env.FRONTEND_URLN}/${doctor.slug}/dashboard/notifications/payment-status?order_id={order_id}`,
          notify_url: `${process.env.BACKEND_URL}/api/notification-plans/webhook`,
        },
        order_note: `${newPlan.name} | ${interval} | ${doctor.clinicName || doctor.name}`,
      },
      { headers: cfHeaders }
    );

    await NotificationSubscription.create({
      doctorId:        doctor._id,
      planId,
      interval,
      status:          'cancelled',
      cashfreeOrderId: orderId,
      paidAmount:      amount,
      expiryDate:      null,
      usage: {
        whatsapp: { used: 0, resetDate: nextMonthDate() },
        email:    { used: 0, resetDate: nextMonthDate() },
        sms:      { used: 0, resetDate: nextMonthDate() },
      },
    });

    res.json({
      success:          true,
      paymentSessionId: cfOrder.payment_session_id,
      orderId,
      
    });

  } catch (err) {
    console.error('subscribe error:', err?.response?.data || err.message);
    res.status(500).json({ success: false, message: err?.response?.data?.message || err.message });
  }
};

// POST /api/notification-plans/webhook
exports.webhook = async (req, res) => {
  try {
    const event = JSON.parse(req.body.toString());

    if (event.type !== 'PAYMENT_SUCCESS_WEBHOOK') {
      return res.status(200).json({ received: true });
    }

    const orderId     = event.data?.order?.order_id;
    const orderAmount = event.data?.order?.order_amount;
    if (!orderId) return res.status(200).json({ received: true });

    const newSub = await NotificationSubscription.findOne({
      cashfreeOrderId: orderId,
      status:          'cancelled',
    });
    if (!newSub) return res.status(200).json({ received: true });

    // Idempotency check
    const alreadyActive = await NotificationSubscription.findOne({
      cashfreeOrderId: orderId,
      status:          'active',
    });
    if (alreadyActive) return res.status(200).json({ received: true });

    // Pehle wale active subscriptions expire karo (upgrade/renewal dono case)
    await NotificationSubscription.updateMany(
      {
        doctorId: newSub.doctorId,
        status:   'active',
        _id:      { $ne: newSub._id },
      },
      { $set: { status: 'expired' } }
    );

    // Naya plan aaj se shuru (remaining days waste — as decided)
    const durationDays = newSub.interval === 'yearly' ? 365 : 30;
    const expiryDate   = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    newSub.status     = 'active';
    newSub.paidAmount = orderAmount;
    newSub.expiryDate = expiryDate;
    await newSub.save();

    console.log(`Notification subscription activated/renewed/upgraded: ${orderId} | Expires: ${expiryDate.toDateString()}`);
    res.status(200).json({ received: true });

  } catch (err) {
    console.error('notification webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/notification-plans/verify/:orderId
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const sub = await NotificationSubscription.findOne({ cashfreeOrderId: orderId })
      .populate('planId')
      .populate('doctorId', 'mobile email name');   // <-- doctor info bhi chahiye

    // ── helper: details object banana ──────────────────────────
    const buildDetails = (sub, cashfreeOrder = null) => ({
      planName:      sub.planId?.name   || null,
      mobile:        sub.doctorId?.mobile || cashfreeOrder?.customer_details?.customer_phone || null,
      email:         sub.doctorId?.email  || cashfreeOrder?.customer_details?.customer_email || null,
      amount:        sub.planId?.price  ?? cashfreeOrder?.order_amount ?? null,
      transactionId: cashfreeOrder?.cf_order_id || sub.cashfreeOrderId || null,
      paymentMode:   cashfreeOrder?.payment_session_id ? null : null,  // webhook se aata hai, optional
    });
    // ────────────────────────────────────────────────────────────

    // Already active — seedha details return karo
    if (sub && sub.status === 'active') {
      return res.json({
        success: true,
        paid:    true,
        details: buildDetails(sub),
      });
    }

    // Cashfree se order status check karo
    const { data: cfOrder } = await axios.get(`${CF_BASE}/orders/${orderId}`, { headers: cfHeaders });

    if (cfOrder.order_status !== 'PAID') {
      return res.json({ success: true, paid: false });
    }

    // Webhook miss hua — manually activate karo
    if (sub) {
      await NotificationSubscription.updateMany(
        {
          doctorId: sub.doctorId,
          status:   'active',
          _id:      { $ne: sub._id },
        },
        { $set: { status: 'expired' } }
      );

      const durationDays = sub.interval === 'yearly' ? 365 : 30;
      const expiryDate   = new Date();
      expiryDate.setDate(expiryDate.getDate() + durationDays);

      sub.status     = 'active';
      sub.expiryDate = expiryDate;
      await sub.save();
    }

    return res.json({
      success: true,
      paid:    true,
      details: buildDetails(sub, cfOrder),
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
// GET /api/notification-plans/my-subscription
exports.mySubscription = async (req, res) => {
  try {
    const doctor = req.user;

    const sub = await NotificationSubscription.findOne({
      doctorId: doctor._id,
      status:   'active',
    }).populate('planId');

    if (!sub) {
      return res.json({ success: true, hasSubscription: false });
    }

    const now       = new Date();
    const isExpired = sub.expiryDate && now > new Date(sub.expiryDate);

    // DB mein bhi expire karo
    if (isExpired) {
      sub.status = 'expired';
      await sub.save();
      return res.json({ success: true, hasSubscription: false, isExpired: true });
    }

    const daysLeft = sub.expiryDate
      ? Math.max(0, Math.ceil((new Date(sub.expiryDate) - now) / (1000 * 60 * 60 * 24)))
      : null;

    // Monthly usage reset check
    const channels = ['whatsapp', 'email', 'sms'];
    let changed = false;
    for (const ch of channels) {
      const resetDate = sub.usage?.[ch]?.resetDate;
      if (!resetDate || now > new Date(resetDate)) {
        sub.usage[ch].used      = 0;
        sub.usage[ch].resetDate = nextMonthDate();
        changed = true;
      }
    }
    if (changed) await sub.save();

    const plan   = sub.planId;
    const limits = {
      whatsapp: { limit: plan?.whatsappLimit || 0, used: sub.usage?.whatsapp?.used || 0, resetDate: sub.usage?.whatsapp?.resetDate },
      email:    { limit: plan?.emailLimit    || 0, used: sub.usage?.email?.used    || 0, resetDate: sub.usage?.email?.resetDate    },
      sms:      { limit: plan?.smsLimit      || 0, used: sub.usage?.sms?.used      || 0, resetDate: sub.usage?.sms?.resetDate      },
    };

    for (const ch of channels) {
      limits[ch].remaining = Math.max(0, limits[ch].limit - limits[ch].used);
      limits[ch].enabled   = limits[ch].limit > 0;
    }

    res.json({
      success:         true,
      hasSubscription: true,
      isExpired:       false,
      daysLeft,
      plan: {
        name:  plan?.name,
        badge: plan?.badge,
      },
      interval:   sub.interval,
      expiryDate: sub.expiryDate,
      paidAmount: sub.paidAmount,
      limits,
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// HELPER — channel = 'whatsapp' | 'email' | 'sms'
exports.incrementUsage = async (doctorId, channel) => {
  try {
    const sub = await NotificationSubscription.findOne({ doctorId, status: 'active' });
    if (!sub) return { allowed: false, reason: 'No active subscription' };

    const now = new Date();
    if (sub.expiryDate && now > new Date(sub.expiryDate)) {
      sub.status = 'expired';
      await sub.save();
      return { allowed: false, reason: 'Subscription expired. Please renew.' };
    }

    const plan  = await NotificationPlan.findById(sub.planId);
    const limit = plan?.[`${channel}Limit`] || 0;
    const used  = sub.usage?.[channel]?.used || 0;

    if (limit === 0)   return { allowed: false, reason: `${channel} not included in your plan` };
    if (used >= limit) return { allowed: false, reason: `${channel} limit reached (${used}/${limit}). Upgrade or renew your plan.` };

    const resetDate = sub.usage?.[channel]?.resetDate;
    if (!resetDate || now > new Date(resetDate)) {
      sub.usage[channel].used      = 0;
      sub.usage[channel].resetDate = nextMonthDate();
    }

    sub.usage[channel].used += 1;
    await sub.save();

    return { allowed: true, used: sub.usage[channel].used, limit };

  } catch (err) {
    console.error('incrementUsage error:', err.message);
    return { allowed: false, reason: 'Server error' };
  }
};

// HELPER — sirf check karo, increment nahi
exports.checkUsage = async (doctorId, channel) => {
  try {
    const sub = await NotificationSubscription.findOne({ doctorId, status: 'active' });
    if (!sub) return { allowed: false, reason: 'No active subscription' };

    const now = new Date();
    if (sub.expiryDate && now > new Date(sub.expiryDate)) {
      sub.status = 'expired';
      await sub.save();
      return { allowed: false, reason: 'Subscription expired. Please renew.' };
    }

    const plan  = await NotificationPlan.findById(sub.planId);
    const limit = plan?.[`${channel}Limit`] || 0;
    const used  = sub.usage?.[channel]?.used || 0;

    if (limit === 0)   return { allowed: false, reason: `${channel} not included in your plan` };
    if (used >= limit) return { allowed: false, reason: `${channel} limit reached (${used}/${limit}). Upgrade or renew your plan.` };

    return { allowed: true, used, limit };

  } catch (err) {
    console.error('checkUsage error:', err.message);
    return { allowed: false, reason: 'Server error' };
  }
};

// HELPER — sirf increment karo (send success ke baad call karo)
exports.incrementUsageOnly = async (doctorId, channel) => {
  try {
    const sub = await NotificationSubscription.findOne({ doctorId, status: 'active' });
    if (!sub) return;

    const now       = new Date();
    const resetDate = sub.usage?.[channel]?.resetDate;
    if (!resetDate || now > new Date(resetDate)) {
      sub.usage[channel].used      = 0;
      sub.usage[channel].resetDate = nextMonthDate();
    }

    sub.usage[channel].used += 1;
    await sub.save();

  } catch (err) {
    console.error('incrementUsageOnly error:', err.message);
  }
};

// GET /api/notification-plans/channel-status/:slug
exports.channelStatus = async (req, res) => {
  try {
    const { slug } = req.params;

    const Doctor = require('../models/Doctor');
    const doctor = await Doctor.findOne({ slug });
    if (!doctor) return res.status(404).json({ success: false, message: 'Clinic not found' });

    const now = new Date();
    const sub = await NotificationSubscription.findOne({
      doctorId:   doctor._id,
      status:     'active',
      expiryDate: { $gt: now },
    }).populate('planId');

    if (!sub || !sub.planId) {
      return res.json({
        success:  true,
        whatsapp: { allowed: false, reason: 'No active notification subscription' },
        email:    { allowed: false, reason: 'No active notification subscription' },
      });
    }

    const plan = sub.planId;
    const checkChannel = (channel) => {
      const limit = plan[`${channel}Limit`] ?? 0;
      const usage = sub.usage?.[channel] ?? {};
      let used = usage.used ?? 0;
      if (usage.resetDate && now > new Date(usage.resetDate)) used = 0;
      if (limit === 0)   return { allowed: false, reason: `${channel} not included in your plan`, used, limit };
      if (used >= limit) return { allowed: false, reason: `${channel} limit reached (${used}/${limit})`, used, limit };
      return { allowed: true, used, limit };
    };

    return res.json({
      success:  true,
      whatsapp: checkChannel('whatsapp'),
      email:    checkChannel('email'),
    });

  } catch (err) {
    console.error('channelStatus error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};