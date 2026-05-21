const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const companyCredentialSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true },
  companyCode: { type: String, required: true },
  candidateName: { type: String, required: true, trim: true },
  candidateEmail: { type: String, required: true, trim: true, lowercase: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  plainPassword: { type: String, select: false }, // stored temporarily for email
  status: { type: String, enum: ["invited", "registered", "booked", "assessed"], default: "invited" },
  isUsed: { type: Boolean, default: false },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", default: null },
}, { timestamps: true });

companyCredentialSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

companyCredentialSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("CompanyCredential", companyCredentialSchema);
