/**
 * SkillSwap - Session Controller
 */

const sessionService = require('../services/sessionService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * Get all sessions for current user
 * GET /api/sessions
 */
const getMySessions = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const sessions = await sessionService.getUserSessions(req.user.id, { status });

  res.status(200).json({
    success: true,
    count: sessions.length,
    data: sessions
  });
});

/**
 * Get session by ID
 * GET /api/sessions/:id
 */
const getById = asyncHandler(async (req, res) => {
  const session = await sessionService.getSessionById(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: session
  });
});

/**
 * Schedule a new session
 * POST /api/sessions
 */
const create = asyncHandler(async (req, res) => {
  const {
    swapId,
    swap_id,
    title,
    topic,
    sessionDate,
    session_date,
    durationMinutes,
    duration_minutes,
    agenda,
    meetingUrl,
    meeting_url
  } = req.body;

  const targetSwapId = swapId || swap_id;
  const targetDate = sessionDate || session_date;
  const targetDuration = durationMinutes || duration_minutes;
  const targetMeeting = meetingUrl || meeting_url;

  if (!targetSwapId || !title || !targetDate) {
    throw ApiError.badRequest('swapId, title, and sessionDate are required.');
  }

  const session = await sessionService.createSession(req.user.id, {
    swapId: targetSwapId,
    title,
    topic,
    sessionDate: targetDate,
    durationMinutes: targetDuration,
    agenda,
    meetingUrl: targetMeeting
  });

  res.status(201).json({
    success: true,
    message: 'Skill exchange session scheduled successfully.',
    data: session
  });
});

/**
 * Update session status (confirm, complete, cancel)
 * PATCH /api/sessions/:id/status
 */
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    throw ApiError.badRequest('Status is required.');
  }

  const result = await sessionService.updateSessionStatus(req.params.id, req.user.id, status);

  res.status(200).json({
    success: true,
    message: `Session status updated to '${status}'.`,
    data: result
  });
});

/**
 * Reschedule an existing session
 * PATCH /api/sessions/:id/reschedule
 */
const reschedule = asyncHandler(async (req, res) => {
  const { sessionDate, session_date, durationMinutes, duration_minutes, agenda, title } = req.body;
  const targetDate = sessionDate || session_date;

  if (!targetDate) {
    throw ApiError.badRequest('sessionDate is required to reschedule.');
  }

  const result = await sessionService.rescheduleSession(req.params.id, req.user.id, {
    sessionDate: targetDate,
    durationMinutes: durationMinutes || duration_minutes,
    agenda,
    title
  });

  res.status(200).json({
    success: true,
    message: 'Session rescheduled successfully and sent for confirmation.',
    data: result
  });
});

module.exports = {
  getMySessions,
  getById,
  create,
  updateStatus,
  reschedule
};
