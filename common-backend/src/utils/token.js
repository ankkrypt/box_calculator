const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../config/env");

/* Signs a short-lived access token JWT */
function signAccessToken({ userId, role, vendorId, plan }) {
  return jwt.sign(
    { userId: String(userId), role, vendorId: String(vendorId), plan: plan || "free" },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
}

/* Verifies access token JWT signature and expiration */
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

/* Generates random refresh token + its sha256 hash */
function generateRefreshToken() {
  const token = crypto.randomBytes(48).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

/* Hashes a token using SHA-256 for secure DB storage */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/* Converts duration strings like "30d", "15m", "1h" to milliseconds */
function msFromNow(spec) {
  const m = /^(\d+)([dhm])$/.exec(spec);
  if (!m) return 30 * 24 * 3600 * 1000;
  const mult = { m: 60e3, h: 3600e3, d: 86400e3 }[m[2]];
  return Number(m[1]) * mult;
}

/* Centralized cookie transport helpers */
function setRefreshCookie(res, token) {
  res.cookie(config.jwt.cookieName, token, {
    httpOnly: true,
    secure: config.jwt.cookieSecure,
    sameSite: "lax",
    maxAge: msFromNow(config.jwt.refreshExpiresIn),
    path: "/api/auth",
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(config.jwt.cookieName, {
    path: "/api/auth",
    sameSite: "lax",
    secure: config.jwt.cookieSecure,
  });
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  msFromNow,
  setRefreshCookie,
  clearRefreshCookie,
};
