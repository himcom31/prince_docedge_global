const mongoose = require('mongoose');

const PendingSignupSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  clinicName:   { type: String, required: true },
  email:        { type: String, required: true },
  password:     { type: String, required: true }, // hashed
  plainPassword:{ type: String },                 // sirf welcome email ke liye, baad mein null
  mobile:       { type: String },
  address:      { type: String },
  planId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  interval:     { type: String, enum: ['monthly', 'yearly'], required: true },

  // Cashfree orderId yahan store hota hai
  razorpaySubscriptionId: { type: String, required: true, unique: true },

  status: {
    type: String,
    enum: ['pending', 'completed', 'expired'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model('PendingSignup', PendingSignupSchema);