/**
 * SkillSwap - Request Validation Middleware
 */

const ApiError = require('../utils/ApiError');
const { getMissingFields } = require('../utils/validators');

/**
 * Validates presence of required fields in req.body
 * @param {Array<string>} requiredFields
 */
function validateBody(requiredFields = []) {
  return (req, res, next) => {
    const missing = getMissingFields(req.body, requiredFields);
    if (missing.length > 0) {
      return next(
        ApiError.badRequest(`Missing required fields: ${missing.join(', ')}`, missing)
      );
    }
    next();
  };
}

module.exports = {
  validateBody
};
