const mongoose = require("mongoose");

/* ==========================================================================
   VENDOR COMPANY SCHEMA
   Stores vendor company details (name, address, email, contact) and is
   scoped to a vendor via `vendorId`.
   Accessible by both Vendor and their Staff when the vendor grants
   create/read/update/delete permissions on this schema in the User
   `permissions.vendorCompany` map.
   ========================================================================== */
const vendorCompanySchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
      default: "",
    },
    contact: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "",
    },
  },
  { timestamps: true }
);

vendorCompanySchema.index({ vendorId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("VendorCompany", vendorCompanySchema);
