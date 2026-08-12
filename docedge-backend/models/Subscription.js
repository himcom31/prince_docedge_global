const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true,
  },
  interval: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true,
  },

  expiryDate:       { type: Date },
  appointmentsUsed: { type: Number, default: 0 },
  patientLimit:     { type: Number, default: 0 },

  // Pehla signup order — unique rehta hai
  cashfreeOrderId: { type: String, required: true, unique: true },

  // Har renewal yahan push hoti hai
  renewalOrders: [
    {
      orderId:  { type: String },
      planId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
      interval: { type: String, enum: ['monthly', 'yearly'] },
      amount:   { type: Number },
      paidAt:   { type: Date, default: Date.now },
    },
  ],

  status: {
    type: String,
    enum: ['created', 'authenticated', 'active', 'paused', 'halted', 'cancelled', 'expired'],
    default: 'created',
  },

  currentPeriodStart: { type: Date },
  currentPeriodEnd:   { type: Date },
  paidAmount:         { type: Number },   // last payment amount
  totalPaid:          { type: Number, default: 0 }, // cumulative total

}, { timestamps: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);