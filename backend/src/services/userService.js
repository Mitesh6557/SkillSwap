/**
 * SkillSwap - User Service
 * Business logic for user profiles, search, filtering, and avatar management.
 */

const { query } = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Get public users with advanced filters (offered skill, wanted skill, location, availability)
 */
async function getAllUsers({
  search = '',
  offeredSkill = '',
  wantedSkill = '',
  location = '',
  availability = '',
  limit = 20,
  offset = 0
}) {
  let sql = `
    SELECT DISTINCT u.id, u.name, u.email, u.avatar_url, u.bio, u.location, u.availability, u.role, u.created_at
    FROM users u
    WHERE u.is_active = 1 AND u.is_public = 1
  `;
  const params = [];

  if (search) {
    sql += ` AND (
      u.name LIKE ? OR 
      u.bio LIKE ? OR 
      u.location LIKE ? OR
      EXISTS (
        SELECT 1 FROM user_skills us_s
        JOIN skills s_s ON us_s.skill_id = s_s.id
        WHERE us_s.user_id = u.id AND s_s.name LIKE ?
      )
    )`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (offeredSkill) {
    sql += ` AND EXISTS (
      SELECT 1 FROM user_skills us_off
      JOIN skills s_off ON us_off.skill_id = s_off.id
      WHERE us_off.user_id = u.id AND us_off.type = 'offered' AND s_off.name LIKE ?
    )`;
    params.push(`%${offeredSkill}%`);
  }

  if (wantedSkill) {
    sql += ` AND EXISTS (
      SELECT 1 FROM user_skills us_want
      JOIN skills s_want ON us_want.skill_id = s_want.id
      WHERE us_want.user_id = u.id AND us_want.type = 'wanted' AND s_want.name LIKE ?
    )`;
    params.push(`%${wantedSkill}%`);
  }

  if (location) {
    sql += ` AND u.location LIKE ?`;
    params.push(`%${location}%`);
  }

  if (availability) {
    sql += ` AND u.availability LIKE ?`;
    params.push(`%${availability}%`);
  }

  sql += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const users = await query(sql, params);

  // Attach offered & wanted skills for each public user
  for (const user of users) {
    const skills = await query(
      `SELECT us.id AS user_skill_id, us.type, us.proficiency_level, us.description,
              s.id AS skill_id, s.name, s.category
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = ?`,
      [user.id]
    );

    user.offered_skills = skills.filter((s) => s.type === 'offered');
    user.wanted_skills = skills.filter((s) => s.type === 'wanted');

    // Aggregate rating
    const ratingStats = await query(
      `SELECT COUNT(id) AS review_count, AVG(rating) AS avg_rating
       FROM reviews
       WHERE reviewee_id = ?`,
      [user.id]
    );

    user.review_count = ratingStats[0]?.review_count || 0;
    user.avg_rating = ratingStats[0]?.avg_rating ? parseFloat(ratingStats[0].avg_rating).toFixed(1) : null;
  }

  return users;
}

/**
 * Get user profile by ID with skills and rating summaries
 * Enforces privacy check if profile is private
 */
async function getUserById(userId, requestingUserId = null, isAdmin = false) {
  const users = await query(
    `SELECT id, name, email, avatar_url, bio, location, availability, is_public, role, created_at
     FROM users
     WHERE id = ? AND is_active = 1 LIMIT 1`,
    [userId]
  );

  if (users.length === 0) {
    throw ApiError.notFound('User profile not found or inactive.');
  }

  const user = users[0];

  // Authorization check: if private, only owner or admin can view
  if (!user.is_public && parseInt(requestingUserId, 10) !== user.id && !isAdmin) {
    throw ApiError.forbidden('This user profile is private.');
  }

  // Fetch skills
  const skills = await query(
    `SELECT us.id AS user_skill_id, us.type, us.proficiency_level, us.description,
            s.id AS skill_id, s.name, s.category
     FROM user_skills us
     JOIN skills s ON us.skill_id = s.id
     WHERE us.user_id = ?`,
    [userId]
  );

  user.offered_skills = skills.filter((s) => s.type === 'offered');
  user.wanted_skills = skills.filter((s) => s.type === 'wanted');

  // Rating aggregate
  const ratingStats = await query(
    `SELECT COUNT(id) AS review_count, AVG(rating) AS avg_rating
     FROM reviews
     WHERE reviewee_id = ?`,
    [userId]
  );

  user.review_count = ratingStats[0]?.review_count || 0;
  user.avg_rating = ratingStats[0]?.avg_rating ? parseFloat(ratingStats[0].avg_rating).toFixed(1) : null;

  return user;
}

/**
 * Update user profile
 */
async function updateUserProfile(userId, { name, bio, location, availability, is_public }) {
  await query(
    `UPDATE users
     SET name = COALESCE(?, name),
         bio = COALESCE(?, bio),
         location = COALESCE(?, location),
         availability = COALESCE(?, availability),
         is_public = COALESCE(?, is_public)
     WHERE id = ?`,
    [
      name !== undefined ? name : null,
      bio !== undefined ? bio : null,
      location !== undefined ? location : null,
      availability !== undefined ? availability : null,
      is_public !== undefined ? (is_public ? 1 : 0) : null,
      userId
    ]
  );

  return getUserById(userId, userId, false);
}

/**
 * Update user avatar URL
 */
async function updateAvatar(userId, avatarUrl) {
  await query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);
  return { avatar_url: avatarUrl };
}

module.exports = {
  getAllUsers,
  getUserById,
  updateUserProfile,
  updateAvatar
};
