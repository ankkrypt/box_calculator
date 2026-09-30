const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

/* Liveness + DB readiness probe (useful for Coolify/uptime checks). */
router.get("/", async (_req, res) => {
  const db = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({ status: "ok", db, uptime: process.uptime() });
});

module.exports = router;
