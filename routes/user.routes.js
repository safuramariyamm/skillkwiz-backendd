const express = require("express");
const router = express.Router();
const User = require("../models/User.model");
const { protect, authorize } = require("../middleware/auth.middleware");

// GET /api/users - Admin: list all users
router.get("/", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const query = {};
    if (role) query.role = role;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    res.json({ success: true, data: { users, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id - Admin: get user by ID
router.get("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: { user: user.toPublicJSON() } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/deactivate - Admin: deactivate user
router.patch("/:id/deactivate", protect, authorize("admin"), async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deactivated" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
