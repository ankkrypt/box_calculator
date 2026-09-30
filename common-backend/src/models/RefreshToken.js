const mongoose = require("mongoose");

/* Refresh-token store (server-side). The raw token only lives in the
   httpOnly cookie; the DB stores a SHA-256 hash so a DB leak cannot mint sessions.
   Tracks whether the session belongs to a 'vendor' or 'staff' user.
   MongoDB TTL automatically deletes expired tokens once expiresAt passes. */
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userType: {
      type: String,
      enum: ["vendor", "staff"],
      required: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/* TTL index: MongoDB deletes expired documents automatically */
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.methods.isActive = function isActive() {
  return !this.revokedAt && this.expiresAt > new Date();
};

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
