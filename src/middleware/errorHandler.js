/**
 * Global Error Handler Middleware
 *
 * Must be the LAST middleware registered in app.js.
 * Express identifies error handlers by their 4-argument signature: (err, req, res, next).
 */
const errorHandler = (err, req, res, next) => {
  // Log the full error server-side for debugging
  console.error(`[Error] ${req.method} ${req.originalUrl} →`, err);

  // ── Razorpay API errors ──────────────────────────────────
  // The razorpay SDK throws objects shaped like: { statusCode, error: { code, description, ... } }
  if (err.statusCode && err.error) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.error.description || "Razorpay API error.",
      code: err.error.code,
      ...(process.env.NODE_ENV === "development" && { razorpayError: err.error }),
    });
  }

  // ── Validation / business logic errors ──────────────────
  if (err.name === "ValidationError") {
    return res.status(422).json({
      success: false,
      message: err.message,
    });
  }

  // ── JSON parse errors (malformed request body) ──────────
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Malformed JSON in request body.",
    });
  }

  // ── Generic / unexpected errors ──────────────────────────
  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error.",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
