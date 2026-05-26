const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { protect, authorize } = require("../middleware/auth.middleware");
const {
  getPlans,
  createOrder,
  captureOrder,
  initiatePhonePe,
  verifyPhonePe,
  handlePhonePeCallback,
  handleWebhook,
  getHistory,
  getBalance,
} = require("../controllers/payment.controller");

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});

// ─── Public Routes ────────────────────────────────────────────────────────────
router.get("/plans", getPlans);

// ─── PayPal Webhook — raw body BEFORE express.json() parses it ────────────────
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    req.rawBody = req.body.toString("utf8");
    req.body = JSON.parse(req.rawBody);
    next();
  },
  handleWebhook
);

// ─── PhonePe Callback — server-to-server, no auth ────────────────────────────
// PhonePe POSTs here with x-www-form-urlencoded containing "response" field
router.post("/phonepe/callback", handlePhonePeCallback);

// ─── Protected Employer Routes ────────────────────────────────────────────────
router.use(protect, authorize("employer"));

// Balance & History
router.get("/balance", getBalance);
router.get("/history", getHistory);

// PayPal
router.post("/create-order", paymentLimiter, createOrder);
router.post("/capture-order", paymentLimiter, captureOrder);

// PhonePe
router.post("/phonepe/initiate", paymentLimiter, initiatePhonePe);
router.get("/phonepe/verify/:txnId", verifyPhonePe);

module.exports = router;