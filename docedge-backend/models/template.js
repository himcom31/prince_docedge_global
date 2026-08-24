const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      // e.g. "Prescription", "Letterhead", "Invoice", "Discharge Summary"
    },
    imageUrl: {
      type: String,
      required: true, // Cloudinary URL
    },
    cloudinaryPublicId: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Template", templateSchema);