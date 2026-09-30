/* Central error handling: unknown routes + one JSON error shape.
   No environment branching — error details always surfaced as-is. */
function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Not found: ${req.method} ${req.originalUrl}`));
}

/* eslint-disable-next-line no-unused-vars */
function errorHandler(err, req, res, _next) {
  let status = err.status || (res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message;

  /* Mongoose validation → 400; duplicate unique key → 409. */
  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join("; ");
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `Duplicate value for ${field}`;
  }

  const body = { error: { message, status } };
  if (status >= 500) console.error("[api] Error:", err);
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
