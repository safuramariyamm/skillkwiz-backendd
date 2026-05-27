const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const {
  getOverview,
  listEmployers,
  listCandidates,
  getRevenueSummary,
  getRevenueMonthly,
  getHealth,
} = require("../controllers/admin.controller");

router.use(protect, authorize("admin"));

router.get("/overview", getOverview);
router.get("/employers", listEmployers);
router.get("/candidates", listCandidates);
router.get("/revenue/summary", getRevenueSummary);
router.get("/revenue/monthly", getRevenueMonthly);
router.get("/health", getHealth);

module.exports = router;
