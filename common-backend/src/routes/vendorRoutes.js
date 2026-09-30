const express = require("express");
const router = express.Router();
const vendorController = require("../controllers/vendorController");
const { requireAuth, requireRole } = require("../middleware/auth");

/* ==========================================================================
   VENDOR AUTH ROUTES
   Mounted at: /api/auth/vendor
   ========================================================================== */

/* Public Auth */
router.post("/signup", vendorController.signup);
router.post("/login", vendorController.login);
router.post("/refresh", vendorController.refresh);
router.post("/logout", vendorController.logout);
router.post("/forgot-password", vendorController.forgotPassword);
router.post("/reset-password-token", vendorController.resetPasswordWithToken);

/* Protected Vendor Routes */
router.post("/reset-password", requireAuth, requireRole("vendor"), vendorController.resetPassword);
router.get("/me", requireAuth, requireRole("vendor"), vendorController.getMe);

/* Staff Management by Vendor */
router.post("/invite-staff", requireAuth, requireRole("vendor"), vendorController.inviteStaff);
router.delete("/remove-staff/:id", requireAuth, requireRole("vendor"), vendorController.removeStaff);
router.get("/staff", requireAuth, requireRole("vendor"), vendorController.getStaffList);

module.exports = router;
