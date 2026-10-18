/**
 * SkillSwap - Admin Controller
 * Privileged operations: metrics, moderation, skills, swap monitoring, audit logs, announcements, and CSV exports.
 */

const { query } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * Get platform metrics overview
 * GET /api/admin/stats
 */
const getStats = asyncHandler(async (req, res) => {
  const [usersCount] = await query('SELECT COUNT(*) AS total FROM users');
  const [publicUsersCount] = await query('SELECT COUNT(*) AS total FROM users WHERE is_public = 1 AND is_active = 1');
  const [swapsCount] = await query('SELECT COUNT(*) AS total FROM swap_requests');
  const [pendingSwapsCount] = await query("SELECT COUNT(*) AS total FROM swap_requests WHERE status = 'pending'");
  const [acceptedSwapsCount] = await query("SELECT COUNT(*) AS total FROM swap_requests WHERE status = 'accepted'");
  const [rejectedSwapsCount] = await query("SELECT COUNT(*) AS total FROM swap_requests WHERE status = 'rejected'");
  const [cancelledSwapsCount] = await query("SELECT COUNT(*) AS total FROM swap_requests WHERE status = 'cancelled'");
  const [completedSwapsCount] = await query("SELECT COUNT(*) AS total FROM swap_requests WHERE status = 'completed'");
  const [skillsCount] = await query('SELECT COUNT(*) AS total FROM skills');
  const [pendingReportsCount] = await query("SELECT COUNT(*) AS total FROM reports WHERE status = 'pending'");

  res.status(200).json({
    success: true,
    data: {
      totalUsers: usersCount.total,
      publicProfiles: publicUsersCount.total,
      totalSwaps: swapsCount.total,
      pendingSwaps: pendingSwapsCount.total,
      acceptedSwaps: acceptedSwapsCount.total,
      rejectedSwaps: rejectedSwapsCount.total,
      cancelledSwaps: cancelledSwapsCount.total,
      completedSwaps: completedSwapsCount.total,
      totalSkills: skillsCount.total,
      pendingReports: pendingReportsCount.total
    }
  });
});

/**
 * List all users with moderation details
 * GET /api/admin/users
 */
const getUsers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  let sql = `
    SELECT id, name, email, role, is_active, is_public, location, availability, created_at
    FROM users
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    sql += ' AND (name LIKE ? OR email LIKE ? OR location LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY created_at DESC';
  const users = await query(sql, params);

  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

/**
 * Toggle user active status (suspend/activate)
 * PATCH /api/admin/users/:id/status
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const targetId = req.params.id;

  if (isActive === undefined) {
    throw ApiError.badRequest('isActive boolean value is required.');
  }

  await query('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, targetId]);

  // Record audit log
  await query(
    `INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      isActive ? 'USER_REACTIVATED' : 'USER_SUSPENDED',
      'user',
      targetId,
      JSON.stringify({ isActive }),
      req.ip || '127.0.0.1'
    ]
  );

  res.status(200).json({
    success: true,
    message: `User status updated to ${isActive ? 'active' : 'suspended'}.`
  });
});

/**
 * Monitor all platform swap requests
 * GET /api/admin/swaps
 */
const getAllSwaps = asyncHandler(async (req, res) => {
  const sql = `
    SELECT 
      sr.id, sr.status, sr.message, sr.scheduled_date, sr.created_at, sr.updated_at,
      u_req.id AS requester_id, u_req.name AS requester_name, u_req.email AS requester_email,
      u_rec.id AS receiver_id, u_rec.name AS receiver_name, u_rec.email AS receiver_email,
      s_off.name AS offered_skill_name, s_req.name AS requested_skill_name
    FROM swap_requests sr
    JOIN users u_req ON sr.requester_id = u_req.id
    JOIN users u_rec ON sr.receiver_id = u_rec.id
    JOIN skills s_off ON sr.offered_skill_id = s_off.id
    JOIN skills s_req ON sr.requested_skill_id = s_req.id
    ORDER BY sr.created_at DESC
    LIMIT 100
  `;

  const swaps = await query(sql);

  res.status(200).json({
    success: true,
    count: swaps.length,
    data: swaps
  });
});

/**
 * Delete a skill from catalog (Admin content moderation)
 * DELETE /api/admin/skills/:id
 */
const deleteSkill = asyncHandler(async (req, res) => {
  const skillId = req.params.id;
  const skill = await query('SELECT name FROM skills WHERE id = ?', [skillId]);
  if (skill.length === 0) {
    throw ApiError.notFound('Skill not found.');
  }

  await query('DELETE FROM skills WHERE id = ?', [skillId]);

  // Record audit log
  await query(
    `INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address)
     VALUES (?, 'SKILL_DELETED', 'skill', ?, ?, ?)`,
    [req.user.id, skillId, JSON.stringify({ name: skill[0].name }), req.ip || '127.0.0.1']
  );

  res.status(200).json({
    success: true,
    message: `Skill '${skill[0].name}' was removed from the catalog.`
  });
});

/**
 * List reports
 * GET /api/admin/reports
 */
const getReports = asyncHandler(async (req, res) => {
  const reports = await query(
    `SELECT r.*, 
            u_rep.name AS reporter_name,
            u_rep.email AS reporter_email,
            u_tar.name AS reported_user_name,
            u_tar.email AS reported_user_email,
            u_tar.is_active AS reported_user_is_active
     FROM reports r
     JOIN users u_rep ON r.reporter_id = u_rep.id
     LEFT JOIN users u_tar ON r.reported_user_id = u_tar.id
     ORDER BY r.created_at DESC`
  );

  res.status(200).json({
    success: true,
    count: reports.length,
    data: reports
  });
});

/**
 * Update report status
 * PATCH /api/admin/reports/:id
 */
const updateReportStatus = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body;

  await query(
    'UPDATE reports SET status = ?, admin_notes = ? WHERE id = ?',
    [status, adminNotes || null, req.params.id]
  );

  // Record audit log
  await query(
    `INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address)
     VALUES (?, 'REPORT_STATUS_UPDATED', 'report', ?, ?, ?)`,
    [req.user.id, req.params.id, JSON.stringify({ status, adminNotes }), req.ip || '127.0.0.1']
  );

  res.status(200).json({
    success: true,
    message: 'Report updated successfully.'
  });
});

/**
 * List audit logs
 * GET /api/admin/audit-logs
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const logs = await query(
    `SELECT a.*, u.name AS admin_name, u.email AS admin_email
     FROM admin_audit_logs a
     JOIN users u ON a.admin_id = u.id
     ORDER BY a.created_at DESC
     LIMIT 100`
  );

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs
  });
});

/**
 * Create announcement
 * POST /api/admin/announcements
 */
const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    throw ApiError.badRequest('Title and content are required.');
  }

  const result = await query(
    'INSERT INTO announcements (admin_id, title, content) VALUES (?, ?, ?)',
    [req.user.id, title, content]
  );

  // Record audit log
  await query(
    `INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address)
     VALUES (?, 'ANNOUNCEMENT_CREATED', 'announcement', ?, ?, ?)`,
    [req.user.id, result.insertId, JSON.stringify({ title }), req.ip || '127.0.0.1']
  );

  res.status(201).json({
    success: true,
    message: 'Announcement published successfully.',
    data: { id: result.insertId, title, content }
  });
});

/**
 * Helper to escape CSV strings
 */
function toCsvRow(items) {
  return items.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',') + '\r\n';
}

/**
 * CSV Export: User Activity
 * GET /api/admin/export/users
 */
const exportUsersCsv = asyncHandler(async (req, res) => {
  const users = await query(
    `SELECT id, name, email, role, is_active, is_public, location, availability, created_at
     FROM users ORDER BY id ASC`
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=skillswap_users.csv');

  let csv = toCsvRow(['User ID', 'Name', 'Email', 'Role', 'Status', 'Visibility', 'Location', 'Availability', 'Joined Date']);
  for (const u of users) {
    csv += toCsvRow([
      u.id,
      u.name,
      u.email,
      u.role,
      u.is_active ? 'Active' : 'Suspended',
      u.is_public ? 'Public' : 'Private',
      u.location || '',
      u.availability || '',
      u.created_at
    ]);
  }

  res.status(200).send(csv);
});

/**
 * CSV Export: Swap Statistics
 * GET /api/admin/export/swaps
 */
const exportSwapsCsv = asyncHandler(async (req, res) => {
  const swaps = await query(
    `SELECT sr.id, sr.status, sr.message, sr.created_at, sr.updated_at,
            u_req.name AS requester, u_rec.name AS receiver,
            s_off.name AS offered_skill, s_req.name AS requested_skill
     FROM swap_requests sr
     JOIN users u_req ON sr.requester_id = u_req.id
     JOIN users u_rec ON sr.receiver_id = u_rec.id
     JOIN skills s_off ON sr.offered_skill_id = s_off.id
     JOIN skills s_req ON sr.requested_skill_id = s_req.id
     ORDER BY sr.id ASC`
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=skillswap_swaps.csv');

  let csv = toCsvRow(['Swap ID', 'Requester', 'Receiver', 'Offered Skill', 'Requested Skill', 'Status', 'Date Created', 'Last Updated']);
  for (const s of swaps) {
    csv += toCsvRow([
      s.id,
      s.requester,
      s.receiver,
      s.offered_skill,
      s.requested_skill,
      s.status,
      s.created_at,
      s.updated_at
    ]);
  }

  res.status(200).send(csv);
});

/**
 * CSV Export: Feedback & Ratings Logs
 * GET /api/admin/export/feedback
 */
const exportFeedbackCsv = asyncHandler(async (req, res) => {
  const reviews = await query(
    `SELECT r.id, r.swap_id, r.rating, r.comment, r.created_at,
            u_rev.name AS reviewer_name, u_rec.name AS reviewee_name
     FROM reviews r
     JOIN users u_rev ON r.reviewer_id = u_rev.id
     JOIN users u_rec ON r.reviewee_id = u_rec.id
     ORDER BY r.id ASC`
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=skillswap_feedback.csv');

  let csv = toCsvRow(['Review ID', 'Swap ID', 'Reviewer', 'Reviewee', 'Rating (1-5)', 'Comment', 'Review Date']);
  for (const r of reviews) {
    csv += toCsvRow([
      r.id,
      r.swap_id,
      r.reviewer_name,
      r.reviewee_name,
      r.rating,
      r.comment || '',
      r.created_at
    ]);
  }

  res.status(200).send(csv);
});

module.exports = {
  getStats,
  getUsers,
  toggleUserStatus,
  getAllSwaps,
  deleteSkill,
  getReports,
  updateReportStatus,
  getAuditLogs,
  createAnnouncement,
  exportUsersCsv,
  exportSwapsCsv,
  exportFeedbackCsv
};
