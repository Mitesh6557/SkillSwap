/**
 * SkillSwap - Session Service
 * Manages skill-exchange sessions, booking conflict validation, status transitions, and alerts.
 */

const { query, withTransaction } = require('../config/database');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notificationService');

/**
 * Get all sessions for a user (upcoming, completed, pending, cancelled)
 */
async function getUserSessions(userId, { status = '' } = {}) {
  let sql = `
    SELECT 
      ss.id, ss.swap_id, ss.creator_id, ss.title, ss.topic, ss.session_date,
      ss.duration_minutes, ss.agenda, ss.meeting_url, ss.status,
      ss.created_at, ss.updated_at,
      sr.requester_id, sr.receiver_id, sr.status AS swap_status,
      s_off.name AS offered_skill_name, s_req.name AS requested_skill_name,
      u_req.id AS requester_user_id, u_req.name AS requester_name, u_req.avatar_url AS requester_avatar,
      u_rec.id AS receiver_user_id, u_rec.name AS receiver_name, u_rec.avatar_url AS receiver_avatar,
      u_creator.name AS creator_name
    FROM swap_sessions ss
    JOIN swap_requests sr ON ss.swap_id = sr.id
    JOIN skills s_off ON sr.offered_skill_id = s_off.id
    JOIN skills s_req ON sr.requested_skill_id = s_req.id
    JOIN users u_req ON sr.requester_id = u_req.id
    JOIN users u_rec ON sr.receiver_id = u_rec.id
    JOIN users u_creator ON ss.creator_id = u_creator.id
    WHERE sr.requester_id = ? OR sr.receiver_id = ?
  `;

  const params = [userId, userId];

  if (status) {
    sql += ` AND ss.status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY ss.session_date ASC`;

  const rows = await query(sql, params);

  // Decorate with partner details and role context
  return rows.map((session) => {
    const isRequester = session.requester_user_id === userId;
    const partner = isRequester
      ? { id: session.receiver_user_id, name: session.receiver_name, avatar_url: session.receiver_avatar }
      : { id: session.requester_user_id, name: session.requester_name, avatar_url: session.requester_avatar };

    const isCreator = session.creator_id === userId;

    return {
      ...session,
      partner,
      is_creator: isCreator,
      can_confirm: !isCreator && session.status === 'pending',
      can_cancel: ['pending', 'confirmed'].includes(session.status),
      can_complete: session.status === 'confirmed'
    };
  });
}

/**
 * Get session details by ID
 */
async function getSessionById(sessionId, userId) {
  const sql = `
    SELECT 
      ss.id, ss.swap_id, ss.creator_id, ss.title, ss.topic, ss.session_date,
      ss.duration_minutes, ss.agenda, ss.meeting_url, ss.status,
      ss.created_at, ss.updated_at,
      sr.requester_id, sr.receiver_id, sr.status AS swap_status,
      s_off.name AS offered_skill_name, s_req.name AS requested_skill_name,
      u_req.name AS requester_name, u_req.avatar_url AS requester_avatar,
      u_rec.name AS receiver_name, u_rec.avatar_url AS receiver_avatar
    FROM swap_sessions ss
    JOIN swap_requests sr ON ss.swap_id = sr.id
    JOIN skills s_off ON sr.offered_skill_id = s_off.id
    JOIN skills s_req ON sr.requested_skill_id = s_req.id
    JOIN users u_req ON sr.requester_id = u_req.id
    JOIN users u_rec ON sr.receiver_id = u_rec.id
    WHERE ss.id = ? LIMIT 1
  `;

  const rows = await query(sql, [sessionId]);
  if (rows.length === 0) {
    throw ApiError.notFound('Session not found.');
  }

  const session = rows[0];
  if (session.requester_id !== userId && session.receiver_id !== userId) {
    throw ApiError.forbidden('You do not have access to this session.');
  }

  return session;
}

/**
 * Schedule a new session for an accepted skill swap
 */
async function createSession(creatorId, {
  swapId,
  title,
  topic = null,
  sessionDate,
  durationMinutes = 60,
  agenda = null,
  meetingUrl = null
}) {
  const sId = parseInt(swapId, 10);
  const dur = parseInt(durationMinutes, 10) || 60;

  if (!sId || !title || !sessionDate) {
    throw ApiError.badRequest('swapId, title, and sessionDate are required.');
  }

  if (dur < 15 || dur > 240) {
    throw ApiError.badRequest('Session duration must be between 15 and 240 minutes.');
  }

  // 1. Verify swap exists, belongs to user, and is active
  const swaps = await query(
    `SELECT sr.id, sr.requester_id, sr.receiver_id, sr.status,
            s_off.name AS offered_skill_name, s_req.name AS requested_skill_name
     FROM swap_requests sr
     JOIN skills s_off ON sr.offered_skill_id = s_off.id
     JOIN skills s_req ON sr.requested_skill_id = s_req.id
     WHERE sr.id = ? LIMIT 1`,
    [sId]
  );

  if (swaps.length === 0) {
    throw ApiError.notFound('Skill swap request not found.');
  }

  const swap = swaps[0];

  if (swap.requester_id !== creatorId && swap.receiver_id !== creatorId) {
    throw ApiError.forbidden('You can only schedule sessions for your own skill swaps.');
  }

  if (swap.status !== 'accepted' && swap.status !== 'completed') {
    throw ApiError.badRequest(`Sessions can only be arranged for 'accepted' or 'completed' swaps. Current status: '${swap.status}'.`);
  }

  // 2. Validate session date is in the future
  const parsedDate = new Date(sessionDate);
  if (isNaN(parsedDate.getTime())) {
    throw ApiError.badRequest('Invalid sessionDate format. Use a valid date string.');
  }

  if (parsedDate.getTime() < Date.now() + 2 * 60 * 1000) {
    throw ApiError.badRequest('Session date and time must be scheduled in the future.');
  }

  const partnerId = swap.requester_id === creatorId ? swap.receiver_id : swap.requester_id;

  // 3. Concurrency / Conflict Detection:
  // Check if either participant already has a confirmed session that overlaps with this time window
  const sessionStart = parsedDate;
  const sessionEnd = new Date(parsedDate.getTime() + dur * 60 * 1000);

  const conflictCheck = await query(
    `SELECT ss.id, ss.title, ss.session_date, ss.duration_minutes
     FROM swap_sessions ss
     JOIN swap_requests sr ON ss.swap_id = sr.id
     WHERE (sr.requester_id IN (?, ?) OR sr.receiver_id IN (?, ?))
       AND ss.status = 'confirmed'
       AND ss.session_date < ?
       AND DATE_ADD(ss.session_date, INTERVAL ss.duration_minutes MINUTE) > ?
     LIMIT 1`,
    [creatorId, partnerId, creatorId, partnerId, sessionEnd, sessionStart]
  );

  if (conflictCheck.length > 0) {
    throw ApiError.conflict(
      `Scheduling conflict: Either you or your partner already has a confirmed session booked between ${sessionStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} and ${sessionEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
    );
  }

  // 4. Create session and sync swap scheduled date in transaction
  return await withTransaction(async (conn) => {
    const [result] = await conn.execute(
      `INSERT INTO swap_sessions 
       (swap_id, creator_id, title, topic, session_date, duration_minutes, agenda, meeting_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [sId, creatorId, title.trim(), topic ? topic.trim() : null, parsedDate, dur, agenda ? agenda.trim() : null, meetingUrl ? meetingUrl.trim() : null]
    );

    const sessionId = result.insertId;

    // Update scheduled_date on parent swap
    await conn.execute('UPDATE swap_requests SET scheduled_date = ? WHERE id = ?', [parsedDate, sId]);

    // Send in-app notification to partner
    const [creators] = await conn.execute('SELECT name FROM users WHERE id = ? LIMIT 1', [creatorId]);
    const creatorName = creators[0]?.name || 'Your swap partner';

    await conn.execute(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES (?, 'session_invitation', 'New Session Scheduled 📅', ?, ?)`,
      [
        partnerId,
        `${creatorName} scheduled a skill exchange session: "${title}" for ${parsedDate.toLocaleString()}.`,
        JSON.stringify({ session_id: sessionId, swap_id: sId, creator_id: creatorId })
      ]
    );

    return {
      id: sessionId,
      swap_id: sId,
      creator_id: creatorId,
      title,
      topic,
      session_date: parsedDate,
      duration_minutes: dur,
      status: 'pending'
    };
  });
}

/**
 * Update session status (confirmed, completed, cancelled)
 */
async function updateSessionStatus(sessionId, userId, newStatus) {
  const allowed = ['confirmed', 'completed', 'cancelled'];
  if (!allowed.includes(newStatus)) {
    throw ApiError.badRequest(`Invalid session status. Allowed: ${allowed.join(', ')}`);
  }

  const rows = await query(
    `SELECT ss.*, sr.requester_id, sr.receiver_id 
     FROM swap_sessions ss
     JOIN swap_requests sr ON ss.swap_id = sr.id
     WHERE ss.id = ? LIMIT 1`,
    [sessionId]
  );

  if (rows.length === 0) {
    throw ApiError.notFound('Session not found.');
  }

  const session = rows[0];

  // Authorization check
  if (session.requester_id !== userId && session.receiver_id !== userId) {
    throw ApiError.forbidden('You are not authorized to update this session.');
  }

  const partnerId = session.requester_id === userId ? session.receiver_id : session.requester_id;

  // Status-specific rules
  if (newStatus === 'confirmed') {
    if (session.status !== 'pending') {
      throw ApiError.badRequest(`Cannot confirm a session that is currently '${session.status}'.`);
    }
    if (session.creator_id === userId) {
      throw ApiError.badRequest('You proposed this session; the other participant must confirm it.');
    }
  }

  if (newStatus === 'completed') {
    if (session.status !== 'confirmed') {
      throw ApiError.badRequest(`Only confirmed sessions can be marked as completed. Current: '${session.status}'.`);
    }
  }

  if (newStatus === 'cancelled') {
    if (session.status === 'cancelled' || session.status === 'completed') {
      throw ApiError.badRequest(`Cannot cancel a session that is already '${session.status}'.`);
    }
  }

  return await withTransaction(async (conn) => {
    await conn.execute('UPDATE swap_sessions SET status = ? WHERE id = ?', [newStatus, sessionId]);

    const [actionUsers] = await conn.execute('SELECT name FROM users WHERE id = ? LIMIT 1', [userId]);
    const actionUserName = actionUsers[0]?.name || 'Your partner';

    let title = 'Session Update';
    let message = `Session "${session.title}" was updated to '${newStatus}'.`;

    if (newStatus === 'confirmed') {
      title = 'Session Confirmed! 🚀';
      message = `${actionUserName} confirmed your scheduled session: "${session.title}".`;
    } else if (newStatus === 'cancelled') {
      title = 'Session Cancelled ❌';
      message = `${actionUserName} cancelled the session: "${session.title}".`;
    } else if (newStatus === 'completed') {
      title = 'Session Completed! 🎉';
      message = `${actionUserName} marked the session "${session.title}" as completed.`;
    }

    await conn.execute(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES (?, ?, ?, ?, ?)`,
      [partnerId, `session_${newStatus}`, title, message, JSON.stringify({ session_id: sessionId, status: newStatus })]
    );

    return { id: sessionId, status: newStatus };
  });
}

/**
 * Reschedule an existing session
 */
async function rescheduleSession(sessionId, userId, { sessionDate, durationMinutes, agenda, title }) {
  const rows = await query(
    `SELECT ss.*, sr.requester_id, sr.receiver_id 
     FROM swap_sessions ss
     JOIN swap_requests sr ON ss.swap_id = sr.id
     WHERE ss.id = ? LIMIT 1`,
    [sessionId]
  );

  if (rows.length === 0) {
    throw ApiError.notFound('Session not found.');
  }

  const session = rows[0];

  if (session.requester_id !== userId && session.receiver_id !== userId) {
    throw ApiError.forbidden('You are not authorized to reschedule this session.');
  }

  if (session.status === 'completed' || session.status === 'cancelled') {
    throw ApiError.badRequest(`Cannot reschedule a session that is '${session.status}'.`);
  }

  const parsedDate = new Date(sessionDate);
  if (isNaN(parsedDate.getTime()) || parsedDate.getTime() < Date.now() + 2 * 60 * 1000) {
    throw ApiError.badRequest('New session date must be a valid future timestamp.');
  }

  const dur = parseInt(durationMinutes, 10) || session.duration_minutes;
  const newTitle = title ? title.trim() : session.title;
  const newAgenda = agenda !== undefined ? agenda : session.agenda;
  const partnerId = session.requester_id === userId ? session.receiver_id : session.requester_id;

  return await withTransaction(async (conn) => {
    // When rescheduled, it transitions back to pending confirmation by the other party
    await conn.execute(
      `UPDATE swap_sessions 
       SET session_date = ?, duration_minutes = ?, title = ?, agenda = ?, status = 'pending', creator_id = ?
       WHERE id = ?`,
      [parsedDate, dur, newTitle, newAgenda, userId, sessionId]
    );

    await conn.execute('UPDATE swap_requests SET scheduled_date = ? WHERE id = ?', [parsedDate, session.swap_id]);

    const [actionUsers] = await conn.execute('SELECT name FROM users WHERE id = ? LIMIT 1', [userId]);
    const actionUserName = actionUsers[0]?.name || 'Your partner';

    await conn.execute(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES (?, 'session_rescheduled', 'Session Rescheduled 🔄', ?, ?)`,
      [
        partnerId,
        `${actionUserName} proposed a new time for "${newTitle}": ${parsedDate.toLocaleString()}. Please review and confirm.`,
        JSON.stringify({ session_id: sessionId, status: 'pending' })
      ]
    );

    return {
      id: sessionId,
      title: newTitle,
      session_date: parsedDate,
      duration_minutes: dur,
      status: 'pending'
    };
  });
}

module.exports = {
  getUserSessions,
  getSessionById,
  createSession,
  updateSessionStatus,
  rescheduleSession
};
