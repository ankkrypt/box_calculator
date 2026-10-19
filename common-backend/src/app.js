const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const config = require("./config/env");
const healthRouter = require("./routes/health");
const authRoutes = require("./routes/authRoutes");
const userController = require("./controllers/userController");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin === config.corsOrigin ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, config.corsOrigin);
    },
    credentials: true, // httpOnly JWT cookie flows to the Next.js frontend
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

/* HTTP Request & Response Logger */
app.use((req, res, next) => {
  const start = Date.now();
  const hasCookie = Boolean(req.cookies?.[config.jwt.cookieName]);
  const hasAuth = Boolean(req.headers.authorization);
  console.log(`[REQ] ${req.method} ${req.originalUrl} | Cookie: ${hasCookie ? "YES" : "no"} | Auth: ${hasAuth ? "YES" : "no"}`);

  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`[RES] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });

  next();
});

app.get("/", (_req, res) => {
  res.json({ name: "boxcalc-api", status: "ok" });
});

const quotationRoutes = require("./routes/quotationRoutes");
const reelRoutes = require("./routes/reelRoutes");
const fluteRoutes = require("./routes/fluteRoutes");
const toleranceRoutes = require("./routes/toleranceRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paperRoutes = require("./routes/paperRoutes");
const vendorCompanyRoutes = require("./routes/vendorCompanyRoutes");

/* API Endpoints: MVC Auth Routes */
app.use("/api/health", healthRouter);
app.post("/api/auth/refresh", userController.refresh);
app.post("/api/auth/logout", userController.logout);
app.use("/api/auth", authRoutes);
app.use("/api/quotation", quotationRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reels", reelRoutes);
app.use("/api/flutes", fluteRoutes);
app.use("/api/tolerances", toleranceRoutes);
app.use("/api/papers", paperRoutes);
app.use("/api/vendor-company", vendorCompanyRoutes);

/* 404 for unknown API routes, then the central error handler. */
app.use(notFound);
app.use(errorHandler);

module.exports = app;
