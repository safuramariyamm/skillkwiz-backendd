const express = require("express");
const router = express.Router();
const { optionalAuth } = require("../middleware/auth.middleware");
const { sendOtpValidator, verifyOtpValidator } = require("../middleware/validate.middleware");
const { sendOtp, verifyOtp } = require("../controllers/misc.controller");

router.post("/send", optionalAuth, sendOtpValidator, sendOtp);
router.post("/verify", optionalAuth, verifyOtpValidator, verifyOtp);

module.exports = router;
