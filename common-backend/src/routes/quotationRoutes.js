const express = require("express");
const router = express.Router();
const quotationController = require("../controllers/quotationController");
const { requireAuth, requirePermission } = require("../middleware/auth");

/* All quotation endpoints require active authentication (vendor or staff) */
router.use(requireAuth);

/* GET /api/quotation - get vendor's quotation rates (accessible to vendor & staff with read permission) */
router.get("/", requirePermission("quotation", "read"), quotationController.getQuotation);
router.get("/latest", requirePermission("quotation", "read"), quotationController.getLatestQuotation);

/* PUT /api/quotation - update vendor's quotation rates */
router.put("/", requirePermission("quotation", "update"), quotationController.updateQuotation);

/* POST /api/quotation/calculate - compute packaging outputs */
router.post("/calculate", requirePermission("quotation", "read"), quotationController.calculateQuotationOutputs);

module.exports = router;
