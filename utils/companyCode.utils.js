const Employer = require("../models/Employer.model");

// Generates unique code like TCS-X7K2
const generateCompanyCode = async (companyName) => {
  const prefix = companyName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 4)
    .padEnd(2, "X");

  let code, exists;
  do {
    const suffix = Math.random().toString(36).substring(2, 9).toUpperCase();
    code = `${prefix}-${suffix}`;
    exists = await Employer.findOne({ companyCode: code });
  } while (exists);

  return code;
};

// Generates username like TCS-001, TCS-002
const generateUsername = async (companyCode, CompanyCredential) => {
  const prefix = companyCode.split("-")[0];
  const count = await CompanyCredential.countDocuments({ companyCode });
  const num = String(count + 1).padStart(3, "0");
  return `${prefix}-${num}`;
};

// Generates random secure password like Abc@4821
const generatePassword = () => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "@#$!";
  return (
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    special[Math.floor(Math.random() * special.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    upper[Math.floor(Math.random() * upper.length)]
  );
};

module.exports = { generateCompanyCode, generateUsername, generatePassword };
