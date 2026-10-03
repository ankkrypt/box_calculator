const mongoose = require("mongoose");

/* ==========================================================================
   FLUTE SCHEMA (Corrugation Flute Profile Table)
   Scoped to a vendor company via `vendorId`.
   Contains take-up factors and caliper specifications.
   Accessible by both Vendor and their Staff.
   ========================================================================== */
const fluteSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    n: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 12,
    }, // Flute name (e.g. "A", "B", "C", "E", "BC")
    f: {
      type: Number,
      required: true,
      min: 1.0,
      default: 1.32,
    }, // Take-up factor (e.g. 1.32)
    th: {
      type: String,
      trim: true,
      default: "",
    }, // Caliper thickness range in mm (e.g. "2.5–3.0")
    d: {
      type: String,
      trim: true,
      default: "",
    }, // Description / typical use
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

fluteSchema.index({ vendorId: 1, n: 1 }, { unique: true });

module.exports = mongoose.model("Flute", fluteSchema);
