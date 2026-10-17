/**
 * SkillSwap - Centralized Error Handler Middleware
 */

const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function errorHandler(err, req, res, next) {
  let { statusCode = 500, message = 'Internal Server Error', errors = [] } = err;

  // Handle MySQL duplicate key error (code ER_DUP_ENTRY)
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry: A record with this information already exists.';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please log in again.';
  }

  // Handle Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = `File too large. Maximum allowed size is ${env.MAX_FILE_SIZE_MB}MB.`;
  }

  const response = {
    success: false,
    statusCode,
    message,
    errors
  };

  if (env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
