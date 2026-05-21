const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { uploadResume } = require("../middleware/upload.middleware");
const {
  registerEmployer, getMyProfile, updateMyProfile,
  submitAssessmentRequest, getMyAssessmentRequests,
} = require("../controllers/employer.controller");
const { createSlot, getMySlots, deleteSlot } = require("../controllers/slot.controller");
const { generateCredentials, getCredentials, revokeCredential } = require("../controllers/credential.controller");

// Profile
router.get("/me", protect, authorize("employer"), getMyProfile);
router.post("/register", protect, authorize("employer"), registerEmployer);
router.put("/me", protect, authorize("employer"), updateMyProfile);

// Assessment requests
router.post("/assessment-request", protect, authorize("employer"), uploadResume.single("resume"), submitAssessmentRequest);
router.get("/assessment-requests", protect, authorize("employer"), getMyAssessmentRequests);

// Slots management
router.post("/slots", protect, authorize("employer"), createSlot);
router.get("/slots", protect, authorize("employer"), getMySlots);
router.delete("/slots/:id", protect, authorize("employer"), deleteSlot);

// Candidate credentials management
router.post("/credentials", protect, authorize("employer"), generateCredentials);
router.get("/credentials", protect, authorize("employer"), getCredentials);
router.delete("/credentials/:id", protect, authorize("employer"), revokeCredential);

module.exports = router;
