/**
 * SkillSwap - User Report Controller
 * Handles user-submitted reports for trust & community safety.
 */

const { query } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const STANDARD_REASONS = [
  'Inappropriate content or messages',
  'Harassment or abusive behavior',
  'No-show / Missed session',
  'Spam / Commercial solicitation',
  'Fake profile or misleading skills',
  'Other'
];

/**
 * Get standard report reasons
 * GET /api/reports/reasons
 */
const getReasons = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: STANDARD_REASONS
  });
});

/**
 * Submit a safety report against a user or swap
 * POST /api/reports
 */
const createReport = asyncHandler(async (req, res) => {
  const reporterId = req.user.id;
  const reportedUserId = req.body.reportedUserId || req.body.reported_user_id;
  const reportedSwapId = req.body.reportedSwapId || req.body.reported_swap_id;
  const reason = req.body.reason;
  const details = req.body.details || null;

  if (!reason || !reason.trim()) {
    throw ApiError.badRequest('Report reason is required.');
  }

  if (!reportedUserId && !reportedSwapId) {
    throw ApiError.badRequest('Either reportedUserId or reportedSwapId must be specified.');
  }

  let targetUserId = reportedUserId ? parseInt(reportedUserId, 10) : null;
  const targetSwapId = reportedSwapId ? parseInt(reportedSwapId, 10) : null;

  // Rule: Cannot report yourself
  if (targetUserId && targetUserId === reporterId) {
    throw ApiError.badRequest('You cannot submit a report against yourself.');
  }

  // If swap ID is provided, verify swap existence
  if (targetSwapId) {
    const swaps = await query(
      'SELECT id, requester_id, receiver_id FROM swap_requests WHERE id = ? LIMIT 1',
      [targetSwapId]
    );

    if (swaps.length === 0) {
      throw ApiError.notFound('Referenced swap exchange was not found.');
    }

    const swap = swaps[0];
    if (swap.requester_id !== reporterId && swap.receiver_id !== reporterId) {
      throw ApiError.forbidden('You are not a participant in this swap exchange.');
    }

    // Auto-infer reported user if not supplied
    if (!targetUserId) {
      targetUserId = swap.requester_id === reporterId ? swap.receiver_id : swap.requester_id;
    }
  }

  // Verify target user exists
  if (targetUserId) {
    const users = await query('SELECT id, name, is_active FROM users WHERE id = ? LIMIT 1', [targetUserId]);
    if (users.length === 0) {
      throw ApiError.notFound('Reported user was not found.');
    }
  }

  // Rule: Prevent duplicate pending reports from the same reporter against the same user/swap
  const existingPending = await query(
    `SELECT id FROM reports 
     WHERE reporter_id = ? 
       AND ((reported_user_id IS NOT NULL AND reported_user_id = ?) OR (reported_swap_id IS NOT NULL AND reported_swap_id = ?))
       AND status = 'pending'
     LIMIT 1`,
    [reporterId, targetUserId, targetSwapId]
  );

  if (existingPending.length > 0) {
    throw ApiError.conflict('You have already submitted a pending report for this target. Our moderation team is reviewing it.');
  }

  // Insert report
  const [result] = await query(
    `INSERT INTO reports (reporter_id, reported_user_id, reported_swap_id, reason, details, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [reporterId, targetUserId, targetSwapId, reason.trim(), details ? details.trim() : null]
  );

  res.status(201).json({
    success: true,
    message: 'Thank you for helping keep SkillSwap safe. Your report has been submitted to our moderation team.',
    data: {
      report_id: result.insertId,
      status: 'pending'
    }
  });
});

module.exports = {
  getReasons,
  createReport
};
