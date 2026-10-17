/**
 * SkillSwap - Swap Controller
 */

const swapService = require('../services/swapService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * Get swaps for current user
 * GET /api/swaps
 */
const getMySwaps = asyncHandler(async (req, res) => {
  const swaps = await swapService.getUserSwaps(req.user.id);

  res.status(200).json({
    success: true,
    count: swaps.length,
    data: swaps
  });
});

/**
 * Get swap by ID
 * GET /api/swaps/:id
 */
const getById = asyncHandler(async (req, res) => {
  const swap = await swapService.getSwapById(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: swap
  });
});

/**
 * Propose a new skill swap
 * POST /api/swaps
 */
const create = asyncHandler(async (req, res) => {
  const receiverId = req.body.receiverId || req.body.receiver_id;
  const offeredSkillId = req.body.offeredSkillId || req.body.offered_skill_id;
  const requestedSkillId = req.body.requestedSkillId || req.body.requested_skill_id;
  const message = req.body.message;
  const scheduledDate = req.body.scheduledDate || req.body.scheduled_date;

  if (!receiverId || !offeredSkillId || !requestedSkillId) {
    throw ApiError.badRequest('receiverId, offeredSkillId, and requestedSkillId are required.');
  }

  const newSwap = await swapService.createSwapRequest(req.user.id, {
    receiverId,
    offeredSkillId,
    requestedSkillId,
    message,
    scheduledDate
  });

  res.status(201).json({
    success: true,
    message: 'Skill swap request sent successfully.',
    data: newSwap
  });
});

/**
 * Update swap status
 * PATCH /api/swaps/:id/status
 */
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    throw ApiError.badRequest('Status is required.');
  }

  const result = await swapService.updateSwapStatus(req.params.id, req.user.id, status);

  res.status(200).json({
    success: true,
    message: `Swap status updated to '${status}'.`,
    data: result
  });
});

/**
 * Withdraw/cancel a pending swap proposal
 * DELETE /api/swaps/:id
 */
const withdraw = asyncHandler(async (req, res) => {
  const result = await swapService.withdrawPendingSwap(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: result.message
  });
});

module.exports = {
  getMySwaps,
  getById,
  create,
  updateStatus,
  withdraw
};
