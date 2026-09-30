const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* Staff account — created ONLY when a vendor invites them by email.
   Lifecycle: vendor invites (status "invited", temp password = the invited
   email in lowercase, per product decision) → staff logs in with that link →
   (later) sets their own password → status "active". */
const staffSchema = new mongoose.Schema(
  {
    /* The vendor (company) this staff member belongs to. */
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email"],
    },
    name: { type: String, trim: true, maxlength: 120, default: "" },
    status: { type: String, enum: ["invited", "active", "disabled"], default: "invited" },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    invitedAt: { type: Date, default: Date.now },
    /* Temp password on invite = the invited email, lowercase. Replaced when
       the staff member sets a real password. Null until invite creates it. */
    passwordHash: { type: String, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

/* Same contract as Vendor: `password` virtual → passwordHash, hashed in
   pre('validate') so the value stored is always the bcrypt hash. */
staffSchema.virtual("password").set(function setPassword(plain) {
  this._plainPassword = plain;
  this.passwordHash = plain;
});

staffSchema.pre("validate", async function hashPassword(next) {
  if (!this.isModified("passwordHash") || !this.passwordHash) return next();
  try {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    next();
  } catch (err) {
    next(err);
  }
});

staffSchema.methods.verifyPassword = function verifyPassword(plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model("Staff", staffSchema);
