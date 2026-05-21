const mongoose = require("mongoose");

// ─── Assessment Schedule (by candidate) ───────────────────────────────────────
const assessmentSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    company: {
      type: String,
      required: [true, "Company is required"],
      enum: ["microsoft", "google", "amazon", "meta", "infosys", "other"],
    },
    skills: [
      {
        type: String,
        required: true,
      },
    ],
    scheduledDate: {
      type: Date,
      required: [true, "Scheduled date is required"],
    },
    scheduledTime: {
      type: String,
      required: [true, "Scheduled time is required"],
    },
    centre: {
      type: String,
      required: [true, "Assessment centre is required"],
    },
    country: {
      type: String,
      default: "India",
    },
    zipCode: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "no_show"],
      default: "scheduled",
    },
    score: {
      type: Number,
      default: null,
    },
    percentile: {
      type: Number,
      default: null,
    },
    report: {
      type: String,
      default: null,
    },
    confirmationSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

assessmentSchema.index({ candidate: 1, status: 1 });
assessmentSchema.index({ scheduledDate: 1 });

// ─── Assessment Request (by employer for a candidate) ─────────────────────────
const assessmentRequestSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
    },
    candidateFirstName: {
      type: String,
      required: [true, "Candidate first name is required"],
    },
    candidateLastName: {
      type: String,
      required: [true, "Candidate last name is required"],
    },
    candidateEmail: {
      type: String,
      required: [true, "Candidate email is required"],
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email"],
    },
    skills: [
      {
        type: String,
        required: true,
      },
    ],
    resumePath: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "accepted", "completed", "rejected"],
      default: "pending",
    },
    notes: {
      type: String,
      default: "",
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

assessmentRequestSchema.index({ employer: 1, status: 1 });
assessmentRequestSchema.index({ candidateEmail: 1 });

const Assessment = mongoose.model("Assessment", assessmentSchema);
const AssessmentRequest = mongoose.model("AssessmentRequest", assessmentRequestSchema);

module.exports = { Assessment, AssessmentRequest };
