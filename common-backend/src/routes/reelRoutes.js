const express = require("express");
const router = express.Router();
const reelController = require("../controllers/reelController");
const { requireAuth, requirePermission } = require("../middleware/auth");

/* All reel routes require authentication (Vendor or Staff) */
router.use(requireAuth);

router.get("/", requirePermission("reel", "read"), reelController.getReels);
router.post("/", requirePermission("reel", "create"), reelController.createReel);
router.post("/bulk-delete", requirePermission("reel", "delete"), reelController.bulkDeleteReels);
router.put("/:id", requirePermission("reel", "update"), reelController.updateReel);
router.delete("/:id", requirePermission("reel", "delete"), reelController.deleteReel);

module.exports = router;
