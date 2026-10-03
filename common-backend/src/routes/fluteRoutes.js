const express = require("express");
const router = express.Router();
const fluteController = require("../controllers/fluteController");
const { requireAuth } = require("../middleware/auth");

/* All flute routes require authentication (Vendor or Staff) */
router.use(requireAuth);

router.get("/", fluteController.getFlutes);
router.post("/", fluteController.createFlute);
router.post("/bulk-delete", fluteController.bulkDeleteFlutes);
router.post("/reset", fluteController.resetFlutes);
router.put("/:id", fluteController.updateFlute);
router.delete("/:id", fluteController.deleteFlute);

module.exports = router;
