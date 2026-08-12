// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    clinicName: {
      type: String,
      required: [true, "Clinic name is required"],
      trim: true,
    },
    doctorName: {
      type: String,
      required: [true, "Doctor name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    specialization: {
      type: String,
      trim: true,
      default: "",
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "doctor", "staff"],
      default: "admin",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
  type: String,
  default: undefined,
},
passwordResetExpiry: {
  type: Date,
  default: undefined,
},
  },
  { timestamps: true }
);

// ── Auto-generate slug from clinicName before save ──────────────────────────
userSchema.pre("save", async function () {
  // Hash password only if modified
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Generate slug from clinicName only on create
  if (this.isNew && !this.slug) {
    const base = this.clinicName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    // Ensure slug uniqueness
    let slug = base;
    let count = 1;
    while (await mongoose.models.User.findOne({ slug })) {
      slug = `${base}-${count++}`;
    }
    this.slug = slug;
  }

  
});

// ── Compare plain password with hashed ──────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Remove sensitive fields from JSON output ────────────────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);