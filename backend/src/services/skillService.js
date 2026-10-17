/**
 * SkillSwap - Skill Service
 * Handles global skills catalog and user-specific skill associations.
 */

const { query } = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Get all catalog skills with optional search & category filter
 */
async function getAllSkills({ search = '', category = '' }) {
  let sql = 'SELECT id, name, category, description, created_at FROM skills WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  sql += ' ORDER BY name ASC';
  return await query(sql, params);
}

/**
 * Get distinct skill categories
 */
async function getSkillCategories() {
  const rows = await query('SELECT DISTINCT category FROM skills ORDER BY category ASC');
  return rows.map((r) => r.category);
}

/**
 * Create a new skill in catalog
 */
async function createSkill({ name, category, description = null }) {
  const existing = await query('SELECT id FROM skills WHERE name = ? LIMIT 1', [name.trim()]);
  if (existing.length > 0) {
    throw ApiError.conflict(`Skill '${name}' already exists.`);
  }

  const result = await query(
    'INSERT INTO skills (name, category, description) VALUES (?, ?, ?)',
    [name.trim(), category.trim(), description]
  );

  return { id: result.insertId, name: name.trim(), category: category.trim(), description };
}

/**
 * Add a skill to user profile (offered or wanted)
 */
async function addUserSkill(userId, { skillId, type, proficiencyLevel = 'intermediate', description = null }) {
  // Check if skill exists
  const skill = await query('SELECT id FROM skills WHERE id = ? LIMIT 1', [skillId]);
  if (skill.length === 0) {
    throw ApiError.notFound('Skill not found in catalog.');
  }

  // Check duplicate
  const existing = await query(
    'SELECT id FROM user_skills WHERE user_id = ? AND skill_id = ? AND type = ? LIMIT 1',
    [userId, skillId, type]
  );

  if (existing.length > 0) {
    throw ApiError.conflict(`You have already added this skill as '${type}'.`);
  }

  const result = await query(
    `INSERT INTO user_skills (user_id, skill_id, type, proficiency_level, description)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, skillId, type, proficiencyLevel, description]
  );

  return { id: result.insertId, user_id: userId, skill_id: skillId, type, proficiency_level: proficiencyLevel };
}

/**
 * Remove skill from user profile
 */
async function removeUserSkill(userId, userSkillId) {
  const result = await query(
    'DELETE FROM user_skills WHERE id = ? AND user_id = ?',
    [userSkillId, userId]
  );

  if (result.affectedRows === 0) {
    throw ApiError.notFound('Skill assignment not found or does not belong to you.');
  }

  return { success: true };
}

/**
 * Update an existing catalog skill
 */
async function updateSkill(skillId, { name, category, description }) {
  await query(
    `UPDATE skills
     SET name = COALESCE(?, name),
         category = COALESCE(?, category),
         description = COALESCE(?, description)
     WHERE id = ?`,
    [name !== undefined ? name.trim() : null, category !== undefined ? category.trim() : null, description !== undefined ? description : null, skillId]
  );
  const rows = await query('SELECT * FROM skills WHERE id = ?', [skillId]);
  return rows[0];
}

/**
 * Update user skill proficiency level and description
 */
async function updateUserSkill(userId, userSkillId, { proficiencyLevel, description }) {
  const result = await query(
    `UPDATE user_skills
     SET proficiency_level = COALESCE(?, proficiency_level),
         description = COALESCE(?, description)
     WHERE id = ? AND user_id = ?`,
    [proficiencyLevel || null, description !== undefined ? description : null, userSkillId, userId]
  );

  if (result.affectedRows === 0) {
    throw ApiError.notFound('Skill assignment not found or does not belong to you.');
  }

  const rows = await query('SELECT * FROM user_skills WHERE id = ?', [userSkillId]);
  return rows[0];
}

module.exports = {
  getAllSkills,
  getSkillCategories,
  createSkill,
  updateSkill,
  addUserSkill,
  updateUserSkill,
  removeUserSkill
};
