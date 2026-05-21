const AssessmentSlot = require("../models/AssessmentSlot.model");
const Employer = require("../models/Employer.model");

// POST /api/employers/slots
const createSlot = async (req, res, next) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) return res.status(404).json({ success: false, message: "Employer profile not found" });
    if (!employer.companyCode) return res.status(400).json({ success: false, message: "Company profile incomplete" });

    const { date, time, center, location, skills, capacity } = req.body;
    if (!date || !time || !center || !location || !capacity) {
      return res.status(422).json({ success: false, message: "date, time, center, location and capacity are required" });
    }

    const slot = await AssessmentSlot.create({
      company: employer._id,
      companyCode: employer.companyCode,
      date, time, center,
      location,
      skills: skills || [],
      capacity: parseInt(capacity),
    });

    res.status(201).json({ success: true, message: "Slot created successfully", data: { slot } });
  } catch (err) { next(err); }
};

// GET /api/employers/slots
const getMySlots = async (req, res, next) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) return res.status(404).json({ success: false, message: "Employer profile not found" });

    const slots = await AssessmentSlot.find({ company: employer._id }).sort({ date: 1, time: 1 });
    res.json({ success: true, data: { slots } });
  } catch (err) { next(err); }
};

// DELETE /api/employers/slots/:id
const deleteSlot = async (req, res, next) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) return res.status(404).json({ success: false, message: "Employer profile not found" });

    const slot = await AssessmentSlot.findOne({ _id: req.params.id, company: employer._id });
    if (!slot) return res.status(404).json({ success: false, message: "Slot not found" });
    if (slot.bookedCount > 0) return res.status(400).json({ success: false, message: "Cannot delete a slot that already has bookings" });

    await AssessmentSlot.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: "Slot deleted" });
  } catch (err) { next(err); }
};

// GET /api/assessments/available-slots — for company employees only
const getAvailableSlots = async (req, res, next) => {
  try {
    // req.user.companyCode is set by auth middleware for company employees
    const companyCode = req.user.companyCode;
    if (!companyCode) {
      return res.status(403).json({ success: false, message: "Access denied. Company employee login required." });
    }

    const slots = await AssessmentSlot.find({
      companyCode,
      isActive: true,
    }).sort({ date: 1, time: 1 });

    const slotsWithAvailability = slots.map(s => ({
      ...s.toObject(),
      availableSeats: s.capacity - s.bookedCount,
      isFull: s.bookedCount >= s.capacity,
    }));

    res.json({ success: true, data: { slots: slotsWithAvailability } });
  } catch (err) { next(err); }
};

module.exports = { createSlot, getMySlots, deleteSlot, getAvailableSlots };
