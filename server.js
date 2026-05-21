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

const app = express();

// Trust Railway's proxy — fixes X-Forwarded-For rate limit warning
// and ensures correct IP detection behind Railway's load balancer
app.set("trust proxy", 1);

connectDB();

// ─── CORS — must come before helmet and all routes ───────────────────────────
const corsOptions = {
  origin: (origin, callback) => {
    // Allow no-origin requests (Postman, mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    const allowed = [
      "http://localhost:3000",
      "http://localhost:3001",
    ];

    // Add any explicitly configured URLs from env
    if (process.env.CLIENT_URL) allowed.push(process.env.CLIENT_URL);
    if (process.env.CLIENT_URL_PROD) allowed.push(process.env.CLIENT_URL_PROD);

    // Allow ALL vercel.app and railway.app subdomains (covers preview + production)
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

// Handle ALL preflight requests first
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
  keyGenerator: (req) => {
    // Use X-Forwarded-For if behind a proxy, otherwise use IP
    return req.headers['x-forwarded-for'] || req.ip;
  },
});

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// ─── Static files ─────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Root + Health ────────────────────────────────────────────────────────────
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
      "/api/blogs", "/api/contact", "/api/skills",
    ],
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
// Auth limiter disabled for development testing - re-enable in production
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

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err.message);
  server.close(() => process.exit(1));
});

module.exports = app;
