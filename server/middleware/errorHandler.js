/**
 * Centralised error-handling middleware for the RA-Lab backend.
 *
 * Provides:
 *  - AppError   — operational error class with HTTP status codes
 *  - errorHandler  — Express error-handling middleware
 *  - notFoundHandler — 404 catch-all for undefined routes
 */

class AppError extends Error {
  /**
   * @param {string}  message    - Human-readable error description
   * @param {number}  statusCode - HTTP status code (default 500)
   * @param {*}       details    - Optional extra context for the client
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // operational vs programmer error
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Express error-handling middleware.
 * Must have the (err, req, res, next) signature.
 */
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // ---- Logging ----
  console.error(
    `[ERROR] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`
  );
  console.error(`  Status : ${statusCode}`);
  console.error(`  Message: ${message}`);
  if (statusCode === 500 && err.stack) {
    console.error(`  Stack  : ${err.stack}`);
  }

  // ---- Map well-known Node / Express errors ----
  if (err.code === 'ENOENT') {
    statusCode = 404;
    message = 'Requested resource not found on disk';
  } else if (err.code === 'EACCES' || err.code === 'EPERM') {
    statusCode = 403;
    message = 'Permission denied';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON in request body';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request payload too large (limit: 10 MB)';
  }

  // Never leak internal details for unexpected (non-operational) 500s
  if (statusCode === 500 && !err.isOperational) {
    message = 'An unexpected internal error occurred. Please try again later.';
    details = null;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(details !== null && { details }),
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Catch-all middleware for routes that don't match any handler.
 */
const notFoundHandler = (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
};

module.exports = { AppError, errorHandler, notFoundHandler };
