const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const {
  createExamBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  getExamCentres,
} = require("../controllers/examBooking.controller");

// All routes require authentication and employee role
router.use(protect);
router.use(authorize("employee"));

// GET /api/exam-bookings/centres - Get available exam centres
router.get("/centres", getExamCentres);

// GET /api/exam-bookings - Get user's exam bookings
router.get("/", getUserBookings);

// GET /api/exam-bookings/:id - Get specific booking
router.get("/:id", getBookingById);

// POST /api/exam-bookings - Create new exam booking
router.post("/", createExamBooking);

// PUT /api/exam-bookings/:id/cancel - Cancel booking
router.put("/:id/cancel", cancelBooking);

module.exports = router;