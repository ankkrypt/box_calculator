const mongoose = require("mongoose");

/* ==========================================================================
   REEL SCHEMA (Paper Reel Inventory)
   Scoped to a vendor company via `vendorId`.
   Accessible by both Vendor and their Staff for calculating quotations
   and tracking reel stock.
   ========================================================================== */
const reelSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    w: {
      type: Number,
      required: true,
      min: 100,
    }, // Reel width in mm
    gsm: {
      type: Number,
      required: true,
      min: 50,
      default: 150,
    },
    bf: {
      type: Number,
      required: true,
      min: 10,
      default: 20,
    }, // Burst factor
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 42,
    }, // Price per kg in ₹
    stock: {
      type: Number,
      default: 0,
      min: 0,
    }, // Stock in kg
    shade: {
      type: String,
      trim: true,
      default: "Natural Kraft",
    },
    paperGrade: {
      type: String,
      trim: true,
      default: "",
    },
    flute: {
      type: String,
      trim: true,
      default: "",
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
  },
  { timestamps: true }
);

reelSchema.index({ vendorId: 1, w: 1, price: 1 });

module.exports = mongoose.model("Reel", reelSchema);
