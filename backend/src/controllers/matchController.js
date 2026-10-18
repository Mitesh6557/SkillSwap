/**
 * SkillSwap - Smart Matches Controller
 */

const matchService = require('../services/matchService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get personalized smart skill matches for authenticated user
 * GET /api/matches
 */
const getMatches = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = parseInt(req.query.offset, 10) || 0;

  const result = await matchService.getSmartMatches(req.user.id, { limit, offset });

  res.status(200).json({
    success: true,
    total: result.total,
    count: result.count,
    userSkillsCount: result.user_skills_count,
    message: result.message || null,
    data: result.matches
  });
});

module.exports = {
  getMatches
};
