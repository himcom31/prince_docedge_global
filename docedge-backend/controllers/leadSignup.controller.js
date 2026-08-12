const bcrypt        = require('bcryptjs');
const axios         = require('axios');
const Plan          = require('../models/Plan');
const Doctor        = require('../models/Doctor');
const PendingSignup = require('../models/PendingSignup');

const CF_BASE = process.env.CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const cfHeaders = {
  'x-client-id':     process.env.CASHFREE_APP_ID,
  'x-client-secret': process.env.CASHFREE_SECRET_KEY,
  'x-api-version':   '2023-08-01',
  'Content-Type':    'application/json',
};

// ── POST /api/lead/signup ──────────────────────────────────────────────────────
exports.createLeadAndSubscription = async (req, res) => {
  try {
    const {
      name, clinicName, email, password, mobile, address,
      planId, interval,
    } = req.body;

    if (!name || !clinicName || !email || !password || !planId || !interval)
      return res.status(400).json({ message: 'Saari required fields bharein' });

    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor)
      return res.status(400).json({ message: 'Is email se pehle se account hai. Login karein.' });

    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    const amount = interval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    if (!amount)
      return res.status(400).json({ message: `${interval} price is plan mein nahi hai` });

    const hashedPassword = await bcrypt.hash(password, 10);

    await PendingSignup.deleteMany({ email, status: 'pending' });

    const orderId = `DOC_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const { data: cfOrder } = await axios.post(
      `${CF_BASE}/orders`,
      {
        order_id:       orderId,
        order_amount:   amount,
        order_currency: 'INR',
        customer_details: {
          customer_id:    email.replace(/[^a-zA-Z0-9]/g, '_'),
          customer_email: email,
          customer_phone: mobile || '9999999999',
          customer_name:  name,
        },
        order_meta: {
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/payment-status?order_id={order_id}`,
          notify_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/subscriptions/webhook`,
        },
        order_note: `${plan.name} - ${interval} | ${clinicName}`,
      },
      { headers: cfHeaders }
    );

    await PendingSignup.create({
      name,
      clinicName,
      email,
      password:      hashedPassword,
      plainPassword: password,        // ← plain text — sirf mail ke liye
      mobile,
      address,
      planId,
      interval,
      razorpaySubscriptionId: orderId,
      status: 'pending',
    });

    res.status(201).json({
      success:          true,
      paymentSessionId: cfOrder.payment_session_id,
      orderId,
    });
  } catch (err) {
    console.error('Lead signup error:', err?.response?.data || err.message);
    res.status(500).json({ message: 'Signup failed', error: err?.response?.data?.message || err.message });
  }
};