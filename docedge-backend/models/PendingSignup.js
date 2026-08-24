const mongoose = require('mongoose');

const PendingSignupSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  clinicName:   { type: String, required: true },
  email:        { type: String, required: true },
  password:     { type: String, required: true },
  plainPassword:{ type: String },
  mobile:       { type: String },
  address:      { type: String },
  planId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  interval:     { type: String, enum: ['monthly', 'yearly'], required: true },

  // ── Doctor Professional Profile ──────────────────────────────────────────
  professionalProfile: {
  degrees:        [{ type: String }],
  specialization: { type: String },
  registrationNo: { type: String },
  experience:     { type: Number },
  education: [
    {
      degree:      { type: String },
      institution: { type: String },
      year:        { type: String },
    }
  ],
  languages:      [{ type: String }],
  about:          { type: String },
},

  selectedTemplate: {
    type: {
      type: String,
      enum: ['preset', 'custom'],
    },
    templateId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
    imageUrl:           { type: String },
    cloudinaryPublicId: { type: String },
  },

  razorpaySubscriptionId: { type: String, required: true, unique: true },

  status: {
    type: String,
    enum: ['pending', 'completed', 'expired'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model('PendingSignup', PendingSignupSchema);