const { Assessment } = require("../models/Assessment.model");
const Candidate = require("../models/Candidate.model");
const { sendAssessmentConfirmation } = require("../utils/email.utils");

// ─── Schedule Assessment ──────────────────────────────────────────────────────
// POST /api/assessments/schedule
const scheduleAssessment = async (req, res, next) => {
  try {
    // Company employees use the slot booking system instead
    if (req.user.isCompanyEmployee) {
      return res.status(400).json({
        success: false,
        message: "Company employees should use the slot booking system to schedule assessments. Use POST /api/assessments/book-slot instead."
      });
    }

    const { company, skills, scheduledDate, scheduledTime, centre, country, zipCode } = req.body;

    const candidate = await Candidate.findOne({ user: req.user._id });
    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate profile not found" });
    }

    // Check for conflicting assessment on same date
    const existing = await Assessment.findOne({
      candidate: candidate._id,
      scheduledDate: new Date(scheduledDate),
      status: "scheduled",
    });
    if (existing) {
      return res.status(409).json({ success: false, message: "You already have an assessment scheduled on this date" });
    }

    const assessment = await Assessment.create({
      candidate: candidate._id,
      company,
      skills,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      centre,
      country: country || "India",
      zipCode,
    });

    // Add to candidate's assessments
    await Candidate.updateOne({ _id: candidate._id }, { $push: { assessments: assessment._id } });

    // Send confirmation email
    sendAssessmentConfirmation(req.user.email, req.user.name, {
      company,
      date: new Date(scheduledDate).toLocaleDateString(),
      time: scheduledTime,
      centre,
    })
      .then(async () => {
        await Assessment.updateOne({ _id: assessment._id }, { confirmationSent: true });
      })
      .catch(console.error);

    res.status(201).json({
      success: true,
      message: "Assessment scheduled successfully. Confirmation sent to your email.",
      data: { assessment },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get My Assessments ───────────────────────────────────────────────────────
// GET /api/assessments/my
const getMyAssessments = async (req, res, next) => {
  try {
    // Company employees don't have Candidate documents - return empty assessments
    if (req.user.isCompanyEmployee) {
      const assessments = [];
      return res.json({ success: true, data: { assessments } });
    }

    const candidate = await Candidate.findOne({ user: req.user._id });
    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate profile not found" });
    }

    const { status } = req.query;
    const query = { candidate: candidate._id };
    if (status) query.status = status;

    const assessments = await Assessment.find(query).sort({ scheduledDate: -1 });

    res.json({ success: true, data: { assessments } });
  } catch (err) {
    next(err);
  }
};

// ─── Get Assessment by ID ─────────────────────────────────────────────────────
// GET /api/assessments/:id
const getAssessmentById = async (req, res, next) => {
  try {
    const assessment = await Assessment.findById(req.params.id).populate("candidate");

    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }

    // Ensure candidate can only see their own assessment
    if (req.user.role === "employee" && !req.user.isCompanyEmployee) {
      const candidate = await Candidate.findOne({ user: req.user._id });
      if (!candidate || assessment.candidate._id.toString() !== candidate._id.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    res.json({ success: true, data: { assessment } });
  } catch (err) {
    next(err);
  }
};

// ─── Cancel Assessment ────────────────────────────────────────────────────────
// PATCH /api/assessments/:id/cancel
const cancelAssessment = async (req, res, next) => {
  try {
    // Company employees use the slot booking system
    if (req.user.isCompanyEmployee) {
      return res.status(400).json({
        success: false,
        message: "Company employees cannot cancel assessments through this endpoint."
      });
    }

    const candidate = await Candidate.findOne({ user: req.user._id });
    const assessment = await Assessment.findOne({ _id: req.params.id, candidate: candidate._id });

    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }

    if (assessment.status !== "scheduled") {
      return res.status(400).json({ success: false, message: "Only scheduled assessments can be cancelled" });
    }

    assessment.status = "cancelled";
    await assessment.save();

    res.json({ success: true, message: "Assessment cancelled", data: { assessment } });
  } catch (err) {
    next(err);
  }
};

// ─── Employer: Request Assessment for a Candidate ──────────────────────────────
// POST /api/assessments/request
const requestAssessment = async (req, res, next) => {
  try {
    const { AssessmentRequest } = require("../models/Assessment.model");
    const Employer = require("../models/Employer.model");

    const { candidateFirstName, candidateLastName, candidateEmail, skills, notes } = req.body;

    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) {
      return res.status(404).json({ success: false, message: "Employer profile not found. Please complete registration first." });
    }

    const request = await AssessmentRequest.create({
      employer: employer._id,
      candidateFirstName,
      candidateLastName,
      candidateEmail,
      skills: Array.isArray(skills) ? skills : [skills],
      notes: notes || "",
    });

    res.status(201).json({
      success: true,
      message: "Assessment request submitted successfully",
      data: { request },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { scheduleAssessment, getMyAssessments, getAssessmentById, cancelAssessment, requestAssessment };
