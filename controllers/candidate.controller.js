const Candidate = require("../models/Candidate.model");
const User = require("../models/User.model");
const { getFileUrl } = require("../middleware/upload.middleware");

// ─── Register/Create Candidate Profile ───────────────────────────────────────
// POST /api/candidates/register
const registerCandidate = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone } = req.body;

    // Check if candidate profile already exists — if so, return it (upsert behavior)
    const existing = await Candidate.findOne({ user: req.user._id });
    if (existing) {
      await existing.populate('user', 'name email role');
      return res.status(200).json({
        success: true,
        message: 'Candidate profile already exists',
        data: { candidate: existing },
      });
    }

    let resumeData = null;
    if (req.file) {
      resumeData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
      };
    }

    if (!resumeData) {
      return res.status(400).json({ success: false, message: "Resume upload is required" });
    }

    const candidate = await Candidate.create({
      user: req.user._id,
      firstName,
      lastName,
      email,
      phone,
      resume: resumeData,
      isProfileComplete: true,
    });

    await candidate.populate("user", "name email role");

    res.status(201).json({
      success: true,
      message: "Candidate registered successfully",
      data: { candidate },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get My Candidate Profile ─────────────────────────────────────────────────
// GET /api/candidates/me
const getMyProfile = async (req, res, next) => {
  try {
    // Handle company employees - return credential data as profile
    if (req.user.isCompanyEmployee) {
      const CompanyCredential = require("../models/CompanyCredential.model");
      const credential = await CompanyCredential.findById(req.user._id).select("candidateName candidateEmail companyCode status");
      if (!credential) {
        return res.status(404).json({ success: false, message: "Employee credential not found" });
      }
      const profileData = {
        _id: credential._id,
        firstName: credential.candidateName?.split(" ")[0] || "",
        lastName: credential.candidateName?.split(" ").slice(1).join(" ") || "",
        email: credential.candidateEmail,
        user: credential._id,
        companyCode: credential.companyCode,
        status: credential.status,
      };
      return res.json({ success: true, data: { candidate: profileData } });
    }

    const candidate = await Candidate.findOne({ user: req.user._id }).populate("user", "name email");
    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate profile not found" });
    }
    res.json({ success: true, data: { candidate } });
  } catch (err) {
    next(err);
  }
};

// ─── Update Candidate Profile ─────────────────────────────────────────────────
// PUT /api/candidates/me
const updateMyProfile = async (req, res, next) => {
  try {
    // Company employees don't have Candidate profiles to update
    if (req.user.isCompanyEmployee) {
      return res.status(400).json({
        success: false,
        message: "Company employees cannot update candidate profiles. Profile is managed by the employer."
      });
    }

    const allowed = ["firstName", "lastName", "phone", "location", "jobFamily", "experience", "education", "skills", "gender", "isAvailable"];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.file) {
      updates.resume = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
      };
    }

    const candidate = await Candidate.findOneAndUpdate(
      { user: req.user._id },
      updates,
      { new: true, runValidators: true }
    ).populate("user", "name email");

    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate profile not found" });
    }

    res.json({ success: true, message: "Profile updated", data: { candidate } });
  } catch (err) {
    next(err);
  }
};

// ─── Search & Filter Candidates (for employers) ───────────────────────────────
// GET /api/candidates
const getCandidates = async (req, res, next) => {
  try {
    const {
      search,
      location,
      jobFamily,
      gender,
      skills,
      minPercentile,
      page = 1,
      limit = 10,
    } = req.query;

    const query = { isProfileComplete: true };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }

    const cityParam = location || req.query.city;
    if (cityParam) {
      query["$or"] = query["$or"] || [];
      query["location.city"] = { $regex: cityParam, $options: "i" };
    }

    if (jobFamily) {
      query.jobFamily = jobFamily;
    }

    if (gender && gender !== "both") {
      query.gender = gender;
    }

    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : skills.split(",");
      query["skills.name"] = { $in: skillsArray };
    }

    if (minPercentile) {
      query.percentileScore = { $gte: parseFloat(minPercentile) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Candidate.countDocuments(query);

    const candidates = await Candidate.find(query)
      .populate("user", "name email avatar")
      .sort({ percentileScore: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-resume.path"); // hide internal path

    res.json({
      success: true,
      data: {
        candidates,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Candidate by ID (for employers) ─────────────────────────────────────
// GET /api/candidates/:id
const getCandidateById = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate("user", "name email avatar")
      .select("-resume.path");

    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate not found" });
    }

    res.json({ success: true, data: { candidate } });
  } catch (err) {
    next(err);
  }
};

module.exports = { registerCandidate, getMyProfile, updateMyProfile, getCandidates, getCandidateById };
