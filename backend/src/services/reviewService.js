/**
 * SkillSwap - Review Service
 * Manages peer reviews and ratings for completed swaps.
 */

const { query } = require('../config/database');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notificationService');

/**
 * Submit a review for a completed swap
 */
async function createReview(reviewerId, { swapId, revieweeId, rating, comment }) {
  if (rating < 1 || rating > 5) {
    throw ApiError.badRequest('Rating must be an integer between 1 and 5.');
  }

  // Verify swap is completed and reviewer was a participant
  const swaps = await query(
    'SELECT * FROM swap_requests WHERE id = ? LIMIT 1',
    [swapId]
  );

  if (swaps.length === 0) {
    throw ApiError.notFound('Swap request not found.');
  }

  const swap = swaps[0];

  if (swap.status !== 'completed') {
    throw ApiError.badRequest('Reviews can only be submitted for completed swaps.');
  }

  if (swap.requester_id !== reviewerId && swap.receiver_id !== reviewerId) {
    throw ApiError.forbidden('You were not a participant in this swap.');
  }

  // Ensure reviewee was the counterparty
  const expectedRevieweeId = swap.requester_id === reviewerId ? swap.receiver_id : swap.requester_id;
  if (parseInt(revieweeId, 10) !== expectedRevieweeId) {
    throw ApiError.badRequest('Invalid review recipient for this swap.');
  }

  // Check if already reviewed
  const existing = await query(
    'SELECT id FROM reviews WHERE swap_id = ? AND reviewer_id = ? LIMIT 1',
    [swapId, reviewerId]
  );

  if (existing.length > 0) {
    throw ApiError.conflict('You have already submitted a review for this swap.');
  }

  const result = await query(
    `INSERT INTO reviews (swap_id, reviewer_id, reviewee_id, rating, comment)
     VALUES (?, ?, ?, ?, ?)`,
    [swapId, reviewerId, revieweeId, rating, comment]
  );

  // Notify reviewee
  const reviewer = await query('SELECT name FROM users WHERE id = ? LIMIT 1', [reviewerId]);
  const reviewerName = reviewer[0]?.name || 'Your swap partner';

  await notificationService.createNotification({
    userId: revieweeId,
    type: 'review_received',
    title: 'New Review Received',
    message: `${reviewerName} gave you a ${rating}-star rating!`,
    data: { swap_id: swapId, rating }
  });

  return { id: result.insertId, swap_id: swapId, rating, comment };
}

/**
 * Get reviews received by a user
 */
async function getUserReviews(userId) {
  const sql = `
    SELECT 
      r.id, r.swap_id, r.rating, r.comment, r.created_at,
      u.name AS reviewer_name, u.avatar_url AS reviewer_avatar
    FROM reviews r
    JOIN users u ON r.reviewer_id = u.id
    WHERE r.reviewee_id = ?
    ORDER BY r.created_at DESC
  `;

  return await query(sql, [userId]);
}

module.exports = {
  createReview,
  getUserReviews
};
