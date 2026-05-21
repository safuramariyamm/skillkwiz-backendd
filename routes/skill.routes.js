const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const { getSkills, createSkill } = require("../controllers/misc.controller");

router.get("/", getSkills);
router.post("/", protect, authorize("admin"), createSkill);

module.exports = router;
