const Employer = require("../models/Employer.model");
const { generateCompanyCode } = require("../utils/companyCode.utils");
const { AssessmentRequest } = require("../models/Assessment.model");
const { sendAssessmentRequestNotification } = require("../utils/email.utils");

// ─── Register Employer Profile ────────────────────────────────────────────────
// POST /api/employers/register
const registerEmployer = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, company, department, authorizationDetails } = req.body;
    const authorized = req.body.authorized !== undefined ? req.body.authorized : req.body.isAuthorized;

    const existing = await Employer.findOne({ user: req.user._id });
    if (existing) {
      await existing.populate('user', 'name email role');
      return res.status(200).json({
        success: true,
        message: 'Employer profile already exists',
        data: { employer: existing },
      });
    }

    // Auto-generate unique company code
    const companyCode = await generateCompanyCode(company.trim());

    const employer = await Employer.create({
      user: req.user._id,
      companyCode,
      firstName,
      lastName,
      email,
      phone,
      company,
      department,
      authorized,
      authorizationDetails: authorizationDetails || "",
    });

    await employer.populate("user", "name email role");

    res.status(201).json({
      success: true,
      message: "Employer registered successfully",
      data: { employer },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get My Employer Profile ──────────────────────────────────────────────────
// GET /api/employers/me
const getMyProfile = async (req, res, next) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id }).populate("user", "name email");
    if (!employer) {
      return res.status(404).json({ success: false, message: "Employer profile not found" });
    }
    res.json({ success: true, data: { employer } });
  } catch (err) {
    next(err);
  }
};

// ─── Update Employer Profile ──────────────────────────────────────────────────
// PUT /api/employers/me
const updateMyProfile = async (req, res, next) => {
  try {
    const allowed = ["firstName", "lastName", "phone", "company", "department", "authorized", "authorizationDetails", "website", "industry"];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const employer = await Employer.findOneAndUpdate(
      { user: req.user._id },
      updates,
      { new: true, runValidators: true }
    ).populate("user", "name email");

    if (!employer) {
      return res.status(404).json({ success: false, message: "Employer profile not found" });
    }

    res.json({ success: true, message: "Profile updated", data: { employer } });
  } catch (err) {
    next(err);
  }
};

// ─── Submit Assessment Request ────────────────────────────────────────────────
// POST /api/employers/assessment-request
const submitAssessmentRequest = async (req, res, next) => {
  try {
    const { candidateFirstName, candidateLastName, candidateEmail, skills, notes } = req.body;

    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) {
      return res.status(404).json({ success: false, message: "Employer profile not found. Please complete registration first." });
    }

    let resumePath = null;
    if (req.file) {
      resumePath = req.file.path;
    }

    const request = await AssessmentRequest.create({
      employer: employer._id,
      candidateFirstName,
      candidateLastName,
      candidateEmail,
      skills,
      notes: notes || "",
      resumePath,
    });

    // Update employer's assessmentRequests array
    await Employer.updateOne(
      { _id: employer._id },
      { $push: { assessmentRequests: request._id } }
    );

    // Send notification to candidate (non-blocking)
    sendAssessmentRequestNotification(
      candidateEmail,
      `${candidateFirstName} ${candidateLastName}`,
      employer.company,
      skills
    ).catch(console.error);

    res.status(201).json({
      success: true,
      message: "Assessment request submitted. Candidate will be notified within 24 hours.",
      data: { request },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get My Assessment Requests ───────────────────────────────────────────────
// GET /api/employers/assessment-requests
const getMyAssessmentRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) {
      return res.status(404).json({ success: false, message: "Employer profile not found" });
    }

    const query = { employer: employer._id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await AssessmentRequest.countDocuments(query);
    const requests = await AssessmentRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        requests,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { registerEmployer, getMyProfile, updateMyProfile, submitAssessmentRequest, getMyAssessmentRequests };
