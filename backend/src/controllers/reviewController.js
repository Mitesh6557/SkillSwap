/**
 * SkillSwap - Review Controller
 */

const reviewService = require('../services/reviewService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * Submit review for completed swap
 * POST /api/reviews
 */
const create = asyncHandler(async (req, res) => {
  const { swapId, revieweeId, rating, comment } = req.body;

  if (!swapId || !revieweeId || rating === undefined) {
    throw ApiError.badRequest('swapId, revieweeId, and rating are required.');
  }

  const review = await reviewService.createReview(req.user.id, {
    swapId,
    revieweeId,
    rating: parseInt(rating, 10),
    comment
  });

  res.status(201).json({
    success: true,
    message: 'Review submitted successfully.',
    data: review
  });
});

/**
 * Get reviews for a specific user
 * GET /api/reviews/user/:userId
 */
const getByUser = asyncHandler(async (req, res) => {
  const reviews = await reviewService.getUserReviews(req.params.userId);

  res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews
  });
});

module.exports = {
  create,
  getByUser
};
