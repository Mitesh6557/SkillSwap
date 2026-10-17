/**
 * SkillSwap - Admin Authorization Middleware
 * Verifies that the authenticated user possesses the 'admin' role.
 */

const ApiError = require('../utils/ApiError');

function adminAuth(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(ApiError.forbidden('Access denied. Administrator privileges required.'));
  }
  next();
}

module.exports = adminAuth;
