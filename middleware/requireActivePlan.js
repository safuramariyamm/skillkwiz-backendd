const Employer = require("../models/Employer.model");

/**
 * requireActivePlan
 * ─────────────────
 * Blocks any API request if the employer:
 *   - has no active subscription (subscriptionStatus !== "active"), OR
 *   - has creditsRemaining <= 0
 *
 * Must be placed AFTER protect + authorize("employer")
 *
 * Usage:
 *   router.post("/candidates", protect, authorize("employer"), requireActivePlan, createCandidate);
 */
const requireActivePlan = async (req, res, next) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id }).select(
      "credits subscriptionStatus activePlan subscriptionExpiry"
    );

    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer profile not found",
        code: "EMPLOYER_NOT_FOUND",
      });
    }

    // Check subscription status
    if (employer.subscriptionStatus !== "active") {
      return res.status(403).json({
        success: false,
        message:
          "No active subscription. Please purchase a plan to access this feature.",
        code: "NO_ACTIVE_PLAN",
        redirectTo: "/employer/pricing",
      });
    }

    // Check expiry if set
    if (
      employer.subscriptionExpiry &&
      new Date() > new Date(employer.subscriptionExpiry)
    ) {
      // Auto-expire the subscription
      await Employer.findByIdAndUpdate(employer._id, {
        subscriptionStatus: "expired",
      });
      return res.status(403).json({
        success: false,
        message:
          "Your subscription has expired. Please renew to continue.",
        code: "PLAN_EXPIRED",
        redirectTo: "/employer/pricing",
      });
    }

    // Check credit balance
    if (employer.credits <= 0) {
      return res.status(403).json({
        success: false,
        message:
          "You have no credits remaining. Please purchase a plan to continue.",
        code: "INSUFFICIENT_CREDITS",
        redirectTo: "/employer/pricing",
      });
    }

    // Attach employer to request so controllers don't need an extra DB call
    req.employer = employer;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireActivePlan };