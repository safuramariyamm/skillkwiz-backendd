const mongoose = require("mongoose");

const assessmentSlotSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true },
  companyCode: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  center: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  skills: [{ type: String }],
  capacity: { type: Number, required: true, min: 1, max: 500 },
  bookedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  bookedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "CompanyCredential" }],
}, { timestamps: true });

assessmentSlotSchema.virtual("availableSeats").get(function () {
  return this.capacity - this.bookedCount;
});

assessmentSlotSchema.virtual("isFull").get(function () {
  return this.bookedCount >= this.capacity;
});

// Compound index for the most common query: companyCode + isActive + date + time
assessmentSlotSchema.index({ companyCode: 1, isActive: 1, date: 1, time: 1 });
assessmentSlotSchema.index({ companyCode: 1, isActive: 1 });

module.exports = mongoose.model("AssessmentSlot", assessmentSlotSchema);
