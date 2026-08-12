// models/NotificationPlan.js
const mongoose = require('mongoose');

const NotificationPlanSchema = new mongoose.Schema({
  name:        { type: String, required: true },   // e.g. "WhatsApp Starter"
  description: { type: String },

  // Monthly message limits per channel
  whatsappLimit: { type: Number, default: 0 },
  emailLimit:    { type: Number, default: 0 },
  smsLimit:      { type: Number, default: 0 },

  // Pricing
  monthlyPrice: { type: Number, default: null },
  yearlyPrice:  { type: Number, default: null },

  // Display options
  isActive:     { type: Boolean, default: true },
  isFeatured:   { type: Boolean, default: false },
  badge:        { type: String,  default: null },   // e.g. "Most Popular"
  displayOrder: { type: Number,  default: 0 },

}, { timestamps: true });

module.exports = mongoose.model('NotificationPlan', NotificationPlanSchema);