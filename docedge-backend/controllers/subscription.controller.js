const crypto       = require('crypto');
const axios        = require('axios');
const mongoose     = require('mongoose');
const nodemailer   = require('nodemailer');
const Subscription = require('../models/Subscription');
const Doctor       = require('../models/Doctor');
const PendingSignup= require('../models/PendingSignup');
const Plan         = require('../models/Plan');
const RenewPending = require('../models/Renewpending');

const CF_BASE = process.env.CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const cfHeaders = {
  'x-client-id':     process.env.CASHFREE_APP_ID,
  'x-client-secret': process.env.CASHFREE_SECRET_KEY,
  'x-api-version':   '2023-08-01',
  'Content-Type':    'application/json',
};

// ── Slug helpers ──────────────────────────────────────────────────────────────
const slugify = (text) =>
  text.toString().toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const generateUniqueSlug = async (clinicName) => {
  const base = slugify(clinicName) || 'clinic';
  let slug = base, counter = 1;
  while (await Doctor.findOne({ slug })) slug = `${base}-${counter++}`;
  return slug;
};

// ── Welcome email ─────────────────────────────────────────────────────────────
const sendWelcomeEmail = async ({ name, email, clinicName, slug, plainPassword }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Welcome to DocEdge - ${clinicName}`,
      html: `
        <h1>Hello Dr. ${name},</h1>
        <p>Your clinic management portal has been successfully set up.</p>
        <p><b>Login URL:</b> https://docedge.tbskit.cloud/${slug}/login</p>
        <p><b>Username:</b> ${email}</p>
        <p><b>Password:</b> ${plainPassword}</p>
        <br><p>Regards,<br>DocEdge Team</p>
      `,
    });
    console.log(`📧 Welcome email sent to ${email}`);
  } catch (err) {
    console.error('Welcome email error:', err.message);
  }
};

// ── Renewal confirmation email ────────────────────────────────────────────────
const sendRenewalEmail = async ({ name, email, clinicName, planName, interval, expiryDate, amount }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    const fmt = (d) =>
      new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `DocEdge Subscription Renewed — ${clinicName}`,
      html: `
        <h2>Hello Dr. ${name},</h2>
        <p>Your DocEdge subscription has been successfully renewed.</p>
        <table style="border-collapse:collapse;width:100%;max-width:400px">
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">Plan</td>
              <td style="padding:8px;border:1px solid #e2e8f0">${planName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">Interval</td>
              <td style="padding:8px;border:1px solid #e2e8f0">${interval === 'yearly' ? 'Annual' : 'Monthly'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">Amount Paid</td>
              <td style="padding:8px;border:1px solid #e2e8f0">₹${Number(amount).toLocaleString('en-IN')}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">New Expiry</td>
              <td style="padding:8px;border:1px solid #e2e8f0">${fmt(expiryDate)}</td></tr>
        </table>
        <br><p>Regards,<br>DocEdge Team</p>
      `,
    });
    console.log(`📧 Renewal email sent to ${email}`);
  } catch (err) {
    console.error('Renewal email error:', err.message);
  }
};

// ── Create Doctor from PendingSignup (new signup flow) ───────────────────────
const createDoctorFromPending = async (pending, orderId, orderAmount = 0) => {
  const slug = await generateUniqueSlug(pending.clinicName);

  const doctor = await Doctor.create({
    name:               pending.name,
    email:              pending.email,
    clinicName:         pending.clinicName,
    slug,
    password:           pending.password,
    mobile:             pending.mobile,
    address:            pending.address,
    subscriptionStatus: 'active',
  });

  const clinicCollectionName = slug.replace(/-/g, '_');
  const DynamicModel = mongoose.models[clinicCollectionName]
    ? mongoose.model(clinicCollectionName)
    : mongoose.model(clinicCollectionName, new mongoose.Schema({}, { strict: false, timestamps: true }));

  await DynamicModel.create({
    message:   `Database for ${pending.clinicName} initialized`,
    ownerId:   doctor._id,
    setupDate: new Date(),
  });

  const planDoc      = await Plan.findById(pending.planId);
  const durationDays = planDoc?.durationDays || (pending.interval === 'yearly' ? 365 : 30);
  const expiryDate   = new Date();
  expiryDate.setDate(expiryDate.getDate() + durationDays);

  await Subscription.create({
    clinicId:         doctor._id,
    planId:           pending.planId,
    interval:         pending.interval,
    cashfreeOrderId:  orderId,
    status:           'active',
    paidAmount:       orderAmount,
    totalPaid:        orderAmount,
    expiryDate,
    patientLimit:     planDoc?.patientLimit ?? 0,
    appointmentsUsed: 0,
  });

  pending.status = 'completed';
  await pending.save();

  await sendWelcomeEmail({
    name:          pending.name,
    email:         pending.email,
    clinicName:    pending.clinicName,
    slug,
    plainPassword: pending.plainPassword || '(set during signup)',
  });

  pending.plainPassword = null;
  await pending.save();

  console.log(`✅ Doctor created: ${doctor.email} | Order: ${orderId}`);
  return doctor;
};

// ── Process Renewal ───────────────────────────────────────────────────────────
const processRenew = async ({ doctorId, planId, interval, orderId, orderAmount }) => {
  const plan         = await Plan.findById(planId);
  const durationDays = plan?.durationDays ?? (interval === 'yearly' ? 365 : 30);
  const doctor       = await Doctor.findById(doctorId);

  let existingSub = await Subscription.findOne({
    clinicId: doctorId,
    status:   { $in: ['active', 'expired', 'created'] },
  });

  const now       = new Date();
  const newExpiry = new Date(now);
  newExpiry.setDate(newExpiry.getDate() + durationDays);

  const newPatientLimit = (plan?.patientLimit && plan.patientLimit > 0)
    ? plan.patientLimit
    : 0;

  if (existingSub) {
    const isSamePlan = existingSub.planId?.toString() === planId?.toString();

    existingSub.planId       = planId;
    existingSub.interval     = interval;
    existingSub.expiryDate   = newExpiry;
    existingSub.status       = 'active';
    existingSub.paidAmount   = orderAmount;
    existingSub.totalPaid    = (existingSub.totalPaid || 0) + (orderAmount || 0);
    existingSub.patientLimit = newPatientLimit;

    // ── BUG FIX: Same plan → appointments keep karo, alag plan → reset ──────
    if (!isSamePlan) {
  existingSub.appointmentsUsed = 0;
  console.log(`🔄 Plan changed (${existingSub.planId} → ${planId}) — appointments reset to 0`);
} else {
  console.log(`🔄 Same plan renewed — appointments kept: ${existingSub.appointmentsUsed}`);
}

    if (!existingSub.renewalOrders) existingSub.renewalOrders = [];
    existingSub.renewalOrders.push({
      orderId,
      planId,
      interval,
      amount: orderAmount,
      paidAt: now,
    });

    await existingSub.save();
  } else {
    await Subscription.create({
      clinicId:         doctorId,
      planId,
      interval,
      cashfreeOrderId:  orderId,
      status:           'active',
      paidAmount:       orderAmount,
      totalPaid:        orderAmount,
      expiryDate:       newExpiry,
      patientLimit:     newPatientLimit,
      appointmentsUsed: 0,
      renewalOrders:    [],
    });
  }

  await Doctor.findByIdAndUpdate(doctorId, { subscriptionStatus: 'active' });

  if (doctor) {
    await sendRenewalEmail({
      name:       doctor.name,
      email:      doctor.email,
      clinicName: doctor.clinicName,
      planName:   plan?.name || 'DocEdge Plan',
      interval,
      expiryDate: newExpiry,
      amount:     orderAmount,
    });
  }

  console.log(`✅ Subscription renewed: doctorId=${doctorId} | Plan: ${plan?.name} | PatientLimit: ${newPatientLimit || 'Unlimited'} | Expiry: ${newExpiry.toDateString()}`);
};

// ── POST /api/subscriptions/webhook ──────────────────────────────────────────
exports.webhook = async (req, res) => {
  try {
    const rawBody   = req.body;
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    if (signature && timestamp) {
      const expected = crypto
        .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
        .update(timestamp + rawBody.toString())
        .digest('base64');

      if (signature !== expected) {
        console.warn('Cashfree webhook: invalid signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const event = JSON.parse(rawBody.toString());
    console.log('Cashfree webhook event:', event.type);

    if (event.type !== 'PAYMENT_SUCCESS_WEBHOOK')
      return res.status(200).json({ received: true });

    const orderId     = event.data?.order?.order_id;
    const orderAmount = event.data?.order?.order_amount;
    if (!orderId) return res.status(200).json({ received: true });

    if (orderId.startsWith('RNW_')) {
      const renewPending = await RenewPending.findOne({ orderId, status: 'pending' });
      if (!renewPending) {
        console.warn('No RenewPending for order:', orderId);
        return res.status(200).json({ received: true });
      }

      await processRenew({
        doctorId:    renewPending.doctorId,
        planId:      renewPending.planId,
        interval:    renewPending.interval,
        orderId,
        orderAmount,
      });

      renewPending.status = 'completed';
      await renewPending.save();
      return res.status(200).json({ received: true });
    }

    const existingSub = await Subscription.findOne({ cashfreeOrderId: orderId });
    if (existingSub) {
      console.log('Already processed signup order:', orderId);
      return res.status(200).json({ received: true });
    }

    const pending = await PendingSignup.findOne({
      razorpaySubscriptionId: orderId,
      status: 'pending',
    });

    if (!pending) {
      console.warn('No PendingSignup for order:', orderId);
      return res.status(200).json({ received: true });
    }

    await createDoctorFromPending(pending, orderId, orderAmount);
    res.status(200).json({ received: true });

  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/subscriptions/verify/:orderId ────────────────────────────────────
exports.verifyOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (orderId.startsWith('RNW_')) {
      const renewPending = await RenewPending.findOne({ orderId });

      if (renewPending?.status === 'completed') {
        const doctor = await Doctor.findById(renewPending.doctorId).select('email mobile clinicName slug');
        const sub    = await Subscription.findOne({ clinicId: renewPending.doctorId });
        return res.json({
          success: true, paid: true, type: 'renewal',
          details: {
            amount:        renewPending.amount,
            email:         doctor?.email,
            mobile:        doctor?.mobile,
            loginUrl:      `https://docedge.tbskit.cloud/${doctor?.slug}/login`,
            expiryDate:    sub?.expiryDate,
            transactionId: orderId,
          },
        });
      }

      const { data } = await axios.get(`${CF_BASE}/orders/${orderId}`, { headers: cfHeaders });
      if (data.order_status !== 'PAID')
        return res.json({ success: true, paid: false, type: 'renewal' });

      if (renewPending && renewPending.status === 'pending') {
        await processRenew({
          doctorId:    renewPending.doctorId,
          planId:      renewPending.planId,
          interval:    renewPending.interval,
          orderId,
          orderAmount: data.order_amount,
        });
        renewPending.status = 'completed';
        await renewPending.save();
      }

      const doctor = renewPending
        ? await Doctor.findById(renewPending.doctorId).select('email mobile clinicName slug')
        : null;
      const sub = doctor
        ? await Subscription.findOne({ clinicId: doctor._id })
        : null;

      return res.json({
        success: true, paid: true, type: 'renewal',
        details: {
          amount:        data.order_amount,
          email:         doctor?.email,
          mobile:        doctor?.mobile,
          loginUrl:      doctor ? `https://docedge.tbskit.cloud/${doctor.slug}/login` : null,
          expiryDate:    sub?.expiryDate,
          transactionId: orderId,
        },
      });
    }

    // New signup verify
    const existingSub = await Subscription.findOne({ cashfreeOrderId: orderId });
    if (existingSub?.status === 'active') {
      const doctor = await Doctor.findById(existingSub.clinicId).select('email mobile clinicName slug');
      return res.json({
        success: true, paid: true, type: 'signup',
        details: {
          amount:        existingSub.paidAmount,
          email:         doctor?.email,
          mobile:        doctor?.mobile,
          loginUrl:      `https://docedge.tbskit.cloud/${doctor?.slug}/login`,
          transactionId: orderId,
        },
      });
    }

    const { data } = await axios.get(`${CF_BASE}/orders/${orderId}`, { headers: cfHeaders });
    if (data.order_status !== 'PAID')
      return res.json({ success: true, paid: false, type: 'signup' });

    const pending = await PendingSignup.findOne({
      razorpaySubscriptionId: orderId,
      status: 'pending',
    });

    let doctor = await Doctor.findOne({ email: pending?.email });
    if (pending && !doctor) {
      doctor = await createDoctorFromPending(pending, orderId, data.order_amount);
    }

    let paymentDetails = {};
    try {
      const { data: payments } = await axios.get(`${CF_BASE}/orders/${orderId}/payments`, { headers: cfHeaders });
      const p = Array.isArray(payments) ? payments[0] : payments;
      paymentDetails = {
        paymentMode:   p?.payment_method ? Object.keys(p.payment_method)[0] : undefined,
        transactionId: p?.cf_payment_id?.toString() || orderId,
      };
    } catch (_) {}

    return res.json({
      success: true, paid: true, type: 'signup',
      details: {
        amount:   data.order_amount,
        email:    doctor?.email || pending?.email,
        mobile:   doctor?.mobile || pending?.mobile,
        loginUrl: doctor ? `https://docedge.tbskit.cloud/${doctor.slug}/login` : null,
        ...paymentDetails,
      },
    });

  } catch (err) {
    console.error('verifyOrder error:', err?.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── POST /api/subscriptions/renew ─────────────────────────────────────────────
exports.renewSubscription = async (req, res) => {
  try {
    const { planId, interval } = req.body;

    if (!planId || !interval)
      return res.status(400).json({ success: false, message: 'planId and interval are required' });

    const doctorId = req.user?._id || req.user?.id;
    if (!doctorId)
      return res.status(401).json({ success: false, message: 'Unauthorized — please login again' });

    const doctor = await Doctor.findById(doctorId);
    if (!doctor)
      return res.status(404).json({ success: false, message: 'Doctor not found' });

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive)
      return res.status(404).json({ success: false, message: 'Plan not found or inactive' });

    const amount = interval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    if (!amount)
      return res.status(400).json({ success: false, message: `${interval} price is not set for this plan` });

    const orderId = `RNW_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const { data: cfOrder } = await axios.post(
      `${CF_BASE}/orders`,
      {
        order_id:       orderId,
        order_amount:   amount,
        order_currency: 'INR',
        customer_details: {
          customer_id:    doctor.email.replace(/[^a-zA-Z0-9]/g, '_'),
          customer_email: doctor.email,
          customer_phone: doctor.mobile || '9999999999',
          customer_name:  doctor.name,
        },
        order_meta: {
          return_url: `${process.env.FRONTEND_URL}/payment-status?order_id={order_id}&type=renew`,
          notify_url: `${process.env.BACKEND_URL}/api/subscriptions/webhook`,
        },
        order_note: `Renew: ${plan.name} - ${interval} | ${doctor.clinicName}`,
      },
      { headers: cfHeaders }
    );

    await RenewPending.create({
      doctorId: doctor._id,
      planId,
      interval,
      orderId,
      amount,
      status: 'pending',
    });

    res.json({
      success:          true,
      paymentSessionId: cfOrder.payment_session_id,
      orderId,
    });
  } catch (err) {
    console.error('renewSubscription error:', err?.response?.data || err.message);
    res.status(500).json({ success: false, message: err?.response?.data?.message || err.message });
  }
};

// ── GET /api/subscriptions/status/:slug ──────────────────────────────────────
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const { slug } = req.params;

    const doctor = await Doctor.findOne({ slug });
    if (!doctor) return res.status(404).json({ success: false, message: 'Clinic not found' });

    const subscription = await Subscription.findOne({
      clinicId: doctor._id,
      status:   { $in: ['active', 'expired'] },
    }).populate('planId', 'name monthlyPrice yearlyPrice patientLimit durationDays');

    if (!subscription)
      return res.json({ success: true, hasSubscription: false });

    const now       = new Date();
    const expiry    = subscription.expiryDate ? new Date(subscription.expiryDate) : null;
    const isExpired = expiry ? now > expiry : false;
    const daysLeft  = expiry
      ? Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)))
      : null;

    const apptUsed  = subscription.appointmentsUsed || 0;
    const apptLimit = (subscription.patientLimit && subscription.patientLimit > 0)
      ? subscription.patientLimit
      : 0;
    const apptLeft  = apptLimit > 0 ? Math.max(0, apptLimit - apptUsed) : null;

    const expiryWarning = daysLeft !== null && daysLeft <= 7 && !isExpired;
    const limitWarning  = apptLeft !== null && apptLeft <= 10 && apptLeft > 0;
    const limitReached  = apptLimit > 0 && apptUsed >= apptLimit;

    res.json({
      success:         true,
      hasSubscription: true,
      subscription: {
        id:               subscription._id,
        status:           isExpired ? 'expired' : subscription.status,
        plan:             subscription.planId,
        interval:         subscription.interval,
        expiryDate:       expiry,
        daysLeft,
        isExpired,
        appointmentsUsed: apptUsed,
        appointmentLimit: apptLimit,
        appointmentsLeft: apptLeft,
        paidAmount:       subscription.paidAmount,
        totalPaid:        subscription.totalPaid,
        renewalCount:     subscription.renewalOrders?.length || 0,
      },
      warnings: {
        expiryWarning,
        limitWarning,
        limitReached,
        isExpired,
      },
    });

  } catch (err) {
    console.error('getSubscriptionStatus error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET /api/subscriptions/clinic/:clinicId (admin) ──────────────────────────
exports.getClinicSubscription = async (req, res) => {
  try {
    const sub = await Subscription.findOne({
      clinicId: req.params.clinicId,
      status:   { $in: ['active', 'created'] },
    }).populate('planId');
    res.json({ success: true, subscription: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/subscriptions/all (superadmin) ───────────────────────────────────
exports.getAllSubscriptions = async (req, res) => {
  try {
    const subs = await Subscription.find()
      .populate('clinicId', 'name clinicName email mobile')
      .populate('planId',   'name monthlyPrice yearlyPrice')
      .sort('-createdAt');
    res.json({ success: true, subscriptions: subs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/////////////////////////////
exports.getMySubscriptions = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Email se Doctor dhundo (AuthUser aur Doctor alag models hain)
    const doctor = await Doctor.findOne({ email: authUser.email }).select('_id');
    if (!doctor)
      return res.status(404).json({ success: false, message: 'Doctor not found' });

    const doctorId = doctor._id;

    const sub = await Subscription.findOne({ clinicId: doctorId })
      .populate('planId', 'name monthlyPrice yearlyPrice patientLimit durationDays')
      .populate('renewalOrders.planId', 'name');

    if (!sub)
      return res.json({ success: true, hasSubscription: false, current: null, history: [] });

    const now       = new Date();
    const expiry    = sub.expiryDate ? new Date(sub.expiryDate) : null;
    const isExpired = expiry ? now > expiry : false;
    const daysLeft  = expiry
      ? Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)))
      : null;

    const history = (sub.renewalOrders || [])
      .slice()
      .reverse()
      .map((r) => ({
        orderId:  r.orderId,
        planName: r.planId?.name || 'Plan',
        interval: r.interval,
        amount:   r.amount,
        paidAt:   r.paidAt,
      }));

    res.json({
      success: true,
      hasSubscription: true,
      current: {
        planName:         sub.planId?.name || '—',
        interval:         sub.interval,
        status:           isExpired ? 'expired' : sub.status,
        expiryDate:       expiry,
        daysLeft,
        isExpired,
        paidAmount:       sub.paidAmount,
        totalPaid:        sub.totalPaid,
        appointmentsUsed: sub.appointmentsUsed || 0,
        appointmentLimit: sub.patientLimit || 0,
      },
      history,
    });

  } catch (err) {
    console.error('getMySubscriptions error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};