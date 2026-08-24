const bcrypt        = require('bcryptjs');
const axios          = require('axios');
const { Readable }   = require('stream');
const cloudinary     = require('../config/cloudinary');
const Plan           = require('../models/Plan');
const Doctor         = require('../models/Doctor');
const PendingSignup  = require('../models/PendingSignup');
const Template       = require('../models/template');

const CF_BASE = process.env.CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const cfHeaders = {
  'x-client-id':     process.env.CASHFREE_APP_ID,
  'x-client-secret': process.env.CASHFREE_SECRET_KEY,
  'x-api-version':   '2023-08-01',
  'Content-Type':    'application/json',
};

const uploadCustomTemplateToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'docedge/custom-templates',
        use_filename: true,
        unique_filename: true,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

// ── POST /api/lead/signup ──────────────────────────────────────────────────
exports.createLeadAndSubscription = async (req, res) => {
  try {
    const {
      name, clinicName, email, password, mobile, address,
      planId, interval, templateId,
      // Professional profile fields
      degrees, specialization, registrationNo, experience, about,
      education,   // JSON string: [{ degree, institution, year }]
      languages,   // JSON string: ["Hindi", "English"] OR comma-separated string
    } = req.body;

    if (!name || !clinicName || !email || !password || !planId || !interval)
      return res.status(400).json({ message: 'All required fields must be filled' });

    // ── Parse degrees (sent as a JSON array string from frontend) ──────────
    let parsedDegrees = [];
    if (degrees) {
      try {
        parsedDegrees = JSON.parse(degrees);
      } catch {
        parsedDegrees = String(degrees).split(',').map(d => d.trim()).filter(Boolean);
      }
    }

    // Professional profile required fields
    if (!parsedDegrees.length || !specialization || !registrationNo)
      return res.status(400).json({ message: 'Degree, specialization and registration number are required' });

    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor)
      return res.status(400).json({ message: 'An account with this email already exists. Please log in.' });

    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    const amount = interval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    if (!amount)
      return res.status(400).json({ message: `${interval} price is not set on this plan` });

    // ── Parse remaining professional profile fields ────────────────────────
    let parsedEducation = [];
    try {
      parsedEducation = education ? JSON.parse(education) : [];
    } catch { parsedEducation = []; }

    let parsedLanguages = [];
    if (languages) {
      try {
        parsedLanguages = JSON.parse(languages);
      } catch {
        parsedLanguages = languages.split(',').map(l => l.trim()).filter(Boolean);
      }
    }

    const professionalProfile = {
      degrees:        parsedDegrees,
      specialization: specialization?.trim(),
      registrationNo: registrationNo?.trim(),
      experience:     experience ? Number(experience) : undefined,
      education:      parsedEducation,
      languages:      parsedLanguages,
      about:          about?.trim(),
    };

    // ── Resolve selected template ──────────────────────────────────────────
    let selectedTemplate = null;

    if (templateId) {
      const presetTpl = await Template.findOne({ _id: templateId, isActive: true });
      if (presetTpl) {
        selectedTemplate = { type: 'preset', templateId: presetTpl._id };
      }
    } else if (req.file) {
      const result = await uploadCustomTemplateToCloudinary(req.file.buffer);
      selectedTemplate = {
        type: 'custom',
        imageUrl: result.secure_url,
        cloudinaryPublicId: result.public_id,
      };
    }

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
      plainPassword: password,
      mobile,
      address,
      planId,
      interval,
      professionalProfile,
      selectedTemplate,
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