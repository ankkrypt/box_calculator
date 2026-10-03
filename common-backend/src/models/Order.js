const mongoose = require("mongoose");

/* ==========================================================================
   ORDER SCHEMA
   Scoped to a vendor company via `vendorId`.
   Stores confirmed orders with full snapshot of:
   - Box dimensions & order volume
   - Board composition (ply, plies, flutes, tolerances, wastage)
   - Pricing configuration (conv, marg, tax, trans, discount)
   - Full calculated outputs (sheet area, blank size, weights, quote breakdown)
   - Audit info: createdBy, createdByName, createdByType
   ========================================================================== */
const orderSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    createdByName: {
      type: String,
      default: "",
    },
    createdByType: {
      type: String,
      enum: ["vendor", "staff"],
      default: "vendor",
    },

    /* Inside box dimensions & order volume */
    box: {
      type: { type: String, default: "rsc" },
      L: { type: Number, required: true },
      W: { type: Number, required: true },
      H: { type: Number, required: true },
      Q: { type: Number, required: true, default: 1000 },
      J: { type: Number, default: 35 },
      unit: { type: String, enum: ["mm", "inch"], default: "mm" },
    },

    /* Board structure & flute choices */
    board: {
      ply: { type: Number, default: 5 },
      plies: { type: Array, default: [] },
      flutes: { type: Array, default: [] },
      tolerances: { type: mongoose.Schema.Types.Mixed, default: {} },
      extra: { type: Number, default: 5 },
    },

    /* Pricing parameters applied to this specific order */
    pricing: {
      conv: { type: Number, default: 2 },
      marg: { type: Number, default: 10 },
      tax: { type: Number, default: 5 },
      discount: { type: Number, default: 0 },
      trans: { type: Number, default: 3500 },
      extra: { type: Number, default: 5 },
    },

    /* Full calculated output snapshot */
    outputs: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    finalOrderPrice: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["confirmed", "in_production", "completed", "cancelled"],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
