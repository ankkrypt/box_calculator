const Order = require("../models/Order");
const Quotation = require("../models/Quotation");
const { calculateQuotation } = require("../utils/calculator");

/**
 * POST /api/orders
 * Confirms and saves a new order.
 * Accessible to Vendor and Staff.
 * Staff can edit transport and discount for this order without modifying quotation.discount.
 */
async function createOrder(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    if (!vendorId) {
      return res.status(400).json({ error: { message: "Vendor context missing", status: 400 } });
    }

    const { order: boxData = {}, board = {}, pricing = {} } = req.body;

    // 1. Fetch vendor company locked quotation rates
    const quote = await Quotation.findOne({ vendorId });
    const conv = quote ? Number(quote.conversion) : 2;
    const marg = quote ? Number(quote.profitMargin) : 10;
    const tax = quote ? Number(quote.tax) : 5;

    // 2. Order-specific transport and discount
    const trans =
      pricing.trans !== undefined && pricing.trans !== null
        ? Number(pricing.trans)
        : 3500;

    const discount =
      pricing.discount !== undefined && pricing.discount !== null
        ? Number(pricing.discount)
        : quote?.discount !== undefined
        ? Number(quote.discount)
        : 0;

    const extra =
      pricing.extra !== undefined && pricing.extra !== null
        ? Number(pricing.extra)
        : board.extra !== undefined && board.extra !== null
        ? Number(board.extra)
        : 5;

    const resolvedPricing = {
      conv,
      marg,
      tax,
      discount,
      trans,
      extra,
      wastagePct: extra,
    };

    // 3. Compute outputs
    const calculated = calculateQuotation({
      order: boxData,
      board: {
        ...board,
        extra,
      },
      pricing: resolvedPricing,
    });

    const finalOrderPrice = calculated.quote?.finalOrderPrice || 0;

    // 4. Generate sequential order number per vendor
    const count = await Order.countDocuments({ vendorId });
    const orderNumber = `ORD-${String(count + 1).padStart(4, "0")}`;

    // 5. Persist order in MongoDB
    const newOrder = await Order.create({
      vendorId,
      orderNumber,
      createdBy: req.auth.userId,
      createdByName: req.auth.name || (req.auth.role === "vendor" ? "Vendor Owner" : "Staff Member"),
      createdByType: req.auth.role || "vendor",
      box: {
        type: boxData.type || "rsc",
        L: Number(boxData.L) || 400,
        W: Number(boxData.W) || 300,
        H: Number(boxData.H) || 250,
        Q: Number(boxData.Q) || 1000,
        J: Number(boxData.J) || 35,
        unit: boxData.unit || "mm",
      },
      board: {
        ply: Number(board.ply) || 5,
        plies: Array.isArray(board.plies) ? board.plies : [],
        flutes: Array.isArray(board.flutes) ? board.flutes : [],
        tolerances: {
          tolAll: Number(board.tolAll) || 12,
          tolRows: board.tolRows || {},
        },
        extra,
      },
      pricing: resolvedPricing,
      outputs: calculated,
      finalOrderPrice,
      status: "confirmed",
    });

    console.log(`[ORDER CONFIRMED] ${orderNumber} (ID: ${newOrder._id}) | Total: ₹${finalOrderPrice} | By: ${req.auth.email}`);

    return res.status(201).json({
      ok: true,
      message: `Order ${orderNumber} confirmed successfully`,
      order: newOrder,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/orders
 * Returns all confirmed orders for the active vendor.
 * Accessible to Vendor and Staff.
 */
async function getOrders(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    if (!vendorId) {
      return res.status(400).json({ error: { message: "Vendor context missing", status: 400 } });
    }

    const orders = await Order.find({ vendorId }).sort({ createdAt: -1 });

    return res.json({
      ok: true,
      orders,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/orders/:id
 * Returns a specific order by ID.
 */
async function getOrderById(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const order = await Order.findOne({ _id: req.params.id, vendorId });
    if (!order) {
      return res.status(404).json({ error: { message: "Order not found", status: 404 } });
    }

    return res.json({
      ok: true,
      order,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
};
