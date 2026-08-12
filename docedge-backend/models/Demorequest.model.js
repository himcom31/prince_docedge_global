const mongoose = require("mongoose");

const demoRequestSchema = new mongoose.Schema(
  {
    full_name:      { type: String, required: true, trim: true },
    clinic_name:    { type: String, required: true, trim: true },
    mobile:         { type: String, required: true, trim: true },
    city:           { type: String, required: true, trim: true },
    specialization: { type: String, required: true },
    email:          { type: String, trim: true, lowercase: true, default: null }, // ← NEW
    preferred_time: {
      type: String,
      enum: ["Morning (9 AM - 12 PM)", "Afternoon (12 PM - 4 PM)", "Evening (4 PM - 7 PM)"],
      default: "Morning (9 AM - 12 PM)",
    },

    // tracking
    status: {
      type: String,
      enum: ["new", "contacted", "demo_scheduled", "converted", "not_interested"],
      default: "new",
    },
    notes:       { type: String, default: "" },
    source:      { type: String, default: "website" },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

demoRequestSchema.index({ status: 1, createdAt: -1 });
demoRequestSchema.index({ mobile: 1 });

module.exports = mongoose.model("DemoRequest", demoRequestSchema);