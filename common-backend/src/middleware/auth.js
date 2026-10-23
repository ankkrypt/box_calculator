const { verifyAccessToken } = require("../utils/token");

/* Bearer auth: frontend stores the access token in localStorage and sends
   `Authorization: Bearer <token>`. Claims: { userId, role, vendorId, plan }. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    console.log(`[Auth] requireAuth: No Bearer token provided on ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ error: { message: "Authentication required", status: 401 } });
  }
  let claims;
  try {
    claims = verifyAccessToken(token);
  } catch (err) {
    console.log(`[Auth] requireAuth: Token invalid/expired (${err.message}) on ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ error: { message: "Invalid or expired token", status: 401 } });
  }
  req.auth = claims; // { userId, role, vendorId, plan }
  console.log(`[Auth] requireAuth: OK for ${claims.role} (${claims.userId}) on ${req.method} ${req.originalUrl}`);
  return next();
}

/* Permission gate — e.g. requirePermission("vendorCompany", "read")
   - If user role is vendor: full access always (proceeds directly).
   - If user role is staff: checks the permissions for the schema and action passed from params. */
function requirePermission(schema, action) {
  return (req, res, next) => {
    // Vendor has full access always
    if (req.auth.role === "vendor") {
      return next();
    }

    // Staff: check permissions for the requested schema and action
    const perms = typeof req.auth.permissions?.get === "function"
      ? req.auth.permissions.get(schema)
      : req.auth.permissions?.[schema];

    if (!perms || !perms[action]) {
      console.log(`[Auth] requirePermission: Staff '${req.auth.userId}' lacks '${action}' permission on '${schema}'`);
      return res.status(403).json({ error: { message: "Insufficient permissions", status: 403 } });
    }

    return next();
  };
}

module.exports = { requireAuth, requirePermission };
