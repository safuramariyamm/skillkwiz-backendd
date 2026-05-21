const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const CompanyCredential = require("../models/CompanyCredential.model");

// Main protect middleware — handles both regular users and company employees
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Company employee token (has isCompanyEmployee flag)
    if (decoded.isCompanyEmployee) {
      const credential = await CompanyCredential.findById(decoded.id || decoded.credentialId);
      if (!credential) {
        return res.status(401).json({ success: false, message: "Employee credential not found or revoked." });
      }
      // Attach employee info to req.user
      req.user = {
        _id: credential._id,
        id: credential._id,
        email: credential.candidateEmail,
        name: credential.candidateName,
        role: "employee",
        companyCode: credential.companyCode,
        companyId: credential.company,
        credentialId: credential._id,
        isCompanyEmployee: true,
      };
      return next();
    }

    // Regular user token
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found." });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: "Account deactivated." });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token." });
    }
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired. Please log in again." });
    }
    next(err);
  }
};

// Role-based authorization
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(" or ")}`,
    });
  }
  next();
};

// Optional auth — attaches req.user if a valid token is present, but never blocks the request
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.isCompanyEmployee) {
      const credential = await CompanyCredential.findById(decoded.id || decoded.credentialId);
      if (credential) {
        req.user = {
          _id: credential._id,
          id: credential._id,
          email: credential.candidateEmail,
          name: credential.candidateName,
          role: "employee",
          companyCode: credential.companyCode,
          companyId: credential.company,
          credentialId: credential._id,
          isCompanyEmployee: true,
        };
      }
      return next();
    }

    const user = await User.findById(decoded.id).select("-password");
    if (user && user.isActive) {
      req.user = user;
    }
    next();
  } catch (err) {
    // Token is invalid or expired — just continue as unauthenticated
    next();
  }
};

module.exports = { protect, authorize, optionalAuth };