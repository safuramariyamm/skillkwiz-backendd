const jwt = require("jsonwebtoken");

const generateAccessToken = (payloadOrId) => {
  let payload;

  if (typeof payloadOrId === "string") {
    // Plain string ID
    payload = { id: payloadOrId };
  } else if (payloadOrId && typeof payloadOrId === "object" && payloadOrId.constructor?.name === "ObjectId") {
    // Mongoose ObjectId — convert to string
    payload = { id: payloadOrId.toString() };
  } else if (payloadOrId && typeof payloadOrId === "object" && !payloadOrId._bsontype) {
    // Plain object payload (e.g. company employee token)
    // Convert any ObjectId values inside to strings
    payload = JSON.parse(JSON.stringify(payloadOrId));
  } else {
    // Fallback — toString() whatever it is
    payload = { id: String(payloadOrId) };
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const generateRefreshToken = (payloadOrId) => {
  let payload;

  if (typeof payloadOrId === "string") {
    payload = { id: payloadOrId };
  } else if (payloadOrId && typeof payloadOrId === "object" && payloadOrId.constructor?.name === "ObjectId") {
    payload = { id: payloadOrId.toString() };
  } else if (payloadOrId && typeof payloadOrId === "object" && !payloadOrId._bsontype) {
    payload = JSON.parse(JSON.stringify(payloadOrId));
  } else {
    payload = { id: String(payloadOrId) };
  }

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

const sendTokenResponse = (user, statusCode, res, message) => {
  const tokenPayload = {
    id: user._id.toString(),
    role: user.role,
  };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  res.status(statusCode).json({
    success: true,
    message,
    data: {
      accessToken,
      refreshToken,
      user: typeof user.toPublicJSON === "function" ? user.toPublicJSON() : user,
    },
  });
};

module.exports = { generateAccessToken, generateRefreshToken, verifyRefreshToken, sendTokenResponse };