const User = require("../models/User.model");
const { sendTokenResponse, verifyRefreshToken, generateAccessToken, generateRefreshToken } = require("../utils/token.utils");
const { sendWelcomeEmail } = require("../utils/email.utils");

// ─── Register ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = "employee" } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const user = await User.create({ name, email, password, role });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, name, role).catch(console.error);

    sendTokenResponse(user, 201, res, "Account created successfully");
  } catch (err) {
    next(err);
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: "Account deactivated. Contact support." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    user.lastLogin = new Date();
    await user.save();

    sendTokenResponse(user, 200, res, "Login successful");
  } catch (err) {
    next(err);
  }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────
// POST /api/auth/refresh-token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: "Refresh token required" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const accessToken = generateAccessToken(user._id);
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }
};

// ─── Get Current User ─────────────────────────────────────────────────────────
// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: { user: user.toPublicJSON() } });
  } catch (err) {
    next(err);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
// POST /api/auth/logout
const logout = async (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
};

// ─── Google OAuth callback ────────────────────────────────────────────────────
// GET /api/auth/google/callback
const googleCallback = async (req, res, next) => {
  try {
    const accessToken = generateAccessToken(req.user._id);
    const refreshToken = generateRefreshToken(req.user._id);

    // Redirect to frontend with tokens in URL
    res.redirect(
      `${process.env.CLIENT_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`
    );
  } catch (err) {
    next(err);
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────
// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    if (newPassword.length < 8) {
      return res.status(422).json({ success: false, message: "New password must be at least 8 characters" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refreshToken, getMe, logout, googleCallback, changePassword };
