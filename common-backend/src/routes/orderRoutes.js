const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

/* POST /api/orders - confirm new order */
router.post("/", orderController.createOrder);

/* GET /api/orders - list vendor confirmed order history */
router.get("/", orderController.getOrders);

/* GET /api/orders/:id - get single order */
router.get("/:id", orderController.getOrderById);

module.exports = router;
