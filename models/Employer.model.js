const mongoose = require("mongoose");

const employerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    companyCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
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
    },
    company: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      enum: [
        "engineering",
        "product",
        "design",
        "marketing",
        "sales",
        "hr",
        "finance",
        "operations",
        "other",
      ],
    },
    authorized: {
      type: String,
      enum: ["yes", "no"],
      required: [true, "Authorization status is required"],
    },
    authorizationDetails: {
      type: String,
      default: "",
    },
    assessmentRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AssessmentRequest",
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    logo: {
      type: String,
      default: null,
    },
    website: {
      type: String,
      default: null,
    },
    industry: {
      type: String,
      default: null,
    },

    // ─── Payment & Credits ────────────────────────────────────────────────────
    credits: {
      type: Number,
      default: 0,
      min: 0,
    },
    activePlan: {
      type: String,
      enum: ["free", "starter", "growth", "enterprise", "custom"],
      default: "free",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "expired"],
      default: "inactive",
    },
    subscriptionExpiry: {
      type: Date,
      default: null,
    },
    totalCreditsPurchased: {
      type: Number,
      default: 0,
    },
    creditsUsed: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

employerSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

employerSchema.index({ company: 1 });
employerSchema.index({ department: 1 });

module.exports = mongoose.model("Employer", employerSchema);
