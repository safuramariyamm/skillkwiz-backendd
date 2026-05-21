const mongoose = require("mongoose");

const examBookingSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
    reportUrl: {
      type: String,
      default: null,
    },
    bookingReference: {
      type: String,
      unique: true,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for formatted date
examBookingSchema.virtual("formattedDate").get(function () {
  return this.scheduledDate.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

// Virtual for formatted time
examBookingSchema.virtual("formattedTime").get(function () {
  const [hours, minutes] = this.scheduledTime.split(":");
  const hour12 = parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours);
  const ampm = parseInt(hours) >= 12 ? "PM" : "AM";
  return `${hour12}:${minutes} ${ampm}`;
});

// Indexes for efficient queries
examBookingSchema.index({ employee: 1, status: 1 });
examBookingSchema.index({ user: 1, scheduledDate: -1 });
examBookingSchema.index({ bookingReference: 1 });
examBookingSchema.index({ scheduledDate: 1 });

module.exports = mongoose.model("ExamBooking", examBookingSchema);