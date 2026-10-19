const mongoose = require("mongoose");

/* ==========================================================================
   SCORE TOLERANCE SCHEMA
   Scoped to a vendor company via `vendorId`.
   Stores default score tolerance (mm) for each ply count (3, 5, 7, 9 ply).
   Accessible by both Vendor and their Staff.
   ========================================================================== */
const scoreToleranceSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    tolerances: {
      type: Map,
      of: Number,
      default: () => ({
        "3": 6,
        "5": 12,
        "7": 18,
        "9": 24,
      }),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ScoreTolerance", scoreToleranceSchema);
