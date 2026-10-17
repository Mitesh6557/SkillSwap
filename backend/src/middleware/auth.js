/**
 * SkillSwap - JWT Authentication Middleware
 * Validates incoming Authorization Bearer token.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication token is missing. Please log in.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    req.user = decoded; // { id, email, role, iat, exp }
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      return next(err);
    }
    return next(ApiError.unauthorized('Invalid or expired authentication token.'));
  }
}

function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = decoded;
    }
  } catch (err) {
    // Ignore invalid optional tokens
    req.user = null;
  }
  next();
}

module.exports = auth;
module.exports.auth = auth;
module.exports.optionalAuth = optionalAuth;
