const mongoose = require('mongoose');

// Har renewal attempt ke liye ek record — webhook ya verifyOrder dono mein kaam aata hai
const RenewPendingSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  planId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Plan',   required: true },
  interval: { type: String, enum: ['monthly', 'yearly'], required: true },
  orderId:  { type: String, required: true, unique: true },
  amount:   { type: Number, required: true },
  status:   { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('RenewPending', RenewPendingSchema);