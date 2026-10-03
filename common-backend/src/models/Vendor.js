const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* Vendor account = the company (per product decision: no separate Tenant).
   Everything company-scoped (staff, reels, quotes, orders) hangs off the
   vendor's _id, which the JWT carries as `vendorId`. Company-wide rates the
   engine reads live in `settings` (NFR-8: no magic numbers in UI). */
const vendorSchema = new mongoose.Schema(
  {
    /* Company identity */
    vendorName: { type: String, required: true, trim: true, maxlength: 120 },
    plan: { type: String, enum: ["free", "paid"], default: "free" }, // Phase 2: subscription

    /* Login identity (the owner account of the company) */
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email"],
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

/* Accept `password` on create/save (strict mode ignores unknown paths, so it
   must be a virtual) and funnel it into passwordHash before validation. */
vendorSchema.virtual("password").set(function setPassword(plain) {
  this._plainPassword = plain;
  this.passwordHash = plain;
});

/* Validation runs after pre('validate') hooks — hash here so the `required`
   check sees the final (hashed) value. */
vendorSchema.pre("validate", async function hashPassword(next) {
  if (!this.isModified("passwordHash") || !this.passwordHash) return next();
  try {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    next();
  } catch (err) {
    next(err);
  }
});

vendorSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model("Vendor", vendorSchema);