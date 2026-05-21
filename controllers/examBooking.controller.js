const ExamBooking = require("../models/ExamBooking.model");
const Candidate = require("../models/Candidate.model");
const { sendExamConfirmationEmail } = require("../utils/email.utils");

// ─── Create Exam Booking ───────────────────────────────────────────────────────
const createExamBooking = async (req, res, next) => {
  try {
    const { company, skills, scheduledDate, scheduledTime, centre, country, zipCode, notes } = req.body;

    // Find or create candidate profile
    let candidate = await Candidate.findOne({ user: req.user._id });

    if (!candidate) {
      return res.status(400).json({
        success: false,
        message: "Please complete your candidate profile first before booking an exam."
      });
    }

    // Generate unique booking reference
    const bookingReference = `SK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create exam booking
    const booking = await ExamBooking.create({
      employee: candidate._id,
      user: req.user._id,
      company,
      skills,
      scheduledDate,
      scheduledTime,
      centre,
      country: country || "India",
      zipCode,
      bookingReference,
      notes: notes || "",
    });

    // Populate candidate data
    await booking.populate("employee", "firstName lastName email");

    // Send confirmation email (non-blocking)
    sendExamConfirmationEmail(
      req.user.email,
      `${candidate.firstName} ${candidate.lastName}`,
      booking
    ).catch(console.error);

    res.status(201).json({
      success: true,
      message: "Exam booked successfully!",
      data: { booking }
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get User's Exam Bookings ─────────────────────────────────────────────────
const getUserBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { user: req.user._id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ExamBooking.countDocuments(query);

    const bookings = await ExamBooking.find(query)
      .populate("employee", "firstName lastName email phone")
      .sort({ scheduledDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate statistics
    const totalBookings = await ExamBooking.countDocuments({ user: req.user._id });
    const upcomingBookings = await ExamBooking.countDocuments({
      user: req.user._id,
      status: "scheduled",
      scheduledDate: { $gte: new Date() }
    });
    const completedBookings = await ExamBooking.countDocuments({
      user: req.user._id,
      status: "completed"
    });

    res.json({
      success: true,
      data: {
        bookings,
        stats: {
          total: totalBookings,
          upcoming: upcomingBookings,
          completed: completedBookings,
        },
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Booking ───────────────────────────────────────────────────────
const getBookingById = async (req, res, next) => {
  try {
    const booking = await ExamBooking.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate("employee", "firstName lastName email phone");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    res.json({ success: true, data: { booking } });
  } catch (err) {
    next(err);
  }
};

// ─── Cancel Booking ───────────────────────────────────────────────────────────
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await ExamBooking.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: "scheduled" },
      { status: "cancelled" },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or already processed"
      });
    }

    res.json({
      success: true,
      message: "Booking cancelled successfully",
      data: { booking }
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Available Exam Centres ───────────────────────────────────────────────
const getExamCentres = async (req, res, next) => {
  try {
    // This could be dynamic based on location, but for now return static data
    const centres = [
      { id: "centre1", name: "Delhi Centre", address: "Connaught Place, New Delhi", zipCode: "110001" },
      { id: "centre2", name: "Mumbai Centre", address: "Bandra West, Mumbai", zipCode: "400050" },
      { id: "centre3", name: "Bangalore Centre", address: "MG Road, Bangalore", zipCode: "560001" },
      { id: "centre4", name: "Chennai Centre", address: "T. Nagar, Chennai", zipCode: "600017" },
      { id: "centre5", name: "Pune Centre", address: "FC Road, Pune", zipCode: "411005" },
    ];

    res.json({ success: true, data: { centres } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createExamBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  getExamCentres,
};