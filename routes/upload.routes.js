const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { uploadResume } = require("../middleware/upload.middleware");
const { uploadResume: uploadResumeController } = require("../controllers/misc.controller");

// POST /api/uploads/resume - standalone resume upload endpoint
router.post("/resume", protect, uploadResume.single("resume"), uploadResumeController);

module.exports = router;
