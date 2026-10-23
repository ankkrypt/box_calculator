const express = require("express");
const router = express.Router();
const fluteController = require("../controllers/fluteController");
const { requireAuth, requirePermission } = require("../middleware/auth");

/* All flute routes require authentication (Vendor or Staff) */
router.use(requireAuth);

router.get("/", requirePermission("flute", "read"), fluteController.getFlutes);
router.post("/", requirePermission("flute", "create"), fluteController.createFlute);
router.post("/bulk-delete", requirePermission("flute", "delete"), fluteController.bulkDeleteFlutes);
router.post("/reset", requirePermission("flute", "create"), fluteController.resetFlutes);
router.put("/:id", requirePermission("flute", "update"), fluteController.updateFlute);
router.delete("/:id", requirePermission("flute", "delete"), fluteController.deleteFlute);

module.exports = router;
