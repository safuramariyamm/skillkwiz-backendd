const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^\+?[\d\s\-()]{10,15}$/, "Please enter a valid phone number"],
    },
    resume: {
      filename: String,
      originalName: String,
      path: String,
      mimetype: String,
      size: Number,
      uploadedAt: { type: Date, default: Date.now },
    },
    skills: [
      {
        name: { type: String, required: true },
        level: {
          type: String,
          enum: ["beginner", "intermediate", "advanced", "expert"],
          default: "intermediate",
        },
        verified: { type: Boolean, default: false },
      },
    ],
    location: {
      city: String,
      state: String,
      country: { type: String, default: "India" },
      zipCode: String,
    },
    jobFamily: {
      type: String,
      enum: ["software", "data", "design", "marketing", "finance", "operations", "other"],
      default: "software",
    },
    experience: {
      type: Number, // years
      default: 0,
    },
    education: [
      {
        degree: String,
        institution: String,
        year: Number,
        grade: String,
      },
    ],
    assessments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Assessment",
      },
    ],
    percentileScore: {
      type: Number,
      default: null,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: full name
candidateSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes for search/filter
candidateSchema.index({ "location.city": 1 });
candidateSchema.index({ jobFamily: 1 });
candidateSchema.index({ gender: 1 });
candidateSchema.index({ percentileScore: -1 });
candidateSchema.index({ "skills.name": 1 });

module.exports = mongoose.model("Candidate", candidateSchema);
