const User = require("../models/User.model");
const Employer = require("../models/Employer.model");
const Candidate = require("../models/Candidate.model");
const Transaction = require("../models/Transaction.model");
const CompanyCredential = require("../models/CompanyCredential.model");
const { AssessmentRequest } = require("../models/Assessment.model");

// GET /api/admin/overview — platform summary for admin dashboard
const getOverview = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalEmployees,
      totalEmployers,
      totalCandidates,
      totalAssessments,
      revenueAgg,
      activePlans,
      newEmployersThisMonth,
      newCandidatesThisMonth,
      failedPayments,
      expiredPlans,
    ] = await Promise.all([
      CompanyCredential.countDocuments(),
      Employer.countDocuments(),
      Candidate.countDocuments(),
      AssessmentRequest.countDocuments(),
      Transaction.aggregate([
        { $match: { paymentStatus: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Employer.countDocuments({ subscriptionStatus: "active" }),
      Employer.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Candidate.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Transaction.countDocuments({ paymentStatus: "failed" }),
      Employer.countDocuments({ subscriptionStatus: "expired" }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers: totalEmployees,   // kept as totalUsers for frontend compat
        totalEmployees,
        totalEmployers,
        totalCandidates,
        totalAssessments,
        totalRevenue: revenueAgg[0]?.total ?? 0,
        activePlans,
        newEmployersThisMonth,
        newCandidatesThisMonth,
        failedPayments,
        expiredPlans,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/employers
const listEmployers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = "", plan = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};
    if (search) {
      query.$or = [
        { company: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }
    if (plan) query.activePlan = plan;

    const [employers, total] = await Promise.all([
      Employer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Employer.countDocuments(query),
    ]);

    const rows = employers.map((e) => ({
      _id: e._id,
      companyName: e.company,
      contactName: `${e.firstName} ${e.lastName}`.trim(),
      email: e.email,
      plan: e.activePlan || "starter",
      planStatus: e.subscriptionStatus === "active" ? "active" : "expired",
      credits: e.credits ?? 0,
      totalRevenue: e.totalCreditsPurchased ?? 0,
      createdAt: e.createdAt,
    }));

    res.json({
      success: true,
      data: {
        employers: rows,
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

// GET /api/admin/candidates
const listCandidates = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [candidates, total] = await Promise.all([
      Candidate.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Candidate.countDocuments(query),
    ]);

    const rows = candidates.map((c) => ({
      _id: c._id,
      name: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
      email: c.email,
      skills: c.skills || [],
      employer: c.employer?.toString?.() || "",
      assessmentStatus: "invited",
    }));

    res.json({
      success: true,
      data: {
        candidates: rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/employees — FIX: list company-registered employees via CompanyCredential
const listCompanyEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = "", skill = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};

    if (search) {
      query.$or = [
        { candidateName: { $regex: search, $options: "i" } },
        { candidateEmail: { $regex: search, $options: "i" } },
        { companyCode: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const [credentials, total] = await Promise.all([
      CompanyCredential.find(query)
        .populate("company", "company companyCode")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CompanyCredential.countDocuments(query),
    ]);

    const rows = credentials.map((c) => ({
      _id: c._id,
      name: c.candidateName,
      email: c.candidateEmail,
      username: c.username,
      companyCode: c.companyCode,
      companyName: c.company?.company || c.companyCode,
      status: c.status,
      isUsed: c.isUsed,
      createdAt: c.createdAt,
    }));

    res.json({
      success: true,
      data: {
        employees: rows,
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

// GET /api/admin/revenue/summary
const getRevenueSummary = async (req, res, next) => {
  try {
    const revenueAgg = await Transaction.aggregate([
      { $match: { paymentStatus: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue: revenueAgg[0]?.total ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/revenue/monthly
const getRevenueMonthly = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const rows = await Transaction.aggregate([
      { $match: { paymentStatus: "completed", createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthly = rows.map((r) => ({
      month: monthNames[r._id.month - 1],
      total: r.total,
    }));

    res.json({ success: true, data: { monthly } });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/health
const getHealth = async (req, res, next) => {
  try {
    const failedTxns = await Transaction.countDocuments({ paymentStatus: "failed" });
    res.json({
      success: true,
      data: {
        status: "operational",
        failedTransactions: failedTxns,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverview,
  listEmployers,
  listCandidates,
  listCompanyEmployees,
  getRevenueSummary,
  getRevenueMonthly,
  getHealth,
};