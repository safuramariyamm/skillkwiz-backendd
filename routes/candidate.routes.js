const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { uploadResume } = require("../middleware/upload.middleware");
const { employeeRegisterValidator } = require("../middleware/validate.middleware");
const {
  registerCandidate,
  getMyProfile,
  updateMyProfile,
  getCandidates,
  getCandidateById,
} = require("../controllers/candidate.controller");

// GET /api/candidates - Search candidates (employer/admin only)
router.get("/", protect, authorize("employer", "admin"), getCandidates);

// GET /api/candidates/me - Get my profile (employee only)
router.get("/me", protect, authorize("employee"), getMyProfile);

// POST /api/candidates/register - Register candidate profile with resume
router.post(
  "/register",
  protect,
  authorize("employee"),
  uploadResume.single("resume"),
  employeeRegisterValidator,
  registerCandidate
);

// PUT /api/candidates/me - Update my profile
router.put(
  "/me",
  protect,
  authorize("employee"),
  uploadResume.single("resume"),
  updateMyProfile
);

// GET /api/candidates/:id - Get candidate by ID (employer/admin)
router.get("/:id", protect, authorize("employer", "admin"), getCandidateById);

module.exports = router;
