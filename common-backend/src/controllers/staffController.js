const crypto = require("crypto");
const Staff = require("../models/Staff");
const Vendor = require("../models/Vendor");
const RefreshToken = require("../models/RefreshToken");
const config = require("../config/env");
const {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  msFromNow,
  setRefreshCookie,
  clearRefreshCookie,
} = require("../utils/token");

/* Helper to issue tokens & save refresh session for staff */
async function issueStaffSession(staff, vendor) {
  // Staff inherits the company's active subscription tier!
  const accessToken = signAccessToken({
    userId: staff._id,
    role: "staff",
    vendorId: staff.vendorId,
    plan: vendor?.plan || "free",
  });

  const { token, tokenHash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + msFromNow(config.jwt.refreshExpiresIn));

  // Stored with userType: "staff" (Isolated from vendor tokens)
  await RefreshToken.create({
    userId: staff._id,
    userType: "staff",
    tokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken: token,
    user: {
      id: staff._id,
      name: staff.name,
      email: staff.email,
      role: "staff",
      status: staff.status,
      vendorId: staff.vendorId,
      vendorName: vendor?.vendorName || "",
      plan: vendor?.plan || "free",
    },
  };
}

/* ==========================================================================
   STAFF CONTROLLER
   ========================================================================== */

/* POST /api/auth/staff/login
   Staff logs in with credentials provided by vendor:
   Username = email, password = email (or custom password after reset) */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      console.log("[Staff] login: Rejected - email or password missing");
      return res.status(400).json({ error: { message: "Email and password are required", status: 400 } });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[Staff] login: Attempt for ${normalizedEmail}`);
    const staff = await Staff.findOne({ email: normalizedEmail });

    if (!staff) {
      console.log(`[Staff] login: FAILED - Account not found for ${normalizedEmail}`);
      return res.status(401).json({ error: { message: "Invalid email or password", status: 401 } });
    }

    if (staff.status === "disabled") {
      console.log(`[Staff] login: FAILED - Account disabled for ${normalizedEmail}`);
      return res.status(403).json({
        error: { message: "Your staff account has been disabled. Please contact your company administrator.", status: 403 },
      });
    }

    const isMatch = await staff.verifyPassword(password);
    if (!isMatch) {
      console.log(`[Staff] login: FAILED - Incorrect password for ${normalizedEmail}`);
      return res.status(401).json({ error: { message: "Invalid email or password", status: 401 } });
    }

    // Lookup the parent vendor so staff inherits the vendor's active subscription tier
    const vendor = await Vendor.findById(staff.vendorId);
    if (!vendor) {
      console.log(`[Staff] login: FAILED - Associated vendor ${staff.vendorId} not found`);
      return res.status(404).json({ error: { message: "Associated vendor company account does not exist", status: 404 } });
    }

    const session = await issueStaffSession(staff, vendor);
    setRefreshCookie(res, session.refreshToken);

    console.log(`[Staff] login: SUCCESS for ${staff.email} (id: ${staff._id})`);
    return res.json({
      user: session.user,
      accessToken: session.accessToken,
    });
  } catch (err) {
    console.error("[Staff] login: Error", err.message);
    return next(err);
  }
}

/* POST /api/auth/staff/refresh
   Rotates the staff member's refresh token.
   NOTE: This touches ONLY this staff member's session and does NOT touch vendor tokens. */
async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.[config.jwt.cookieName];
    console.log(`[Staff] refresh: Request received. Cookie present: ${Boolean(rawToken)}`);
    if (!rawToken) {
      console.log("[Staff] refresh: Rejected - No refresh cookie");
      return res.status(401).json({ error: { message: "No refresh token cookie", status: 401 } });
    }

    const tokenHash = hashToken(rawToken);
    const row = await RefreshToken.findOne({ tokenHash });

    if (!row) {
      console.log("[Staff] refresh: Rejected - Token not found in DB");
      clearRefreshCookie(res);
      return res.status(401).json({ error: { message: "Invalid refresh token", status: 401 } });
    }

    // Replay attack protection: if revoked token replayed, revoke all tokens for this staff member
    if (row.revokedAt !== null) {
      console.log(`[Staff] refresh: SECURITY ALERT - Revoked token reuse detected for staff ${row.userId}`);
      await RefreshToken.updateMany(
        { userId: row.userId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
      clearRefreshCookie(res);
      return res.status(401).json({ error: { message: "Revoked token reuse detected. Logged out.", status: 401 } });
    }

    // Must belong to staff and not be expired
    if (row.userType !== "staff" || row.expiresAt <= new Date()) {
      console.log(`[Staff] refresh: Rejected - userType is '${row.userType}' (expected 'staff') or expired`);
      clearRefreshCookie(res);
      return res.status(401).json({ error: { message: "Refresh token expired or invalid", status: 401 } });
    }

    // Revoke old staff token
    row.revokedAt = new Date();
    await row.save();

    const staff = await Staff.findById(row.userId);
    if (!staff || staff.status === "disabled") {
      console.log(`[Staff] refresh: Rejected - Staff account disabled or missing`);
      clearRefreshCookie(res);
      return res.status(403).json({ error: { message: "Staff account is disabled or no longer exists", status: 403 } });
    }

    const vendor = await Vendor.findById(staff.vendorId);
    if (!vendor) {
      console.log(`[Staff] refresh: Rejected - Parent company ${staff.vendorId} not found`);
      clearRefreshCookie(res);
      return res.status(404).json({ error: { message: "Parent company account not found", status: 404 } });
    }

    // Issue new staff session (Touches ONLY this staff member's session!)
    const session = await issueStaffSession(staff, vendor);
    setRefreshCookie(res, session.refreshToken);

    console.log(`[Staff] refresh: SUCCESS for ${staff.email} (id: ${staff._id})`);
    return res.json({
      user: session.user,
      accessToken: session.accessToken,
    });
  } catch (err) {
    console.error("[Staff] refresh: Error", err.message);
    return next(err);
  }
}

/* POST /api/auth/staff/logout */
async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.[config.jwt.cookieName];
    console.log(`[Staff] logout: Requested. Cookie present: ${Boolean(rawToken)}`);
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await RefreshToken.updateOne(
        { tokenHash, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
      console.log("[Staff] logout: Revoked token in DB");
    }
    clearRefreshCookie(res);
    console.log("[Staff] logout: Cleared refresh cookie");
    return res.json({ ok: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("[Staff] logout: Error", err.message);
    return next(err);
  }
}

/* POST /api/auth/staff/reset-password
   Staff changes initial/temp password to their own permanent password */
async function resetPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: { message: "New password must be at least 8 characters", status: 400 } });
    }

    const staff = await Staff.findById(req.auth.userId);
    if (!staff) {
      return res.status(404).json({ error: { message: "Staff account not found", status: 404 } });
    }

    staff.password = newPassword;
    staff.status = "active"; // Set status to active once they pick their password
    await staff.save();

    return res.json({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    return next(err);
  }
}

/* GET /api/auth/staff/me */
async function getMe(req, res, next) {
  try {
    const staff = await Staff.findById(req.auth.userId).select("-passwordHash -__v");
    if (!staff) {
      return res.status(404).json({ error: { message: "Staff account not found", status: 404 } });
    }

    const vendor = await Vendor.findById(staff.vendorId).select("vendorName plan");
    return res.json({
      user: req.auth,
      staff,
      vendor,
    });
  } catch (err) {
    return next(err);
  }
}

/* POST /api/auth/staff/forgot-password */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: { message: "Email is required", status: 400 } });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const staff = await Staff.findOne({ email: normalizedEmail });

    if (!staff || staff.status === "disabled") {
      return res.json({
        ok: true,
        message: "If an account exists with that email, a password reset link has been sent.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    staff.resetPasswordToken = token;
    staff.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour validity
    await staff.save();

    const frontendUrl = config.corsOrigin || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}&role=staff`;

    console.log(`[auth] Staff password reset link for ${staff.email}: ${resetUrl}`);

    return res.json({
      ok: true,
      message: "If an account exists with that email, a password reset link has been sent.",
      resetUrl,
    });
  } catch (err) {
    return next(err);
  }
}

/* POST /api/auth/staff/reset-password-token */
async function resetPasswordWithToken(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: { message: "Token and new password are required", status: 400 } });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: { message: "Password must be at least 8 characters", status: 400 } });
    }

    const staff = await Staff.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!staff || staff.status === "disabled") {
      return res.status(400).json({ error: { message: "Password reset token is invalid or has expired", status: 400 } });
    }

    staff.password = password;
    staff.status = "active";
    staff.resetPasswordToken = null;
    staff.resetPasswordExpires = null;
    await staff.save();

    await RefreshToken.updateMany(
      { userId: staff._id, userType: "staff", revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    return res.json({ ok: true, message: "Password has been reset successfully. You can now log in." });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
  refresh,
  logout,
  resetPassword,
  forgotPassword,
  resetPasswordWithToken,
  getMe,
};
