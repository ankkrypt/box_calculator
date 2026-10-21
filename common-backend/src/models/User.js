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

/* Hash passwords before they are stored. */
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

module.exports = mongoose.model("User", userSchema);
