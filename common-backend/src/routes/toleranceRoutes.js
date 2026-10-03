const express = require("express");
const router = express.Router();
const toleranceController = require("../controllers/toleranceController");
const { requireAuth } = require("../middleware/auth");

/* All tolerance routes require authentication (Vendor or Staff) */
router.use(requireAuth);

router.get("/", toleranceController.getTolerances);
router.put("/", toleranceController.updateTolerances);
router.post("/reset", toleranceController.resetTolerances);

module.exports = router;
