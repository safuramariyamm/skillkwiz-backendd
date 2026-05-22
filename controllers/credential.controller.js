const CompanyCredential = require("../models/CompanyCredential.model");
const Employer = require("../models/Employer.model");
const AssessmentSlot = require("../models/AssessmentSlot.model");
const { generateUsername, generatePassword } = require("../utils/companyCode.utils");
const { sendCredentialsEmail } = require("../utils/email.utils");
const { generateAccessToken, generateRefreshToken } = require("../utils/token.utils");

// ─── POST /api/employers/credentials ─────────────────────────────────────────
const generateCredentials = async (req, res, next) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) return res.status(404).json({ success: false, message: "Employer profile not found" });
    if (!employer.companyCode) return res.status(400).json({ success: false, message: "Complete your employer profile first" });

    const { candidateName, candidateEmail } = req.body;
    if (!candidateName?.trim() || !candidateEmail?.trim()) {
      return res.status(422).json({ success: false, message: "Candidate name and email are required" });
    }

    // Check duplicate
    const existing = await CompanyCredential.findOne({
      company: employer._id,
      candidateEmail: candidateEmail.toLowerCase().trim(),
    });
    if (existing) {
      return res.status(409).json({ success: false, message: `${candidateEmail} has already been invited` });
    }

    const username = await generateUsername(employer.companyCode, CompanyCredential);
    const plainPassword = generatePassword();

    const credential = new CompanyCredential({
      company: employer._id,
      companyCode: employer.companyCode,
      candidateName: candidateName.trim(),
      candidateEmail: candidateEmail.toLowerCase().trim(),
      username,
      password: plainPassword,
      plainPassword,
    });
    await credential.save();

    // Email credentials to candidate (non-blocking)
    sendCredentialsEmail(
      candidateEmail,
      candidateName,
      employer.company,
      employer.companyCode,
      username,
      plainPassword
    ).catch((err) => console.error("[Credential Email]", err.message));

    res.status(201).json({
      success: true,
      message: `Credentials generated and emailed to ${candidateEmail}`,
      data: {
        credential: {
          _id: credential._id,
          candidateName: credential.candidateName,
          candidateEmail: credential.candidateEmail,
          username: credential.username,
          password: plainPassword,
          companyCode: employer.companyCode,
          status: credential.status,
          createdAt: credential.createdAt,
        },
      },
    });
  } catch (err) { next(err); }
};

// ─── GET /api/employers/credentials ──────────────────────────────────────────
const getCredentials = async (req, res, next) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) return res.status(404).json({ success: false, message: "Employer profile not found" });

    const credentials = await CompanyCredential.find({ company: employer._id }).sort({ createdAt: -1 });

    // Pre-fetch all booked slots in a single query — eliminates N+1
    const bookedSlots = await AssessmentSlot.find({ bookedBy: { $in: credentials.map(c => c._id) } }).select("date time center location bookedBy");
    const slotMap = {};
    bookedSlots.forEach(s => {
      (s.bookedBy || []).forEach(id => { slotMap[String(id)] = s; });
    });

    const enriched = credentials.map(c => {
      const slot = (c.status === "booked" || c.status === "assessed") ? slotMap[String(c._id)] || null : null;
      return {
          _id: c._id,
          candidateName: c.candidateName,
          candidateEmail: c.candidateEmail,
          username: c.username,
          status: c.status,
          isUsed: c.isUsed,
          bookedSlot: slot || null,
          createdAt: c.createdAt,
        };
      });

    const stats = {
      total: enriched.length,
      invited: enriched.filter(c => c.status === "invited").length,
      registered: enriched.filter(c => c.status === "registered").length,
      booked: enriched.filter(c => c.status === "booked").length,
      assessed: enriched.filter(c => c.status === "assessed").length,
    };

    res.json({ success: true, data: { credentials: enriched, stats } });
  } catch (err) { next(err); }
};

// ─── DELETE /api/employers/credentials/:id ────────────────────────────────────
const revokeCredential = async (req, res, next) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) return res.status(404).json({ success: false, message: "Employer profile not found" });

    const credential = await CompanyCredential.findOne({ _id: req.params.id, company: employer._id });
    if (!credential) return res.status(404).json({ success: false, message: "Credential not found" });
    if (credential.status === "booked" || credential.status === "assessed") {
      return res.status(400).json({ success: false, message: "Cannot revoke — candidate has already booked a slot" });
    }

    await CompanyCredential.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: "Access revoked successfully" });
  } catch (err) { next(err); }
};

// ─── POST /api/auth/employee-login ───────────────────────────────────────────
const employeeLogin = async (req, res, next) => {
  try {
    const { companyCode, username, password } = req.body;
    if (!companyCode || !username || !password) {
      return res.status(400).json({ success: false, message: "Company code, username and password are required" });
    }

    const credential = await CompanyCredential.findOne({
      companyCode: companyCode.toUpperCase().trim(),
      username: username.trim().toUpperCase(),
    }).select("+password");

    if (!credential) {
      return res.status(401).json({ success: false, message: "Invalid company code or username" });
    }

    const isMatch = await credential.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    const employer = await Employer.findById(credential.company).select("company companyCode");

    // Mark as used on first login
    if (!credential.isUsed) {
      await CompanyCredential.updateOne({ _id: credential._id }, { isUsed: true });
      // Update status to registered if still invited
      if (credential.status === "invited") {
        await CompanyCredential.updateOne({ _id: credential._id }, { status: "registered" });
      }
    }

    // Token payload includes company employee flag
    const tokenPayload = {
      id: credential._id.toString(),
      role: "employee",
      companyCode: credential.companyCode,
      companyId: credential.company.toString(),
      credentialId: credential._id.toString(),
      email: credential.candidateEmail,
      name: credential.candidateName,
      isCompanyEmployee: true,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        refreshToken,
        user: {
          id: credential._id,
          name: credential.candidateName,
          email: credential.candidateEmail,
          username: credential.username,
          role: "employee",
          companyCode: credential.companyCode,
          companyName: employer?.company || companyCode,
          isCompanyEmployee: true,
          status: credential.isUsed ? (credential.status === "invited" ? "registered" : credential.status) : "invited",
        },
      },
    });
  } catch (err) { next(err); }
};

// ─── POST /api/assessments/book-slot ─────────────────────────────────────────
const bookSlot = async (req, res, next) => {
  try {
    const { slotId } = req.body;
    if (!slotId) return res.status(422).json({ success: false, message: "Slot ID is required" });

    // req.user._id is the credential ID for company employees
    const credential = await CompanyCredential.findById(req.user._id);
    if (!credential) return res.status(404).json({ success: false, message: "Employee credential not found" });

    if (credential.status === "booked" || credential.status === "assessed") {
      return res.status(400).json({ success: false, message: "You have already booked a slot. No rescheduling allowed." });
    }

    // Slot must belong to this company
    const slot = await AssessmentSlot.findOne({
      _id: slotId,
      companyCode: credential.companyCode,
      isActive: true,
    });
    if (!slot) return res.status(404).json({ success: false, message: "Slot not found or not available for your company" });
    if (slot.bookedCount >= slot.capacity) {
      return res.status(400).json({ success: false, message: "This slot is full. Please choose another slot." });
    }

    // Book atomically
    await AssessmentSlot.updateOne(
      { _id: slotId, bookedCount: { $lt: slot.capacity } },
      { $inc: { bookedCount: 1 }, $push: { bookedBy: credential._id } }
    );
    await CompanyCredential.updateOne({ _id: credential._id }, { status: "booked" });

    res.json({
      success: true,
      message: "Slot booked successfully!",
      data: {
        booking: {
          slotId: slot._id,
          date: slot.date,
          time: slot.time,
          center: slot.center,
          location: slot.location,
          skills: slot.skills,
          companyCode: slot.companyCode,
          bookedAt: new Date().toISOString(),
        },
      },
    });
  } catch (err) { next(err); }
};

// ─── GET /api/auth/company-employee/me ─────────────────────────────────────────
const companyEmployeeGetMyStatus = async (req, res, next) => {
  try {
    const credential = await CompanyCredential.findById(req.user._id).select("status isUsed companyCode");
    if (!credential) {
      return res.status(404).json({ success: false, message: "Employee credential not found." });
    }
    res.json({
      success: true,
      data: {
        status: credential.status,
        isUsed: credential.isUsed,
        companyCode: credential.companyCode,
      },
    });
  } catch (err) { next(err); }
};

module.exports = {
  generateCredentials, getCredentials, revokeCredential, employeeLogin,
  bookSlot, companyEmployeeGetMyStatus,
};
