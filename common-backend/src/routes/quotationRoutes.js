const express = require("express");
const router = express.Router();
const quotationController = require("../controllers/quotationController");
const { requireAuth, requireRole } = require("../middleware/auth");

/* All quotation endpoints require active authentication (vendor or staff) */
router.use(requireAuth);

/* GET /api/quotation - get vendor's quotation rates (accessible to vendor & staff) */
router.get("/", quotationController.getQuotation);
router.get("/latest", quotationController.getLatestQuotation);

/* PUT /api/quotation - update vendor's quotation rates (vendor only) */
router.put("/", requireRole("vendor"), quotationController.updateQuotation);

/* POST /api/quotation/calculate - compute packaging outputs */
router.post("/calculate", quotationController.calculateQuotationOutputs);

module.exports = router;
