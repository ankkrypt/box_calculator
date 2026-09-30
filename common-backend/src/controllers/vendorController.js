const crypto = require("crypto");
const Vendor = require("../models/Vendor");
const Staff = require("../models/Staff");
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

async function uniqueSlug(vendorName) {
  const base =
    vendorName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "vendor";
  let slug = base;
  for (let i = 2; await Vendor.exists({ slug }); i += 1) {
    slug = `${base}-${i}`;
  }
  return slug;
}

/* Helper to issue tokens & save refresh session for vendor */
async function issueVendorSession(vendor) {
  const accessToken = signAccessToken({
    userId: vendor._id,
    role: "vendor",
    vendorId: vendor._id,
    plan: vendor.plan || "free",
  });

  const { token, tokenHash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + msFromNow(config.jwt.refreshExpiresIn));

  await RefreshToken.create({
    userId: vendor._id,
    userType: "vendor",
    tokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken: token,
    user: {
      id: vendor._id,
      name: vendor.name,
      email: vendor.email,
      vendorName: vendor.vendorName,
      slug: vendor.slug,
      plan: vendor.plan || "free",
      role: "vendor",
    },
  };
}

/* ==========================================================================
   VENDOR CONTROLLER
   ========================================================================== */

/* POST /api/auth/vendor/signup */
async function signup(req, res, next) {
  try {
    const { name, email, password, vendorName } = req.body;

    if (!name || !email || !password || !vendorName) {
      console.log("[Vendor] signup: Rejected - missing required fields");
      return res.status(400).json({ error: { message: "Missing required fields", status: 400 } });
    }
    if (password.length < 8) {
      console.log("[Vendor] signup: Rejected - password too short");
      return res.status(400).json({ error: { message: "Password must be at least 8 characters", status: 400 } });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[Vendor] signup: Registering ${normalizedEmail}`);
    const emailTaken =
      (await Vendor.exists({ email: normalizedEmail })) ||
      (await Staff.exists({ email: normalizedEmail }));

    if (emailTaken) {
      console.log(`[Vendor] signup: Rejected - email already taken: ${normalizedEmail}`);
      return res.status(409).json({ error: { message: "Email is already registered", status: 409 } });
    }

    const vendor = await Vendor.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      vendorName: vendorName.trim(),
      slug: await uniqueSlug(vendorName),
    });

    const session = await issueVendorSession(vendor);
    setRefreshCookie(res, session.refreshToken);

    console.log(`[Vendor] signup: SUCCESS for ${vendor.email} (id: ${vendor._id})`);
    return res.status(201).json({
      user: session.user,
      accessToken: session.accessToken,
    });
  } catch (err) {
    console.error("[Vendor] signup: Error", err.message);
    return next(err);
  }
}

/* POST /api/auth/vendor/login */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      console.log("[Vendor] login: Rejected - email or password missing");
      return res.status(400).json({ error: { message: "Email and password are required", status: 400 } });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[Vendor] login: Attempt for ${normalizedEmail}`);
    const vendor = await Vendor.findOne({ email: normalizedEmail });
    const ok = vendor && (await vendor.verifyPassword(password));

    if (!ok) {
      console.log(`[Vendor] login: FAILED - Invalid credentials for ${normalizedEmail}`);
      return res.status(401).json({ error: { message: "Invalid email or password", status: 401 } });
    }

    const session = await issueVendorSession(vendor);
    setRefreshCookie(res, session.refreshToken);

    console.log(`[Vendor] login: SUCCESS for ${vendor.email} (id: ${vendor._id})`);
    return res.json({
      user: session.user,
      accessToken: session.accessToken,
    });
  } catch (err) {
    console.error("[Vendor] login: Error", err.message);
    return next(err);
  }
}

/* POST /api/auth/vendor/refresh & /api/auth/refresh */
async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.[config.jwt.cookieName];
    console.log(`[Auth] refresh: Request received. Cookie present: ${Boolean(rawToken)}`);
    if (!rawToken) {
      console.log("[Auth] refresh: Rejected - No refresh token cookie");
      return res.status(401).json({ error: { message: "No refresh token cookie", status: 401 } });
    }

    const tokenHash = hashToken(rawToken);
    const row = await RefreshToken.findOne({ tokenHash });

    if (!row) {
      console.log("[Auth] refresh: Rejected - Token not found in DB");
      clearRefreshCookie(res);
      return res.status(401).json({ error: { message: "Invalid refresh token", status: 401 } });
    }

    // Replay detection: if token is already revoked, kill all sessions for this user
    if (row.revokedAt !== null) {
      console.log(`[Auth] refresh: SECURITY ALERT - Revoked token reuse detected for ${row.userType} ${row.userId}`);
      await RefreshToken.updateMany(
        { userId: row.userId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
      clearRefreshCookie(res);
      return res.status(401).json({ error: { message: "Revoked token reuse detected. Logged out.", status: 401 } });
    }

    if (row.expiresAt <= new Date()) {
      console.log(`[Auth] refresh: Rejected - Token expired for ${row.userType} ${row.userId}`);
      clearRefreshCookie(res);
      return res.status(401).json({ error: { message: "Refresh token expired or invalid", status: 401 } });
    }

    // Revoke old token
    row.revokedAt = new Date();
    await row.save();

    // Staff session refresh branch
    if (row.userType === "staff") {
      const staff = await Staff.findById(row.userId);
      if (!staff || staff.status === "disabled") {
        console.log(`[Auth] refresh: Staff account disabled or missing: ${row.userId}`);
        clearRefreshCookie(res);
        return res.status(403).json({ error: { message: "Staff account is disabled or no longer exists", status: 403 } });
      }
      const vendor = await Vendor.findById(staff.vendorId);
      if (!vendor) {
        console.log(`[Auth] refresh: Staff parent vendor missing: ${staff.vendorId}`);
        clearRefreshCookie(res);
        return res.status(404).json({ error: { message: "Parent company account not found", status: 404 } });
      }
      const accessToken = signAccessToken({
        userId: staff._id,
        role: "staff",
        vendorId: staff.vendorId,
        plan: vendor.plan || "free",
      });
      const { token: newRt, tokenHash: newRtHash } = generateRefreshToken();
      await RefreshToken.create({
        userId: staff._id,
        userType: "staff",
        tokenHash: newRtHash,
        expiresAt: new Date(Date.now() + msFromNow(config.jwt.refreshExpiresIn)),
      });
      setRefreshCookie(res, newRt);
      console.log(`[Auth] refresh: SUCCESS for Staff ${staff.email} (${staff._id})`);
      return res.json({
        user: {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: "staff",
          status: staff.status,
          vendorId: staff.vendorId,
          vendorName: vendor.vendorName || "",
          plan: vendor.plan || "free",
        },
        accessToken,
      });
    }

    // Vendor session refresh branch
    const vendor = await Vendor.findById(row.userId);
    if (!vendor) {
      console.log(`[Auth] refresh: Rejected - Vendor account ${row.userId} no longer exists`);
      clearRefreshCookie(res);
      return res.status(401).json({ error: { message: "Vendor account no longer exists", status: 401 } });
    }

    const session = await issueVendorSession(vendor);
    setRefreshCookie(res, session.refreshToken);

    console.log(`[Auth] refresh: SUCCESS for Vendor ${vendor.email} (id: ${vendor._id})`);
    return res.json({
      user: session.user,
      accessToken: session.accessToken,
    });
  } catch (err) {
    console.error("[Auth] refresh: Error", err.message);
    return next(err);
  }
}

/* POST /api/auth/vendor/logout */
async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.[config.jwt.cookieName];
    console.log(`[Auth] logout: Requested. Cookie present: ${Boolean(rawToken)}`);
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await RefreshToken.updateOne(
        { tokenHash, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
      console.log("[Auth] logout: Revoked token in DB");
    }
    clearRefreshCookie(res);
    console.log("[Auth] logout: Cleared refresh cookie");
    return res.json({ ok: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("[Auth] logout: Error", err.message);
    return next(err);
  }
}

/* POST /api/auth/vendor/reset-password */
async function resetPassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: { message: "Both old and new passwords are required", status: 400 } });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: { message: "New password must be at least 8 characters", status: 400 } });
    }

    const vendor = await Vendor.findById(req.auth.userId);
    if (!vendor) {
      return res.status(404).json({ error: { message: "Vendor account not found", status: 404 } });
    }

    const isMatch = await vendor.verifyPassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ error: { message: "Incorrect current password", status: 401 } });
    }

    vendor.password = newPassword;
    await vendor.save();

    return res.json({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    return next(err);
  }
}

/* POST /api/auth/vendor/invite-staff */
async function inviteStaff(req, res, next) {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: { message: "Staff email is required", status: 400 } });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailTaken =
      (await Vendor.exists({ email: normalizedEmail })) ||
      (await Staff.exists({ email: normalizedEmail }));

    if (emailTaken) {
      return res.status(409).json({ error: { message: "Email is already registered", status: 409 } });
    }

    // Staff initial credentials: username = email, password = email
    const staff = await Staff.create({
      vendorId: req.auth.userId, // Links staff directly to this vendor
      invitedBy: req.auth.userId,
      name: (name || "").trim(),
      email: normalizedEmail,
      password: normalizedEmail, // Temporary password is their email
      status: "invited",
    });

    return res.status(201).json({
      message: "Staff invited successfully",
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        status: staff.status,
        vendorId: staff.vendorId,
        createdAt: staff.createdAt,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/* DELETE /api/auth/vendor/remove-staff/:id */
async function removeStaff(req, res, next) {
  try {
    const staffId = req.params.id;
    const staff = await Staff.findOneAndDelete({
      _id: staffId,
      vendorId: req.auth.userId, // Vendor can only delete their own staff
    });

    if (!staff) {
      return res.status(404).json({ error: { message: "Staff member not found", status: 404 } });
    }

    // Invalidate any active refresh tokens for the deleted staff member
    await RefreshToken.deleteMany({ userId: staffId, userType: "staff" });

    return res.json({ ok: true, message: `Staff member ${staff.email} removed successfully` });
  } catch (err) {
    return next(err);
  }
}

/* GET /api/auth/vendor/staff */
async function getStaffList(req, res, next) {
  try {
    const list = await Staff.find({ vendorId: req.auth.userId })
      .select("-passwordHash -__v")
      .sort({ createdAt: -1 });

    return res.json({ staff: list });
  } catch (err) {
    return next(err);
  }
}

/* GET /api/auth/vendor/me */
async function getMe(req, res, next) {
  try {
    const vendor = await Vendor.findById(req.auth.userId).select("-passwordHash -__v");
    if (!vendor) {
      return res.status(404).json({ error: { message: "Vendor not found", status: 404 } });
    }
    return res.json({ user: req.auth, vendor });
  } catch (err) {
    return next(err);
  }
}

/* POST /api/auth/vendor/forgot-password */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: { message: "Email is required", status: 400 } });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const vendor = await Vendor.findOne({ email: normalizedEmail });

    // Consistent response to protect against user enumeration
    if (!vendor) {
      return res.json({
        ok: true,
        message: "If an account exists with that email, a password reset link has been sent.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    vendor.resetPasswordToken = token;
    vendor.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour validity
    await vendor.save();

    const frontendUrl = config.corsOrigin || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}&role=vendor`;

    console.log(`[auth] Vendor password reset link for ${vendor.email}: ${resetUrl}`);

    return res.json({
      ok: true,
      message: "If an account exists with that email, a password reset link has been sent.",
      resetUrl,
    });
  } catch (err) {
    return next(err);
  }
}

/* POST /api/auth/vendor/reset-password-token */
async function resetPasswordWithToken(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: { message: "Token and new password are required", status: 400 } });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: { message: "Password must be at least 8 characters", status: 400 } });
    }

    const vendor = await Vendor.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!vendor) {
      return res.status(400).json({ error: { message: "Password reset token is invalid or has expired", status: 400 } });
    }

    vendor.password = password;
    vendor.resetPasswordToken = null;
    vendor.resetPasswordExpires = null;
    await vendor.save();

    await RefreshToken.updateMany(
      { userId: vendor._id, userType: "vendor", revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    return res.json({ ok: true, message: "Password has been reset successfully. You can now log in." });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  signup,
  login,
  refresh,
  logout,
  resetPassword,
  forgotPassword,
  resetPasswordWithToken,
  inviteStaff,
  removeStaff,
  getStaffList,
  getMe,
};
