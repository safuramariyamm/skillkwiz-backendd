const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { requireActivePlan } = require("../middleware/requireActivePlan");
const { uploadResume } = require("../middleware/upload.middleware");
const { employeeRegisterValidator } = require("../middleware/validate.middleware");
const {
  registerCandidate,
  getMyProfile,
  updateMyProfile,
  getCandidates,
  getCandidateById,
} = require("../controllers/candidate.controller");

// GET /api/candidates — employer/admin only (plan not required to VIEW)
router.get("/", protect, authorize("employer", "admin"), getCandidates);

// GET /api/candidates/me — employee
router.get("/me", protect, authorize("employee"), getMyProfile);

// POST /api/candidates/register — employee registers profile
router.post(
  "/register",
  protect,
  authorize("employee"),
  uploadResume.single("resume"),
  employeeRegisterValidator,
  registerCandidate
);

// PUT /api/candidates/me — employee updates profile
router.put(
  "/me",
  protect,
  authorize("employee"),
  uploadResume.single("resume"),
  updateMyProfile
);

// GET /api/candidates/:id — employer/admin (plan not required to VIEW)
router.get("/:id", protect, authorize("employer", "admin"), getCandidateById);

module.exports = router;