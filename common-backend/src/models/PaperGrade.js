const mongoose = require("mongoose");

/* ==========================================================================
   PAPER GRADE SCHEMA
   Scoped to a vendor company via `vendorId`.
   Stores paper types with default GSM and BF for both liners and flutes.
   Accessible by both Vendor and their Staff.
   ========================================================================== */
const paperGradeSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    }, // e.g. "Virgin Kraft", "Semi-Kraft", "Test Liner"
    gsm: { type: Number, required: true },
    bf: { type: Number, required: true },
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

paperGradeSchema.index({ vendorId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("PaperGrade", paperGradeSchema);
