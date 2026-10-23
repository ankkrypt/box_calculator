const crypto = require("crypto");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const Quotation = require("../models/Quotation");
const ScoreTolerance = require("../models/ScoreTolerance");
const Flute = require("../models/Flute");
const PaperGrade = require("../models/PaperGrade");
const VendorCompany = require("../models/VendorCompany");
const { DEFAULT_TOLERANCES } = require("./toleranceController");
const { DEFAULT_FLUTES } = require("./fluteController");
const { DEFAULT_PAPER_GRADES } = require("./paperGradeController");
const config = require("../config/env");
const {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  msFromNow,
  setRefreshCookie,
  clearRefreshCookie,
} = require("../utils/token");
const sendEmail = require("../utils/nodemailer");

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

async function findUserByEmail(normalizedEmail) {
  return User.findOne({ email: normalizedEmail });
}

async function findActiveStaffByEmail(normalizedEmail) {
  return User.findOne({
    email: normalizedEmail,
    role: "staff",
  }).sort({ createdAt: 1 });
}

async function findVendorById(id) {
  return User.findById(id);
}

async function findStaffById(id) {
  return User.findById(id);
}/* Issue an access token + refresh session + cookie for a vendor user.
   A vendor's own _id is their company identity. */
async function issueVendorSession(user) {
  const accessToken = signAccessToken({
    userId: user._id,
    role: "vendor",
    vendorId: user._id,
    plan: user.plan || "free",
    // Vendor: full access. Not needed but harmless to include.
    // Permissions map is only meaningful for staff users.
    permissions: new Map(),
  });

  const { token, tokenHash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + msFromNow(config.jwt.refreshExpiresIn));

  await RefreshToken.create({
    userId: user._id,
    userType: "vendor",
    tokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken: token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      plan: user.plan || "free",
      role: "vendor",
    },
  };
}

/* Issue an access token + refresh session + cookie for a staff user.
   Staff inherit the owning vendor's active subscription tier. */
async function issueStaffSession(staff, vendor) {
  // Fetch the staff's permissions from the database and include them
  // in the JWT so requirePermission() middleware can validate access
  // without an extra DB query per request.
  const staffUser = await User.findById(staff._id).select("permissions");

  const accessToken = signAccessToken({
    userId: staff._id,
    role: "staff",
    vendorId: staff.vendorId,
    plan: vendor ? vendor.plan || "free" : "free",
    // Include the staff's permissions map in the JWT for route-level
    // permission checks in requirePermission() middleware.
    permissions: staffUser ? staffUser.permissions : new Map(),
  });

  const { token, tokenHash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + msFromNow(config.jwt.refreshExpiresIn));

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
      vendorId: staff.vendorId,
      plan: vendor ? vendor.plan || "free" : "free",
    },
  };
}

function emailTakenAcrossUsers(normalizedEmail) {
  return User.exists({ email: normalizedEmail });
}

/* --------------------------------------------------------------------------
   AUTH: SIGNUP / LOGIN / REFRESH / LOGOUT
   -------------------------------------------------------------------------- */

/* POST /api/auth/user/signup */
async function signup(req, res, next) {
  try {
    const { name, email, password, vendorName } = req.body;

    if (!name || !email || !password || !vendorName) {
      console.log("[User] signup: Rejected - missing required fields");
      return res.status(400).json({ error: { message: "Missing required fields", status: 400 } });
    }
    if (password.length < 8) {
      console.log("[User] signup: Rejected - password too short");
      return res.status(400).json({ error: { message: "Password must be at least 8 characters", status: 400 } });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[User] signup: Registering ${normalizedEmail}`);

    if (await emailTakenAcrossUsers(normalizedEmail)) {
      console.log(`[User] signup: Rejected - email already taken: ${normalizedEmail}`);
      return res.status(409).json({ error: { message: "Email is already registered", status: 409 } });
    }

    // 1. Create the vendor user first
    const vendor = await User.create({
      role: "vendor",
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    // 2. Create the VendorCompany linked to the vendor
    await VendorCompany.create({
      vendorId: vendor._id,
      name: vendorName.trim(),
    });

    // Bootstrap default configurations ONLY during signup:
    // 1. Default quotation rates
    await Quotation.create({
      vendorId: vendor._id,
      conversion: 2,
      profitMargin: 10,
      tax: 5,
      discount: 0,
    });

    // 2. Default score tolerances
    await ScoreTolerance.create({
      vendorId: vendor._id,
      tolerances: DEFAULT_TOLERANCES,
    });

    // 3. Default flutes table
    const initialFlutes = DEFAULT_FLUTES.map((f) => ({
      ...f,
      vendorId: vendor._id,
    }));
    await Flute.insertMany(initialFlutes);

    // 4. Default paper grades
    const initialPapers = DEFAULT_PAPER_GRADES.map((p) => ({
      ...p,
      vendorId: vendor._id,
    }));
    await PaperGrade.insertMany(initialPapers);

    const session = await issueVendorSession(vendor);
    setRefreshCookie(res, session.refreshToken);

    console.log(`[User] signup: SUCCESS for ${vendor.email} (id: ${vendor._id})`);
    return res.status(201).json({
      user: session.user,
      accessToken: session.accessToken,
    });
  } catch (err) {
    console.error("[User] signup: Error", err.message);
    return next(err);
  }
}

/* POST /api/auth/login
   Single login entrypoint for the unified User account (vendor or staff).
   Issues a role-appropriate session. */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      console.log("[User] login: Rejected - email or password missing");
      return res.status(400).json({ error: { message: "Email and password are required", status: 400 } });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[User] login: Attempt for ${normalizedEmail}`);

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      console.log(`[User] login: FAILED - No account found for ${normalizedEmail}`);
      return res.status(404).json({ error: { message: "User not found", status: 404 } });
    }

    if (!(await user.verifyPassword(password))) {
      console.log(`[User] login: FAILED - Wrong password for ${normalizedEmail}`);
      return res.status(401).json({ error: { message: "Incorrect password", status: 401 } });
    }

    if (user.role === "vendor") {
      const session = await issueVendorSession(user);
      setRefreshCookie(res, session.refreshToken);
      console.log(`[User] login: SUCCESS for vendor ${user.email} (id: ${user._id})`);
      return res.json({ user: session.user, accessToken: session.accessToken });
    }

    const vendor = await findVendorById(user.vendorId);
    if (!vendor) {
      console.log(`[User] login: FAILED - Staff vendor missing for ${normalizedEmail}`);
      return res.status(404).json({ error: { message: "Associated vendor company account is missing", status: 404 } });
    }

    const session = await issueStaffSession(user, vendor);
    setRefreshCookie(res, session.refreshToken);
    console.log(`[User] login: SUCCESS for staff ${user.email} (id: ${user._id})`);
    return res.json({ user: session.user, accessToken: session.accessToken });
  } catch (err) {
    console.error("[User] login: Error", err.message);
    return next(err);
  }
}

/* POST /api/auth/refresh (shared).
   Single refresh entrypoint keyed off the refresh-token row's userType,
   with the owning User doc driving role-specific behavior. */
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

    // --- Staff session refresh ---
    if (row.userType === "staff") {
      const staff = await findStaffById(row.userId);
      if (!staff) {
        console.log(`[Auth] refresh: Staff account missing: ${row.userId}`);
        clearRefreshCookie(res);
        return res.status(403).json({ error: { message: "Staff account no longer exists", status: 403 } });
      }
      const vendor = await findVendorById(staff.vendorId);
      if (!vendor) {
        console.log(`[Auth] refresh: Staff parent vendor missing: ${staff.vendorId}`);
        clearRefreshCookie(res);
        return res.status(404).json({ error: { message: "Parent company account not found", status: 404 } });
      }

      const session = await issueStaffSession(staff, vendor);
      setRefreshCookie(res, session.refreshToken);
      console.log(`[Auth] refresh: SUCCESS for Staff ${staff.email} (${staff._id})`);
      return res.json({ user: session.user, accessToken: session.accessToken });
    }

    // --- Vendor session refresh ---
    const vendor = await findVendorById(row.userId);
    if (!vendor) {
      console.log(`[Auth] refresh: Rejected - Vendor account ${row.userId} no longer exists`);
      clearRefreshCookie(res);
      return res.status(401).json({ error: { message: "Vendor account no longer exists", status: 401 } });
    }

    const session = await issueVendorSession(vendor);
    setRefreshCookie(res, session.refreshToken);
    console.log(`[Auth] refresh: SUCCESS for Vendor ${vendor.email} (id: ${vendor._id})`);
    return res.json({ user: session.user, accessToken: session.accessToken });
  } catch (err) {
    console.error("[Auth] refresh: Error", err.message);
    return next(err);
  }
}

/* POST /api/auth/logout (shared). */
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

/* --------------------------------------------------------------------------
   PASSWORD RESET FLOWS (role-aware)
   -------------------------------------------------------------------------- */

/* POST /api/auth/reset-password
   Role-aware password reset on the unified User account.
     - vendor: must supply current password (owner-only operation).
     - staff: set a new permanent password (no current-password check).
   Single endpoint replaces the old vendor/staff reset-password split. */
async function resetPassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: { message: "New password must be at least 8 characters", status: 400 } });
    }

    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(404).json({ error: { message: "Account not found", status: 404 } });
    }

    if (user.role === "vendor") {
      if (!oldPassword) {
        return res.status(400).json({ error: { message: "Old password is required for vendor accounts", status: 400 } });
      }
      const isMatch = await user.verifyPassword(oldPassword);
      if (!isMatch) {
        return res.status(401).json({ error: { message: "Current password is incorrect", status: 401 } });
      }
    } else if (user.role !== "staff") {
      return res.status(403).json({ error: { message: "Unsupported account role", status: 403 } });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    return next(err);
  }
}

/* POST /api/auth/forgot-password
   Searches the user by email directly and dispatches a password reset email. */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: { message: "Email is required", status: 400 } });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(404).json({ error: { message: "No account found with that email address", status: 404 } });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour expiration
    await user.save();

    const frontendUrl = config.corsOrigin || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
    console.log(`[auth] Password reset link for ${user.email}: ${resetUrl}`);

    await sendEmail({
      toEmail: user.email,
      subject: "Reset your BoxCalc password",
      body: `Hello ${user.name || "there"},<br/><br/>We received a request to reset your password. Click the button below to choose a new password. This link is valid for 1 hour.<br/><br/>If you did not request this, you can safely ignore this email.`,
      button: {
        text: "Reset Password",
        link: resetUrl,
      },
    });

    return res.json({
      ok: true,
      message: "Password reset link sent to your email",
      resetUrl,
    });
  } catch (err) {
    return next(err);
  }
}

/* POST /api/auth/reset-password-token
   Validates the reset token and updates the user's password. */
async function resetPasswordWithToken(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: { message: "Token and new password are required", status: 400 } });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: { message: "Password must be at least 8 characters", status: 400 } });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: { message: "Invalid or expired reset token", status: 400 } });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    await RefreshToken.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    return res.json({ ok: true, message: "Password has been reset successfully. You can now log in." });
  } catch (err) {
    return next(err);
  }
}

/* --------------------------------------------------------------------------
   STAFF MANAGEMENT
   -------------------------------------------------------------------------- */

/* POST /api/auth/user/invite-staff (vendor or staff with staff.create permission) */
async function inviteStaff(req, res, next) {
  try {
    if (!req.auth) {
      return res.status(401).json({ error: { message: "Authentication required", status: 401 } });
    }

    // Check if the user is a vendor; if not, check if they have staff.create permission
    let isPermitted = req.auth.role === "vendor";

    if (!isPermitted) {
      const staffPerms = req.auth.permissions?.get
        ? req.auth.permissions.get("staff")
        : req.auth.permissions?.staff;

      if (staffPerms?.create === true) {
        isPermitted = true;
      } else {
        const currentUser = await User.findById(req.auth.userId).select("role permissions vendorId");
        if (currentUser?.role === "vendor" || currentUser?.permissions?.staff?.create === true) {
          isPermitted = true;
        }
      }
    }

    if (!isPermitted) {
      return res.status(403).json({ error: { message: "Insufficient permissions to invite staff", status: 403 } });
    }

    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: { message: "Staff email is required", status: 400 } });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (await emailTakenAcrossUsers(normalizedEmail)) {
      return res.status(409).json({ error: { message: "Email is already registered", status: 409 } });
    }

    const targetVendorId = req.auth.role === "vendor" ? req.auth.userId : req.auth.vendorId;
    if (!targetVendorId) {
      return res.status(400).json({ error: { message: "Vendor not found", status: 400 } });
    }

    // Default permissions for staff (customizable via req.body.permissions)
    const defaultPermissions = {
      reel: { create: true, read: true, update: true, delete: false },
      flute: { create: true, read: true, update: true, delete: true },
      tolerance: { create: true, read: true, update: true, delete: true },
      paper: { create: true, read: true, update: true, delete: true },
      order: { create: true, read: true, update: true, delete: false },
      staff: { create: false, read: false, update: false, delete: false },
      quotation: { create: false, read: true, update: false, delete: false },
      vendorCompany: { create: false, read: true, update: false, delete: false },
    };

    const permissions = {
      reel: { ...defaultPermissions.reel, ...(req.body.permissions?.reel || {}) },
      flute: { ...defaultPermissions.flute, ...(req.body.permissions?.flute || {}) },
      tolerance: { ...defaultPermissions.tolerance, ...(req.body.permissions?.tolerance || {}) },
      paper: { ...defaultPermissions.paper, ...(req.body.permissions?.paper || {}) },
      order: { ...defaultPermissions.order, ...(req.body.permissions?.order || {}) },
      staff: { ...defaultPermissions.staff, ...(req.body.permissions?.staff || {}) },
      quotation: { ...defaultPermissions.quotation, ...(req.body.permissions?.quotation || {}) },
      vendorCompany: { ...defaultPermissions.vendorCompany, ...(req.body.permissions?.vendorCompany || {}) },
    };

    const staff = await User.create({
      role: "staff",
      vendorId: targetVendorId,
      name: (name || "").trim(),
      email: normalizedEmail,
      password: normalizedEmail,
      permissions,
    });

    // Send invitation email with login credentials
    const frontendUrl = config.corsOrigin || "http://localhost:3000";
    const loginUrl = `${frontendUrl}/auth`;

    const inviter = req.auth.userId
      ? await User.findById(req.auth.userId).select("name company")
      : null;
    const inviterName = inviter?.company || inviter?.name || "your organization";

    await sendEmail({
      toEmail: staff.email,
      subject: "You've been invited to BoxCalc",
      body: `Hello ${staff.name || "there"},<br/><br/>You have been invited by <b>${inviterName}</b> to join BoxCalc as a staff member.<br/><br/><b>Login Email:</b> ${staff.email}<br/><b>Temporary Password:</b> ${normalizedEmail}<br/><br/>Click the button below to log in to your account. We recommend updating your password once logged in.`,
      button: {
        text: "Log In",
        link: loginUrl,
      },
    });

    return res.status(201).json({
      message: "Staff invited successfully",
    });
  } catch (err) {
    return next(err);
  }
}

/* DELETE /api/auth/user/remove-staff/:id */
async function removeStaff(req, res, next) {
  try {
    const staffId = req.params.id;
    const targetVendorId = req.auth.role === "vendor" ? req.auth.userId : req.auth.vendorId;

    const staff = await User.findOneAndDelete({
      _id: staffId,
      role: "staff",
      vendorId: targetVendorId,
    });

    if (!staff) {
      return res.status(404).json({ error: { message: "Staff member not found", status: 404 } });
    }

    await RefreshToken.deleteMany({ userId: staffId, userType: "staff" });

    // Fetch the name of the person who removed the staff member
    const remover = req.auth.userId
      ? await User.findById(req.auth.userId).select("name company")
      : null;
    const removerName = remover?.name || remover?.company || "an administrator";

    // Send removal notification email
    await sendEmail({
      toEmail: staff.email,
      subject: "Workspace Access Revoked",
      body: `Hello ${staff.name || "there"},<br/><br/>Your staff access to the BoxCalc workspace has been revoked by <b>${removerName}</b>.<br/><br/>If you believe this was done in error, please reach out to your administrator.`,
    });

    return res.json({ ok: true, message: `Staff member ${staff.email} removed successfully` });
  } catch (err) {
    return next(err);
  }
}

/* PUT /api/auth/user/staff/:id */
async function updateStaff(req, res, next) {
  try {
    const staffId = req.params.id;
    const { permissions, name, email } = req.body;
    const targetVendorId = req.auth.role === "vendor" ? req.auth.userId : req.auth.vendorId;

    const staff = await User.findOne({
      _id: staffId,
      role: "staff",
      vendorId: targetVendorId,
    });

    if (!staff) {
      return res.status(404).json({ error: { message: "Staff member not found", status: 404 } });
    }

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ error: { message: "Name cannot be empty", status: 400 } });
      }
      staff.name = trimmedName;
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).toLowerCase().trim();
      if (!normalizedEmail) {
        return res.status(400).json({ error: { message: "Email cannot be empty", status: 400 } });
      }
      if (normalizedEmail !== staff.email) {
        const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: staffId } });
        if (existing) {
          return res.status(409).json({ error: { message: "Email is already registered", status: 409 } });
        }
        staff.email = normalizedEmail;
      }
    }

    if (permissions && typeof permissions === "object") {
      staff.permissions = {
        reel: { ...(staff.permissions?.reel || {}), ...(permissions.reel || {}) },
        flute: { ...(staff.permissions?.flute || {}), ...(permissions.flute || {}) },
        tolerance: { ...(staff.permissions?.tolerance || {}), ...(permissions.tolerance || {}) },
        paper: { ...(staff.permissions?.paper || {}), ...(permissions.paper || {}) },
        order: { ...(staff.permissions?.order || {}), ...(permissions.order || {}) },
        staff: { ...(staff.permissions?.staff || {}), ...(permissions.staff || {}) },
        quotation: { ...(staff.permissions?.quotation || {}), ...(permissions.quotation || {}) },
        vendorCompany: { ...(staff.permissions?.vendorCompany || {}), ...(permissions.vendorCompany || {}) },
      };
      staff.markModified("permissions");
    }

    await staff.save();

    return res.json({ staff, message: "Staff updated successfully" });
  } catch (err) {
    return next(err);
  }
}


/* GET /api/auth/user/staff (vendor only) */
async function getStaffList(req, res, next) {
  try {
    const list = await User.find({
      role: "staff",
      vendorId: req.auth.userId,
    })
      .select("-password -__v")
      .sort({ createdAt: -1 });

    return res.json({ staff: list });
  } catch (err) {
    return next(err);
  }
}

/* --------------------------------------------------------------------------
   ME ENDPOINTS (role-gated)
   -------------------------------------------------------------------------- */

/* GET /api/auth/user/me
   Unifiedprofile endpoint for the authenticated User (vendor or staff).
   Returns the role-appropriate shape so existing consumers keep working:
     - vendor: { user, account }
     - staff:  { user, staff, vendor }
   The route is protected; branching is purely on req.auth.role. */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.auth.userId).select("-password -__v");
    if (!user) {
      return res.status(404).json({ error: { message: "Account not found", status: 404 } });
    }

    if (user.role === "vendor") {
      return res.json({ user: req.auth, account: user });
    }

    if (user.role === "staff") {
      const vendor = await findVendorById(user.vendorId).select("plan");
      return res.json({
        user: req.auth,
        staff: user,
        vendor: vendor ? { plan: vendor.plan } : null,
      });
    }

    return res.status(403).json({ error: { message: "Unsupported account role", status: 403 } });
  } catch (err) {
    return next(err);
  }
}

/* PUT /api/auth/user/me
   Allows the authenticated user (vendor or staff) to update their own name and email. */
async function updateMe(req, res, next) {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(404).json({ error: { message: "Account not found", status: 404 } });
    }

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ error: { message: "Name cannot be empty", status: 400 } });
      }
      user.name = trimmedName;
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).toLowerCase().trim();
      if (!normalizedEmail) {
        return res.status(400).json({ error: { message: "Email cannot be empty", status: 400 } });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({ error: { message: "Invalid email format", status: 400 } });
      }
      if (normalizedEmail !== user.email) {
        const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
        if (existing) {
          return res.status(409).json({ error: { message: "Email is already registered", status: 409 } });
        }
        user.email = normalizedEmail;
      }
    }

    await user.save();

    return res.json({ ok: true, message: "Profile updated successfully" });
  } catch (err) {
    return next(err);
  }
}

/* --------------------------------------------------------------------------
   SETTINGS (quotation rates)
   -------------------------------------------------------------------------- */

/* GET /api/auth/user/settings — readable by any authenticated user.
   Reads quotation rates from the Quotation collection for the authenticated
   vendor context (vendorId from the JWT). */
async function getSettings(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const quote = await Quotation.findOne({ vendorId });

    const conv = quote ? Number(quote.conversion) : 0;
    const marg = quote ? Number(quote.profitMargin) : 0;
    const tax = quote ? Number(quote.tax) : 0;
    const discount = quote ? Number(quote.discount) : 0;

    return res.json({
      settings: {
        conv,
        marg,
        tax,
        discount,
        conversion: conv,
        profitMargin: marg,
        conversionRate: conv,
        defaultMarginPct: marg,
        gstPct: tax,
      },
      role: req.auth.role,
    });
  } catch (err) {
    return next(err);
  }
}

/* PUT /api/auth/user/settings — vendor only.
   Updates quotation rates in the Quotation collection. */
async function updateSettings(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const {
      conv, marg, tax, discount,
      conversion, profitMargin, conversionRate,
      defaultMarginPct, gstPct,
    } = req.body;

    const convVal = conv !== undefined ? Number(conv)
      : conversion !== undefined ? Number(conversion)
      : conversionRate !== undefined ? Number(conversionRate)
      : undefined;
    const margVal = marg !== undefined ? Number(marg)
      : profitMargin !== undefined ? Number(profitMargin)
      : defaultMarginPct !== undefined ? Number(defaultMarginPct)
      : undefined;
    const taxVal = tax !== undefined ? Number(tax)
      : gstPct !== undefined ? Number(gstPct)
      : undefined;
    const discVal = discount !== undefined ? Number(discount) : undefined;

    const updateFields = {};
    if (convVal !== undefined && convVal >= 0) updateFields.conversion = convVal;
    if (margVal !== undefined && margVal >= 0 && margVal <= 100) updateFields.profitMargin = margVal;
    if (taxVal !== undefined && taxVal >= 0 && taxVal <= 100) updateFields.tax = taxVal;
    if (discVal !== undefined && discVal >= 0 && discVal <= 100) updateFields.discount = discVal;

    const quote = await Quotation.findOneAndUpdate(
      { vendorId },
      { $set: updateFields },
      { upsert: true, new: true, setDefaultsOnInsert: false }
    );

    return res.json({
      ok: true,
      message: "Quotation rates updated successfully",
      settings: {
        conv: quote.conversion,
        marg: quote.profitMargin,
        tax: quote.tax,
        discount: quote.discount,
        conversion: quote.conversion,
        profitMargin: quote.profitMargin,
        conversionRate: quote.conversion,
        defaultMarginPct: quote.profitMargin,
        gstPct: quote.tax,
      },
    });
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
  updateStaff,
  getStaffList,
  getMe,
  updateMe,
  getSettings,
  updateSettings,
};
