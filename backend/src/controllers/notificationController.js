/**
 * SkillSwap - Notification Controller
 */

const notificationService = require('../services/notificationService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get user notifications
 * GET /api/notifications
 */
const getAll = asyncHandler(async (req, res) => {
  const notifications = await notificationService.getUserNotifications(req.user.id);

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications
  });
});

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
const markRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAsRead(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Notification marked as read.',
    data: result
  });
});

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read.',
    data: result
  });
});

module.exports = {
  getAll,
  markRead,
  markAllRead
};
