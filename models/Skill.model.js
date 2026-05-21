const mongoose = require("mongoose");

// ─── Skill Catalog ─────────────────────────────────────────────────────────────
const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Skill name is required"],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "programming",
        "database",
        "cloud",
        "design",
        "soft-skills",
        "data-science",
        "devops",
        "mobile",
        "other",
      ],
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

skillSchema.index({ name: 1 });
skillSchema.index({ category: 1 });

// ─── OTP ─────────────────────────────────────────────────────────────────────
const otpSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true, // email or phone
    },
    type: {
      type: String,
      enum: ["email", "phone"],
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["registration", "login", "password-reset"],
      default: "registration",
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
    verified: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
      max: [5, "Max OTP attempts exceeded"],
    },
  },
  { timestamps: true }
);

// Auto-remove expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ identifier: 1, type: 1 });

const Skill = mongoose.model("Skill", skillSchema);
const OTP = mongoose.model("OTP", otpSchema);

module.exports = { Skill, OTP };
