const Employer = require("../models/Employer.model");

/**
 * requireCredits — blocks the request if employer has 0 credits
 * Attach AFTER protect + authorize("employer") middleware
 */
const requireCredits = async (req, res, next) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id }).select("credits");

    if (!employer) {
      return res.status(404).json({ success: false, message: "Employer profile not found" });
    }

    if (employer.credits <= 0) {
      return res.status(402).json({
        success: false,
        message: "Insufficient credits. Please purchase a plan to continue.",
        code: "INSUFFICIENT_CREDITS",
        redirectTo: "/employer/pricing",
      });
    }

    // Attach employer to req so controller can use it without another DB call
    req.employer = employer;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireCredits };
