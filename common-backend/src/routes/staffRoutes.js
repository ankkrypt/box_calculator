const express = require("express");
const router = express.Router();
const staffController = require("../controllers/staffController");
const { requireAuth, requireRole } = require("../middleware/auth");

/* ==========================================================================
   STAFF AUTH ROUTES
   Mounted at: /api/auth/staff
   ========================================================================== */

/* Public Auth */
router.post("/login", staffController.login);
router.post("/refresh", staffController.refresh);
router.post("/logout", staffController.logout);
router.post("/forgot-password", staffController.forgotPassword);
router.post("/reset-password-token", staffController.resetPasswordWithToken);

/* Protected Staff Routes */
router.post("/reset-password", requireAuth, requireRole("staff"), staffController.resetPassword);
router.get("/me", requireAuth, requireRole("staff"), staffController.getMe);

module.exports = router;
