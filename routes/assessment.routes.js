const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { requireActivePlan } = require("../middleware/requireActivePlan");
const { scheduleAssessmentValidator } = require("../middleware/validate.middleware");
const {
  scheduleAssessment,
  getMyAssessments,
  getAssessmentById,
  cancelAssessment,
  requestAssessment,
} = require("../controllers/assessment.controller");
const { uploadResume } = require("../middleware/upload.middleware");
const { getAvailableSlots } = require("../controllers/slot.controller");
const { bookSlot } = require("../controllers/credential.controller");

// ── Employee (regular) routes ─────────────────────────────────────────────────
router.post(
  "/schedule",
  protect,
  authorize("employee"),
  scheduleAssessmentValidator,
  scheduleAssessment
);
router.get("/my", protect, authorize("employee"), getMyAssessments);
router.patch("/:id/cancel", protect, authorize("employee"), cancelAssessment);

// ── Company employee routes ───────────────────────────────────────────────────
router.get("/available-slots", protect, getAvailableSlots);
router.post("/book-slot", protect, bookSlot);

// ── Employer routes (requireActivePlan on write) ──────────────────────────────
router.post(
  "/request",
  protect,
  authorize("employer"),
  requireActivePlan,
  uploadResume.single("resume"),
  requestAssessment
);

// ── General ───────────────────────────────────────────────────────────────────
router.get("/:id", protect, getAssessmentById);

module.exports = router;