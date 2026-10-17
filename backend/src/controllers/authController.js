/**
 * SkillSwap - Auth Controller
 */

const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { isValidEmail, isValidPassword } = require('../utils/validators');

/**
 * Register new user
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, location, bio } = req.body;

  if (!name || !email || !password) {
    throw ApiError.badRequest('Name, email, and password are required.');
  }

  if (!isValidEmail(email)) {
    throw ApiError.badRequest('Please provide a valid email address.');
  }

  if (!isValidPassword(password)) {
    throw ApiError.badRequest('Password must be at least 6 characters long.');
  }

  const result = await authService.registerUser({ name, email, password, location, bio });

  res.status(201).json({
    success: true,
    message: 'User registered successfully.',
    data: result
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest('Email and password are required.');
  }

  const result = await authService.loginUser({ email, password });

  res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: result
  });
});

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

module.exports = {
  register,
  login,
  getMe
};
