const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  clinicName: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  specialization: { type: String },
  profilePic: { type: String, default: "" },

  settings: {
    darkMode: { type: Boolean, default: false },
    language: { type: String, default: "en" },
    notifications: {
      emailAlerts: { type: Boolean, default: true },
      appointmentReminders: { type: Boolean, default: true }
    }
  },

  address: String,
  mobile: String,

  // ── Doctor Professional Profile ──────────────────────────────────────────
  professionalProfile: {
  degrees:         [{ type: String }],   // e.g. ["MBBS", "MD"]
  specialization:  { type: String },
  registrationNo:  { type: String },
  experience:      { type: Number },
  education: [
    {
      degree:      { type: String },
      institution: { type: String },
      year:        { type: String },
    }
  ],
  languages:       [{ type: String }],
  about:           { type: String },
},

  subscriptionStatus: { type: String, enum: ['active', 'inactive'], default: 'inactive' },

  selectedTemplate: {
    type: {
      type: String,
      enum: ['preset', 'custom'],
      default: undefined,
    },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', default: undefined },
    imageUrl: { type: String, default: undefined },
    cloudinaryPublicId: { type: String, default: undefined },
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Doctor', doctorSchema);