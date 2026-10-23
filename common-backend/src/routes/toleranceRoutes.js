const express = require("express");
const router = express.Router();
const toleranceController = require("../controllers/toleranceController");
const { requireAuth, requirePermission } = require("../middleware/auth");

/* All tolerance routes require authentication (Vendor or Staff) */
router.use(requireAuth);

router.get("/", requirePermission("tolerance", "read"), toleranceController.getTolerances);
router.put("/", requirePermission("tolerance", "update"), toleranceController.updateTolerances);
router.post("/reset", requirePermission("tolerance", "update"), toleranceController.resetTolerances);

module.exports = router;
