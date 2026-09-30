/* Central config — single .env, no defaults, no environment branching.
   Every value MUST come from .env. A missing/empty value exits immediately
   so a broken setup is obvious on startup, not silently misbehaving. */
require("dotenv").config();

const required = (name) => {
  const v = process.env[name];
  if (v === undefined || v === "") {
    console.error(`[config] Missing required env var: ${name} — set it in .env`);
    process.exit(1);
  }
  return v;
};

const config = {
  port: Number(required("PORT")),
  mongoUri: required("MONGODB_URI"),
  jwt: {
    secret: required("JWT_SECRET"),
    accessExpiresIn: required("JWT_ACCESS_EXPIRES_IN"),
    refreshExpiresIn: required("JWT_REFRESH_EXPIRES_IN"),
    cookieName: required("JWT_COOKIE_NAME"),
    cookieSecure: required("COOKIE_SECURE") === "true", // set false locally, true in production
  },
  corsOrigin: required("CORS_ORIGIN").replace(/^\[(.*)\]$/, "$1"),
};

module.exports = config;
