/**
 * SkillSwap - Notification Service
 * Manages in-app alerts, swap notifications, and read states.
 */

const { query } = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Create a new notification
 */
async function createNotification({ userId, type, title, message, data = null }) {
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, type, title, message, data ? JSON.stringify(data) : null]
  );

  return { id: result.insertId, user_id: userId, type, title, message, is_read: false };
}

/**
 * Get all notifications for a specific user
 */
async function getUserNotifications(userId) {
  const rows = await query(
    `SELECT id, type, title, message, is_read, data, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );

  return rows.map((row) => ({
    ...row,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  }));
}

/**
 * Mark a single notification as read
 */
async function markAsRead(notificationId, userId) {
  const result = await query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );

  if (result.affectedRows === 0) {
    throw ApiError.notFound('Notification not found.');
  }

  return { success: true };
}

/**
 * Mark all notifications as read for a user
 */
async function markAllAsRead(userId) {
  await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  return { success: true };
}

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead
};
