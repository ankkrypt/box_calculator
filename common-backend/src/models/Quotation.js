const mongoose = require("mongoose");

/* ==========================================================================
   QUOTATION SCHEMA
   Scoped to a vendor company via `vendorId`.
   Stores the snapshot of box specifications, board configuration,
   pricing parameters, and calculated outputs.
   ========================================================================== */
const quotationSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    createdByType: {
      type: String,
      enum: ["vendor", "staff"],
      default: "vendor",
    },

    /* Inside box dimensions & order volume */
    order: {
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
    },

    /* Pricing inputs (conversion, margin, tax, transport) */
    pricing: {
      conv: { type: Number, default: 6 },
      marg: { type: Number, default: 15 },
      tax: { type: Number, default: 18 },
      trans: { type: Number, default: 3500 },
      extra: { type: Number, default: 0 },
    },

    /* Calculated output figures */
    outputs: {
      paperCostPerBox: { type: Number },
      conversionPerBox: { type: Number },
      costPerBoxWithMargin: { type: Number },
      totalPcsCost: { type: Number },
      taxAmount: { type: Number },
      transportCost: { type: Number },
      finalOrderPrice: { type: Number },
      sheetSize: { type: String },
      sheetArea: { type: String },
      boxWeight: { type: String },
      orderWeight: { type: String },
      overallBS: { type: String },
    },

    status: {
      type: String,
      enum: ["draft", "saved", "sent"],
      default: "saved",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quotation", quotationSchema);
