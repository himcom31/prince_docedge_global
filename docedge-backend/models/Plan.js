const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  features: [String],

  monthlyPrice: {
    type: Number,
    default: null
  },
  yearlyPrice: {
    type: Number,
    default: null
  },

  patientLimit: { type: Number, default: 0 },  // 0 = unlimited
  durationDays: { type: Number, default: 30 },      // plan ki duration

  razorpayMonthlyPlanId: { type: String, default: null },
  razorpayYearlyPlanId: { type: String, default: null },

  doctorLimit: { type: Number, default: 1 },
  // patientLimit: { type: Number, default: null },

  isActive: { type: Boolean, default: true },

  // ── UI/Display control fields (Option B) ──
  isFeatured: { type: Boolean, default: false },   // "Most Popular" wala card
  badge: { type: String, default: null },      // e.g. "Most Popular", "Best Value"
  ctaLabel: { type: String, default: 'Start Free Trial' },
  isCustomPricing: { type: Boolean, default: false }, // Enterprise jaisa "Custom" dikhana ho to
  displayOrder: { type: Number, default: 0 },          // frontend pe sort karne ke liye

}, { timestamps: true });

module.exports = mongoose.model('Plan', PlanSchema);