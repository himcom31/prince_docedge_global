const DemoRequest = require("../models/Demorequest.model");
const { sendDemoConfirmationEmail } = require("../utils//demourlMail");
const axios = require("axios"); // ← NEW

/* ─────────────────────────────────────────────────────────────
   PUBLIC  —  Form submit (from landing page)
───────────────────────────────────────────────────────────── */

// POST /api/demo-requests
exports.submitDemoRequest = async (req, res) => {
  try {
    const {
      full_name, clinic_name, mobile, city,
      specialization, preferred_time, email,
      recaptchaToken,  // ← NEW
    } = req.body;

    // ── reCAPTCHA verify karo ── ← NEW BLOCK START
    if (!recaptchaToken) {
      return res.status(400).json({ success: false, message: "reCAPTCHA token missing." });
    }

    const verifyRes = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: recaptchaToken,
        },
      }
    );

    const { success, score, action } = verifyRes.data;
    console.log(`[reCAPTCHA] success: ${success} | score: ${score} | action: ${action}`);

    if (!success || score < 0.5) {
      return res.status(400).json({
        success: false,
        message: "Bot activity detect hui. Dobara try karo.",
      });
    }
    // ── reCAPTCHA verify end ──

    if (!full_name || !clinic_name || !mobile || !city || !specialization) {
      return res.status(400).json({ success: false, message: "Please fill in all the required fields." });
    }

    // prevent duplicate (same mobile, last 24 hrs)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await DemoRequest.findOne({ mobile, createdAt: { $gte: since } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A request has already been submitted using this number. We will contact you within 2 hours.",
      });
    }

    const resolvedTime = preferred_time || "Morning (9 AM - 12 PM)";

    const demo = await DemoRequest.create({
      full_name,
      clinic_name,
      mobile,
      city,
      specialization,
      email: email || null,
      preferred_time: resolvedTime,
    });

    // ── Email send karo agar email diya ho ──
    if (email) {
      try {
        await sendDemoConfirmationEmail({
          full_name,
          clinic_name,
          specialization,
          preferred_time: resolvedTime,
          email,
        });
      } catch (mailErr) {
        console.error("[DemoRequest] Email send failed:", mailErr.message);
        // response fail nahi hoga — sirf log
      }
    }

    return res.status(201).json({
      success: true,
      message: "Your demo request has been submitted! We will contact you on WhatsApp within 2 business hours.",
      data: { id: demo._id },
    });
  } catch (err) {
    console.error("[DemoRequest] submitDemoRequest error:", err);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
};

/* ─────────────────────────────────────────────────────────────
   ADMIN  —  List, View, Update Status, Delete
───────────────────────────────────────────────────────────── */

// GET /api/admin/demo-requests
exports.getAllDemoRequests = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const rx = new RegExp(search, "i");
      filter.$or = [
        { full_name: rx }, { clinic_name: rx },
        { mobile: rx }, { city: rx }, { email: rx },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      DemoRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      DemoRequest.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: requests,
      pagination: {
        total,
        page:       Number(page),
        limit:      Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("[DemoRequest] getAllDemoRequests error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// GET /api/admin/demo-requests/:id
exports.getDemoRequestById = async (req, res) => {
  try {
    const demo = await DemoRequest.findById(req.params.id);
    if (!demo) return res.status(404).json({ success: false, message: "Request not found." });
    return res.json({ success: true, data: demo });
  } catch (err) {
    console.error("[DemoRequest] getDemoRequestById error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// PATCH /api/admin/demo-requests/:id
exports.updateDemoRequest = async (req, res) => {
  try {
    const allowedFields = ["status", "notes", "source"];
    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const demo = await DemoRequest.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!demo) return res.status(404).json({ success: false, message: "Request not found." });

    return res.json({ success: true, message: "Updated successfully.", data: demo });
  } catch (err) {
    console.error("[DemoRequest] updateDemoRequest error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// DELETE /api/admin/demo-requests/:id
exports.deleteDemoRequest = async (req, res) => {
  try {
    const demo = await DemoRequest.findByIdAndDelete(req.params.id);
    if (!demo) return res.status(404).json({ success: false, message: "Request not found." });
    return res.json({ success: true, message: "Request deleted successfully." });
  } catch (err) {
    console.error("[DemoRequest] deleteDemoRequest error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// GET /api/admin/demo-requests/stats
exports.getDemoStats = async (req, res) => {
  try {
    const stats = await DemoRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result = { total: 0, new: 0, contacted: 0, demo_scheduled: 0, converted: 0, not_interested: 0 };
    stats.forEach(({ _id, count }) => {
      result[_id] = count;
      result.total += count;
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("[DemoRequest] getDemoStats error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};