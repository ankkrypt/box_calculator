const express = require("express");
const router = express.Router();
const reelController = require("../controllers/reelController");
const { requireAuth } = require("../middleware/auth");

/* All reel routes require authentication (Vendor or Staff) */
router.use(requireAuth);

router.get("/", reelController.getReels);
router.post("/", reelController.createReel);
router.post("/bulk-delete", reelController.bulkDeleteReels);
router.put("/:id", reelController.updateReel);
router.delete("/:id", reelController.deleteReel);

module.exports = router;
