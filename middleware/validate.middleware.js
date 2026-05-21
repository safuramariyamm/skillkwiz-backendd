const { body, query, param, validationResult } = require("express-validator");

// ─── Middleware to handle validation results ──────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─── Auth Validators ──────────────────────────────────────────────────────────
const registerValidator = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 100 }).withMessage("Name must be 2-100 characters"),
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least one number"),
  body("role")
    .optional()
    .isIn(["employee", "employer"]).withMessage("Role must be employee or employer"),
  validate,
];

const loginValidator = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email"),
  body("password")
    .notEmpty().withMessage("Password is required"),
  validate,
];

// ─── Employee Registration Validators ────────────────────────────────────────
const employeeRegisterValidator = [
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("phone")
    .trim()
    .notEmpty().withMessage("Phone number is required")
    .isLength({ min: 10 }).withMessage("Please enter a valid phone number"),
  validate,
];

// ─── Employer Registration Validators ────────────────────────────────────────
const employerRegisterValidator = [
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("phone")
    .trim()
    .notEmpty().withMessage("Phone number is required")
    .isLength({ min: 10 }).withMessage("Please enter a valid phone number"),
  body("company").trim().notEmpty().withMessage("Company name is required"),
  body("department")
    .notEmpty().withMessage("Department is required")
    .isIn(["engineering", "product", "design", "marketing", "sales", "hr", "finance", "operations", "other"])
    .withMessage("Invalid department"),
  body("authorized")
    .notEmpty().withMessage("Authorization status is required")
    .isIn(["yes", "no"]).withMessage("Authorization must be yes or no"),
  validate,
];

// ─── Assessment Request Validators ───────────────────────────────────────────
const assessmentRequestValidator = [
  body("candidateFirstName").trim().notEmpty().withMessage("Candidate first name is required"),
  body("candidateLastName").trim().notEmpty().withMessage("Candidate last name is required"),
  body("candidateEmail").trim().isEmail().withMessage("Valid candidate email is required"),
  body("skills")
    .isArray({ min: 1 }).withMessage("At least one skill is required"),
  validate,
];

// ─── Assessment Schedule Validators ──────────────────────────────────────────
const scheduleAssessmentValidator = [
  body("company")
    .notEmpty().withMessage("Company is required")
    .isIn(["microsoft", "google", "amazon", "meta", "infosys", "other"])
    .withMessage("Invalid company"),
  body("scheduledDate").notEmpty().withMessage("Scheduled date is required").isISO8601(),
  body("scheduledTime").notEmpty().withMessage("Scheduled time is required"),
  body("centre").notEmpty().withMessage("Assessment centre is required"),
  body("zipCode").notEmpty().withMessage("Zip code is required"),
  validate,
];

// ─── Contact Form Validators ──────────────────────────────────────────────────
const contactValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("message")
    .trim()
    .notEmpty().withMessage("Message is required")
    .isLength({ min: 10 }).withMessage("Message must be at least 10 characters")
    .isLength({ max: 2000 }).withMessage("Message cannot exceed 2000 characters"),
  body("inquiryType")
    .optional()
    .isIn(["general", "sales", "support", "partnership"]),
  validate,
];

// ─── OTP Validators ──────────────────────────────────────────────────────────
const sendOtpValidator = [
  body("identifier").trim().notEmpty().withMessage("Email or phone is required"),
  body("type").isIn(["email", "phone"]).withMessage("Type must be email or phone"),
  validate,
];

const verifyOtpValidator = [
  body("identifier").trim().notEmpty().withMessage("Email or phone is required"),
  body("type").isIn(["email", "phone"]).withMessage("Type must be email or phone"),
  body("otp").trim().notEmpty().withMessage("OTP is required").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
  validate,
];

// ─── Blog Validators ──────────────────────────────────────────────────────────
const blogValidator = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("excerpt").trim().notEmpty().withMessage("Excerpt is required"),
  body("content").trim().notEmpty().withMessage("Content is required"),
  body("category")
    .notEmpty().withMessage("Category is required")
    .isIn(["skill-assessment", "recruitment", "career", "technology", "industry-news", "tips", "company-news"]),
  validate,
];

module.exports = {
  validate,
  registerValidator,
  loginValidator,
  employeeRegisterValidator,
  employerRegisterValidator,
  assessmentRequestValidator,
  scheduleAssessmentValidator,
  contactValidator,
  sendOtpValidator,
  verifyOtpValidator,
  blogValidator,
};
