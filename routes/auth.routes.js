const express = require("express");
const router = express.Router();
const passport = require("passport");

require("../config/passport");

const { register, login, refreshToken, getMe, logout, googleCallback, changePassword } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const { registerValidator, loginValidator } = require("../middleware/validate.middleware");
const { employeeLogin, companyEmployeeGetMyStatus } = require("../controllers/credential.controller");

// POST /api/auth/register
router.post("/register", registerValidator, register);

// POST /api/auth/login
router.post("/login", loginValidator, login);

// POST /api/auth/employee-login (company employee — uses companyCode + username + password)
router.post("/employee-login", employeeLogin);

// POST /api/auth/refresh
router.post("/refresh", refreshToken);

// GET /api/auth/me
router.get("/me", protect, getMe);

// POST /api/auth/logout
router.post("/logout", protect, logout);

// POST /api/auth/change-password
router.post("/change-password", protect, changePassword);

// GET /api/auth/company-employee/me
router.get("/company-employee/me", protect, companyEmployeeGetMyStatus);

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.CLIENT_URL}/services?error=google_failed`, session: false }),
  googleCallback
);

module.exports = router;
