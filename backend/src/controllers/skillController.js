/**
 * SkillSwap - Skill Controller
 */

const skillService = require('../services/skillService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * List catalog skills
 * GET /api/skills
 */
const getAll = asyncHandler(async (req, res) => {
  const { search, category } = req.query;
  const skills = await skillService.getAllSkills({ search, category });

  res.status(200).json({
    success: true,
    count: skills.length,
    data: skills
  });
});

/**
 * List categories
 * GET /api/skills/categories
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await skillService.getSkillCategories();

  res.status(200).json({
    success: true,
    data: categories
  });
});

/**
 * Add a skill to catalog
 * POST /api/skills
 */
const create = asyncHandler(async (req, res) => {
  const { name, category, description } = req.body;
  if (!name || !category) {
    throw ApiError.badRequest('Skill name and category are required.');
  }

  const skill = await skillService.createSkill({ name, category, description });

  res.status(201).json({
    success: true,
    message: 'Skill added to catalog.',
    data: skill
  });
});

/**
 * Add skill to user profile
 * POST /api/skills/user
 */
const addUserSkill = asyncHandler(async (req, res) => {
  const { skillId, type, proficiencyLevel, description } = req.body;

  if (!skillId || !type) {
    throw ApiError.badRequest('skillId and type (offered/wanted) are required.');
  }

  const result = await skillService.addUserSkill(req.user.id, {
    skillId,
    type,
    proficiencyLevel,
    description
  });

  res.status(201).json({
    success: true,
    message: 'Skill added to profile.',
    data: result
  });
});

/**
 * Remove skill from user profile
 * DELETE /api/skills/user/:userSkillId
 */
const removeUserSkill = asyncHandler(async (req, res) => {
  await skillService.removeUserSkill(req.user.id, req.params.userSkillId);

  res.status(200).json({
    success: true,
    message: 'Skill removed from profile.'
  });
});

/**
 * Update catalog skill (Admin)
 * PUT /api/skills/:id
 */
const update = asyncHandler(async (req, res) => {
  const { name, category, description } = req.body;
  const updated = await skillService.updateSkill(req.params.id, { name, category, description });

  res.status(200).json({
    success: true,
    message: 'Skill updated successfully.',
    data: updated
  });
});

/**
 * Update user skill proficiency or notes
 * PUT /api/skills/user/:userSkillId
 */
const updateUserSkill = asyncHandler(async (req, res) => {
  const { proficiencyLevel, description } = req.body;
  const updated = await skillService.updateUserSkill(req.user.id, req.params.userSkillId, {
    proficiencyLevel,
    description
  });

  res.status(200).json({
    success: true,
    message: 'Profile skill updated successfully.',
    data: updated
  });
});

module.exports = {
  getAll,
  getCategories,
  create,
  update,
  addUserSkill,
  updateUserSkill,
  removeUserSkill
};
