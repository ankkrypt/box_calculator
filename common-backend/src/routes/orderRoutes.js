const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { requireAuth, requirePermission } = require("../middleware/auth");

router.use(requireAuth);

/* POST /api/orders - confirm new order */
router.post("/", requirePermission("order", "create"), orderController.createOrder);

/* GET /api/orders - list vendor confirmed order history */
router.get("/", requirePermission("order", "read"), orderController.getOrders);

/* GET /api/orders/:id - get single order */
router.get("/:id", requirePermission("order", "read"), orderController.getOrderById);

module.exports = router;
