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

/* Role gate — e.g. requireRole("vendor") for owner-only endpoints (invites,
   settings). Staff routes will use requireRole("staff") (or both) when built. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      console.log(`[Auth] requireRole: Missing req.auth on ${req.method} ${req.originalUrl}`);
      return res.status(401).json({ error: { message: "Authentication required", status: 401 } });
    }
    if (!roles.includes(req.auth.role)) {
      console.log(`[Auth] requireRole: Forbidden. User role '${req.auth.role}' not in [${roles.join(", ")}]`);
      return res.status(403).json({ error: { message: "Insufficient permissions", status: 403 } });
    }
    return next();
  };
}

/* Permission gate — e.g. requirePermission("vendorCompany", "read") for staff
   who have been granted read access to the vendor company schema. Check the */
/* permissions map on the authenticated user (loaded from the JWT) to see */
/* which schemas they can read, update, delete. */
function requirePermission(schema, action) {
  return (req, res, next) => {
    if (!req.auth) {
      console.log(`[Auth] requirePermission: Missing req.auth on ${req.method} ${req.originalUrl}`);
      return res.status(401).json({ error: { message: "Authentication required", status: 401 } });
    }

    const isVendor = req.auth.role === "vendor";
    const hasVendorFullAccess = isVendor;

    if (isVendor) {
      // Vendors always have full access to everything
      return next();
    }

    // Staff: check the permissions map for the requested schema and action
    const perms = req.auth.permissions?.get?.(schema);
    if (!perms) {
      // Schema not in permissions map means no access
      console.log(`[Auth] requirePermission: Staff '${req.auth.userId}' lacks permission '${action}' on schema '${schema}'`);
      return res.status(403).json({ error: { message: "Insufficient permissions", status: 403 } });
    }

    const allowed = perms[action];
    if (!allowed) {
      console.log(`[Auth] requirePermission: Staff '${req.auth.userId}' lacks '${action}' permission on schema '${schema}'`);
      return res.status(403).json({ error: { message: "Insufficient permissions", status: 403 } });
    }

    return next();
  };
}

module.exports = { requireAuth, requireRole, requirePermission };
