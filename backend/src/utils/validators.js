/**
 * SkillSwap - Validation Helper Utilities
 */

/**
 * Validates email format using regex
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates password strength (min 6 characters)
 * @param {string} password
 * @returns {boolean}
 */
function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

/**
 * Checks if required fields are non-empty in request body
 * @param {Object} body
 * @param {Array<string>} requiredFields
 * @returns {Array<string>} Missing field names
 */
function getMissingFields(body, requiredFields) {
  if (!body) return requiredFields;
  return requiredFields.filter((field) => {
    const val = body[field];
    return val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
  });
}

module.exports = {
  isValidEmail,
  isValidPassword,
  getMissingFields
};
