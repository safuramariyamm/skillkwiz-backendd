const crypto = require("crypto");
const { OTP } = require("../models/Skill.model");

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Save OTP to database
const saveOTP = async (identifier, type, purpose = "registration") => {
  // Delete any existing OTP for this identifier
  await OTP.deleteMany({ identifier, type });

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const otpDoc = await OTP.create({
    identifier,
    type,
    otp,
    purpose,
    expiresAt,
  });

  return otp;
};

// Verify OTP
const verifyOTP = async (identifier, type, otp) => {
  const otpDoc = await OTP.findOne({
    identifier,
    type,
    verified: false,
  }).sort({ createdAt: -1 });

  if (!otpDoc) {
    return { valid: false, message: "OTP not found. Please request a new one." };
  }

  if (otpDoc.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: otpDoc._id });
    return { valid: false, message: "OTP has expired. Please request a new one." };
  }

  if (otpDoc.attempts >= 5) {
    return { valid: false, message: "Maximum OTP attempts exceeded. Please request a new one." };
  }

  if (otpDoc.otp !== otp) {
    await OTP.updateOne({ _id: otpDoc._id }, { $inc: { attempts: 1 } });
    const remaining = 5 - (otpDoc.attempts + 1);
    return { valid: false, message: `Invalid OTP. ${remaining} attempts remaining.` };
  }

  // Mark OTP as verified
  await OTP.updateOne({ _id: otpDoc._id }, { verified: true });

  return { valid: true, message: "OTP verified successfully." };
};

module.exports = { generateOTP, saveOTP, verifyOTP };
