/**
 * SkillSwap - Swap Request Service
 * Handles exchange proposals, lifecycle transitions, validation rules, and transactions.
 */

const { query, withTransaction } = require('../config/database');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notificationService');

/**
 * Get all swaps involving a user (sent and received)
 */
async function getUserSwaps(userId) {
  const sql = `
    SELECT 
      sr.id, sr.requester_id, sr.receiver_id, sr.status, sr.message, sr.scheduled_date,
      sr.created_at, sr.updated_at,
      u_req.name AS requester_name, u_req.email AS requester_email, u_req.avatar_url AS requester_avatar,
      u_rec.name AS receiver_name, u_rec.email AS receiver_email, u_rec.avatar_url AS receiver_avatar,
      s_off.name AS offered_skill_name, s_req.name AS requested_skill_name,
      -- Check if current user has already reviewed this swap
      EXISTS(SELECT 1 FROM reviews rev WHERE rev.swap_id = sr.id AND rev.reviewer_id = ?) AS has_reviewed
    FROM swap_requests sr
    JOIN users u_req ON sr.requester_id = u_req.id
    JOIN users u_rec ON sr.receiver_id = u_rec.id
    JOIN skills s_off ON sr.offered_skill_id = s_off.id
    JOIN skills s_req ON sr.requested_skill_id = s_req.id
    WHERE sr.requester_id = ? OR sr.receiver_id = ?
    ORDER BY sr.created_at DESC
  `;

  return await query(sql, [userId, userId, userId]);
}

/**
 * Get swap by ID with validation
 */
async function getSwapById(swapId, userId) {
  const sql = `
    SELECT 
      sr.id, sr.requester_id, sr.receiver_id, sr.status, sr.message, sr.scheduled_date,
      sr.created_at, sr.updated_at,
      u_req.name AS requester_name, u_req.avatar_url AS requester_avatar,
      u_rec.name AS receiver_name, u_rec.avatar_url AS receiver_avatar,
      s_off.name AS offered_skill_name, s_req.name AS requested_skill_name
    FROM swap_requests sr
    JOIN users u_req ON sr.requester_id = u_req.id
    JOIN users u_rec ON sr.receiver_id = u_rec.id
    JOIN skills s_off ON sr.offered_skill_id = s_off.id
    JOIN skills s_req ON sr.requested_skill_id = s_req.id
    WHERE sr.id = ? LIMIT 1
  `;

  const rows = await query(sql, [swapId]);
  if (rows.length === 0) {
    throw ApiError.notFound('Swap request not found.');
  }

  const swap = rows[0];
  if (swap.requester_id !== userId && swap.receiver_id !== userId) {
    throw ApiError.forbidden('You do not have permission to view this swap.');
  }

  return swap;
}

/**
 * Create a new swap request with comprehensive rule checks
 */
async function createSwapRequest(requesterId, { receiverId, offeredSkillId, requestedSkillId, message, scheduledDate = null }) {
  const recId = parseInt(receiverId, 10);
  const offId = parseInt(offeredSkillId, 10);
  const reqId = parseInt(requestedSkillId, 10);

  // 1. Rule: Cannot swap with oneself
  if (requesterId === recId) {
    throw ApiError.badRequest('You cannot initiate a skill swap with yourself.');
  }

  // 2. Rule: Verify recipient exists and is active
  const receivers = await query('SELECT id, name, is_active FROM users WHERE id = ? LIMIT 1', [recId]);
  if (receivers.length === 0 || !receivers[0].is_active) {
    throw ApiError.notFound('Recipient user not found or inactive.');
  }

  // 3. Rule: Validate offered skill belongs to requester
  const requesterSkills = await query(
    "SELECT id FROM user_skills WHERE user_id = ? AND skill_id = ? AND type = 'offered' LIMIT 1",
    [requesterId, offId]
  );
  if (requesterSkills.length === 0) {
    throw ApiError.badRequest('You must have the offered skill listed in your profile as an offered skill.');
  }

  // 4. Rule: Validate requested skill is offered by recipient
  const receiverSkills = await query(
    "SELECT id FROM user_skills WHERE user_id = ? AND skill_id = ? AND type = 'offered' LIMIT 1",
    [recId, reqId]
  );
  if (receiverSkills.length === 0) {
    throw ApiError.badRequest('The requested skill is not currently offered by the selected partner.');
  }

  // 5. Rule: Prevent duplicate active requests between the same users
  const activeSwaps = await query(
    `SELECT id FROM swap_requests 
     WHERE ((requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?))
       AND status IN ('pending', 'accepted')
     LIMIT 1`,
    [requesterId, recId, recId, requesterId]
  );
  if (activeSwaps.length > 0) {
    throw ApiError.conflict('An active swap exchange (pending or accepted) already exists with this partner.');
  }

  // 6. Execute in transaction
  return await withTransaction(async (conn) => {
    const [result] = await conn.execute(
      `INSERT INTO swap_requests 
       (requester_id, receiver_id, offered_skill_id, requested_skill_id, message, scheduled_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [requesterId, recId, offId, reqId, message || null, scheduledDate || null]
    );

    const swapId = result.insertId;

    // Send notification to recipient
    const [requesters] = await conn.execute('SELECT name FROM users WHERE id = ? LIMIT 1', [requesterId]);
    const requesterName = requesters[0]?.name || 'A user';

    await conn.execute(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES (?, 'swap_request', 'New Swap Proposal', ?, ?)`,
      [
        recId,
        `${requesterName} proposed a new skill exchange with you!`,
        JSON.stringify({ swap_id: swapId, requester_id: requesterId })
      ]
    );

    return { id: swapId, status: 'pending' };
  });
}

/**
 * Update swap request status with role-specific authorization
 */
async function updateSwapStatus(swapId, userId, newStatus) {
  const validStatuses = ['accepted', 'rejected', 'completed', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    throw ApiError.badRequest(`Invalid status. Allowed values: ${validStatuses.join(', ')}`);
  }

  const rows = await query('SELECT * FROM swap_requests WHERE id = ? LIMIT 1', [swapId]);
  if (rows.length === 0) {
    throw ApiError.notFound('Swap request not found.');
  }

  const swap = rows[0];

  // Specific transition rules
  if (newStatus === 'accepted' || newStatus === 'rejected') {
    if (swap.status !== 'pending') {
      throw ApiError.badRequest(`Cannot ${newStatus} a swap request that is currently '${swap.status}'.`);
    }
    // Only recipient can accept or reject
    if (swap.receiver_id !== userId) {
      throw ApiError.forbidden('Only the recipient of this swap proposal can accept or reject it.');
    }
  }

  if (newStatus === 'cancelled') {
    // Only requester can withdraw their own pending request
    if (swap.status !== 'pending') {
      throw ApiError.badRequest('Only pending swap proposals can be withdrawn.');
    }
    if (swap.requester_id !== userId) {
      throw ApiError.forbidden('Only the requester can withdraw a pending proposal.');
    }
  }

  if (newStatus === 'completed') {
    if (swap.status !== 'accepted') {
      throw ApiError.badRequest('Only currently accepted exchanges can be marked as completed.');
    }
    // Either participant can mark as completed
    if (swap.requester_id !== userId && swap.receiver_id !== userId) {
      throw ApiError.forbidden('You are not a participant in this exchange.');
    }
  }

  // Execute in transaction
  return await withTransaction(async (conn) => {
    await conn.execute('UPDATE swap_requests SET status = ? WHERE id = ?', [newStatus, swapId]);

    // Send counterparty notification
    const notifyRecipientId = swap.requester_id === userId ? swap.receiver_id : swap.requester_id;
    const [actionUsers] = await conn.execute('SELECT name FROM users WHERE id = ? LIMIT 1', [userId]);
    const actionUserName = actionUsers[0]?.name || 'Your partner';

    let title = 'Swap Update';
    let message = `Your swap request status was updated to '${newStatus}'.`;

    if (newStatus === 'accepted') {
      title = 'Swap Proposal Accepted! 🎉';
      message = `${actionUserName} accepted your skill exchange proposal! Get ready to learn and teach.`;
    } else if (newStatus === 'rejected') {
      title = 'Swap Proposal Declined';
      message = `${actionUserName} declined your swap proposal.`;
    } else if (newStatus === 'cancelled') {
      title = 'Swap Proposal Withdrawn';
      message = `${actionUserName} withdrew their swap proposal.`;
    } else if (newStatus === 'completed') {
      title = 'Swap Completed! 🌟';
      message = `${actionUserName} marked your skill swap as completed. Please leave a review!`;
    }

    await conn.execute(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES (?, ?, ?, ?, ?)`,
      [notifyRecipientId, `swap_${newStatus}`, title, message, JSON.stringify({ swap_id: swapId, status: newStatus })]
    );

    return { id: swapId, status: newStatus };
  });
}

/**
 * Withdraw or delete a pending swap proposal
 */
async function withdrawPendingSwap(swapId, userId) {
  const rows = await query('SELECT * FROM swap_requests WHERE id = ? LIMIT 1', [swapId]);
  if (rows.length === 0) {
    throw ApiError.notFound('Swap proposal not found.');
  }

  const swap = rows[0];

  if (swap.requester_id !== userId) {
    throw ApiError.forbidden('Only the requester can withdraw this proposal.');
  }

  if (swap.status !== 'pending') {
    throw ApiError.badRequest(`Cannot delete or withdraw a swap in '${swap.status}' state.`);
  }

  return await withTransaction(async (conn) => {
    await conn.execute('DELETE FROM swap_requests WHERE id = ?', [swapId]);

    // Notify recipient that proposal was cancelled
    await conn.execute(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES (?, 'swap_withdrawn', 'Swap Proposal Withdrawn', 'A pending skill swap proposal was withdrawn by the sender.', ?)`,
      [swap.receiver_id, JSON.stringify({ swap_id: swapId })]
    );

    return { success: true, message: 'Proposal withdrawn and removed.' };
  });
}

module.exports = {
  getUserSwaps,
  getSwapById,
  createSwapRequest,
  updateSwapStatus,
  withdrawPendingSwap
};
