/**
 * SkillSwap - User Controller
 */

const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * List active public users with advanced filters
 * GET /api/users
 */
const getAll = asyncHandler(async (req, res) => {
  const { search, offeredSkill, wantedSkill, location, availability, limit, offset } = req.query;
  const users = await userService.getAllUsers({
    search,
    offeredSkill,
    wantedSkill,
    location,
    availability,
    limit,
    offset
  });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

/**
 * Get user profile by ID (privacy guarded)
 * GET /api/users/:id
 */
const getById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(
    req.params.id,
    req.user?.id,
    req.user?.role === 'admin'
  );

  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * Update authenticated user's profile
 * PUT /api/users/profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, bio, location, availability, is_public } = req.body;
  const updatedUser = await userService.updateUserProfile(req.user.id, {
    name,
    bio,
    location,
    availability,
    is_public
  });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: updatedUser
  });
});

/**
 * Upload avatar image
 * POST /api/users/avatar
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No image file uploaded.');
  }

  // Store relative path for serving
  const relativePath = `uploads/avatars/${req.file.filename}`;
  const result = await userService.updateAvatar(req.user.id, relativePath);

  res.status(200).json({
    success: true,
    message: 'Avatar uploaded successfully.',
    data: result
  });
});

module.exports = {
  getAll,
  getById,
  updateProfile,
  uploadAvatar
};
