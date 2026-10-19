const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email"],
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["vendor", "staff"],
      required: true,
      index: true,
    },
    permissions: {
      flute: { type: new mongoose.Schema({
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      }, { _id: false }) },
      paper: { type: new mongoose.Schema({
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      }, { _id: false }) },
      order: { type: new mongoose.Schema({
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      }, { _id: false }) },
      reel: { type: new mongoose.Schema({
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      }, { _id: false }) },
      quotation: { type: new mongoose.Schema({
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      }, { _id: false }) },
      tolerance: { type: new mongoose.Schema({
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      }, { _id: false }) },
      staff: { type: new mongoose.Schema({
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      }, { _id: false }) },
      vendorCompany: { type: new mongoose.Schema({
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      }, { _id: false }) },
    },

    /* Reference to the shared company object (VendorCompany). */
    vendorCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorCompany",
      required: true,
      index: true,
    },

    /* Stored on staff records only. */
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    /* Password reset */
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },

    /* Subscription tier; staff inherit the vendor's plan at session issue time */
    plan: { type: String, enum: ["free", "paid"], default: "free" },
  },
  { timestamps: true }
);

/* Accept `password` on create/save (strict mode ignores unknown paths, so it
   must be a virtual) and funnel it into passwordHash before validation. */
/* Validation runs after pre('validate') hooks — hash here so the `required`
   check sees the final (hashed) value, and so only a hash is stored. */
userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password") || !this.password) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  if (!this.password) return false;
  return bcrypt.compare(plain, this.password);
};

/* Convenience: the vendor _id this user belongs to.
   - For vendors: themselves.
   - For staff: their vendorId.
   This keeps downstream code that previously did `vendor._id` / `staff.vendorId`
   able to read `user.vendorIdentityId` without branching. */
userSchema.virtual("vendorIdentityId").get(function () {
  if (this.role === "vendor") return this._id;
  return this.vendorId;
});

module.exports = mongoose.model("User", userSchema);
