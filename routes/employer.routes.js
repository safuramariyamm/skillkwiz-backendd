const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { requireActivePlan } = require("../middleware/requireActivePlan");
const { uploadResume } = require("../middleware/upload.middleware");
const {
  registerEmployer,
  getMyProfile,
  updateMyProfile,
  submitAssessmentRequest,
  getMyAssessmentRequests,
} = require("../controllers/employer.controller");
const {
  createSlot,
  getMySlots,
  deleteSlot,
} = require("../controllers/slot.controller");
const {
  generateCredentials,
  getCredentials,
  revokeCredential,
} = require("../controllers/credential.controller");

// ─── Profile (no plan required) ──────────────────────────────────────────────
router.get("/me", protect, authorize("employer"), getMyProfile);
router.post("/register", protect, authorize("employer"), registerEmployer);
router.put("/me", protect, authorize("employer"), updateMyProfile);

// ─── Assessment Requests (read: no plan | write: plan required) ───────────────
router.get(
  "/assessment-requests",
  protect,
  authorize("employer"),
  getMyAssessmentRequests
);
router.post(
  "/assessment-request",
  protect,
  authorize("employer"),
  requireActivePlan,
  uploadResume.single("resume"),
  submitAssessmentRequest
);

// ─── Slots (read: no plan | create/delete: plan required) ────────────────────
router.get("/slots", protect, authorize("employer"), getMySlots);
router.post(
  "/slots",
  protect,
  authorize("employer"),
  requireActivePlan,
  createSlot
);
router.delete(
  "/slots/:id",
  protect,
  authorize("employer"),
  requireActivePlan,
  deleteSlot
);

// ─── Credentials (read: no plan | generate: plan required) ───────────────────
router.get("/credentials", protect, authorize("employer"), getCredentials);
router.post(
  "/credentials",
  protect,
  authorize("employer"),
  requireActivePlan,
  generateCredentials
);
router.delete(
  "/credentials/:id",
  protect,
  authorize("employer"),
  requireActivePlan,
  revokeCredential
);

module.exports = router;