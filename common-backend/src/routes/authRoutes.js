const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { requireAuth, requirePermission } = require("../middleware/auth");

/* ==========================================================================
   Unified User Auth Routes
   One User schema holds both vendor and staff accounts. The only difference
   between them is the `role` field and the presence of `vendorId` on staff
   records (vendors are their own company identity). All account operations
   live under /api/auth/user so the URL no longer exposes a vendor/staff
   split. Shared auth flows (login/forgot/reset-token) stay at /api/auth.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Shared auth flows (no user path segment)
   -------------------------------------------------------------------------- */
router.post("/login", userController.login);
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password-token", userController.resetPasswordWithToken);

/* --------------------------------------------------------------------------
   Protected user-account operations
   -------------------------------------------------------------------------- */

// Role-aware password reset: vendors must supply current password;
// staff just set a new one. Single endpoint, branches on req.auth.role.
router.post("/reset-password", requireAuth, userController.resetPassword);
router.post("/user/signup", userController.signup);

router.get("/user/me", requireAuth, userController.getMe);

// Staff management
router.post(
  "/user/invite-staff",
  requireAuth,
  requirePermission("staff", "create"),
  userController.inviteStaff,
);
router.delete(
  "/user/remove-staff/:id",
  requireAuth,
  requirePermission("staff", "delete"),
  userController.removeStaff,
);
router.put(
  "/user/staff/:id",
  requireAuth,
  requirePermission("staff", "update"),
  userController.updateStaff,
);
router.get(
  "/user/staff",
  requireAuth,
  requirePermission("staff", "read"),
  userController.getStaffList,
);

// Account settings (quotation rates).
router.get("/user/settings", requireAuth, requirePermission("quotation", "read"), userController.getSettings);
router.put(
  "/user/settings",
  requireAuth,
  requirePermission("quotation", "update"),
  userController.updateSettings,
);

module.exports = router;
