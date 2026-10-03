const mongoose = require("mongoose");

/* ==========================================================================
   QUOTATION SCHEMA
   Scoped to a vendor company via `vendorId`.
   Stores only the vendor's quotation parameters:
   - conversion (in INR per box)
   - profitMargin (in %)
   - tax (in %)
   - discount (in %)
   ========================================================================== */
const quotationSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      unique: true,
      index: true,
    },
    conversion: {
      type: Number,
      default: 2,
      min: 0,
    },
    profitMargin: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    tax: {
      type: Number,
      default: 5,
      min: 0,
      max: 100,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quotation", quotationSchema);
