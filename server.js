const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const candidateRoutes = require("./routes/candidate.routes");
const employerRoutes = require("./routes/employer.routes");
const assessmentRoutes = require("./routes/assessment.routes");
const skillRoutes = require("./routes/skill.routes");
const blogRoutes = require("./routes/blog.routes");
const uploadRoutes = require("./routes/upload.routes");
const contactRoutes = require("./routes/contact.routes");
const otpRoutes = require("./routes/otp.routes");
const examBookingRoutes = require("./routes/examBooking.routes");
const paymentRoutes = require("./routes/payment.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

// Trust Railway's proxy
app.set("trust proxy", 1);

connectDB();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = [
      "http://localhost:3000",
      "http://localhost:3001",
    ];
    if (process.env.CLIENT_URL) allowed.push(process.env.CLIENT_URL);
    if (process.env.CLIENT_URL_PROD) allowed.push(process.env.CLIENT_URL_PROD);
    if (
      allowed.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      /\.railway\.app$/.test(origin) ||
      /\.up\.railway\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked: ${origin}`);
    callback(new Error(`CORS: ${origin} not allowed`), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200,
};

app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  message: { success: false, message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
app.use("/api/", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: "Too many auth attempts. Please try again later." },
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.headers["x-forwarded-for"] || req.ip,
});

// ─── Body parsers — MUST come before all routes ───────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// ─── Static files ─────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Root + Health ────────────────────────────────────────────────────────────

// TEMPORARY — add this to server.js to debug Railway env vars
// DELETE after confirming vars are loaded



app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SkillKwiz API is running",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SkillKwiz API is healthy",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SkillKwiz API v1",
    endpoints: [
      "/api/auth", "/api/users", "/api/candidates",
      "/api/employers", "/api/assessments", "/api/otp",
      "/api/blogs", "/api/contact", "/api/skills", "/api/payments",
    ],
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/employers", employerRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/exam-bookings", examBookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 SkillKwiz API running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`📋 Health: http://localhost:${PORT}/health\n`);
});

app.get("/api/debug-paypal", (req, res) => {
  res.json({
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID ? "SET ✅" : "MISSING ❌",
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET ? "SET ✅" : "MISSING ❌",
    PAYPAL_BASE_URL: process.env.PAYPAL_BASE_URL || "not set",
    PAYPAL_ENV: process.env.PAYPAL_ENV || "not set",
    FRONTEND_URL: process.env.FRONTEND_URL || "not set",
    NODE_ENV: process.env.NODE_ENV,
  });
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err.message);
  server.close(() => process.exit(1));
});

module.exports = app;