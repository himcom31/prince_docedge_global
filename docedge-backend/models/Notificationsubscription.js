// models/NotificationSubscription.js
const mongoose = require('mongoose');

const NotificationSubscriptionSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  planId:   { type: mongoose.Schema.Types.ObjectId, ref: 'NotificationPlan', required: true },

  interval:        { type: String, enum: ['monthly', 'yearly'], required: true },
  status:          { type: String, enum: ['active', 'expired', 'cancelled'], default: 'cancelled' },
  cashfreeOrderId: { type: String, required: true },
  paidAmount:      { type: Number },
  expiryDate:      { type: Date },

  // Monthly usage — resets every month per channel
  usage: {
    whatsapp: {
      used:      { type: Number, default: 0 },
      resetDate: { type: Date },
    },
    email: {
      used:      { type: Number, default: 0 },
      resetDate: { type: Date },
    },
    sms: {
      used:      { type: Number, default: 0 },
      resetDate: { type: Date },
    },
  },

}, { timestamps: true });

module.exports = mongoose.model('NotificationSubscription', NotificationSubscriptionSchema);