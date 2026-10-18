/**
 * SkillSwap - Smart Skill Matching Service
 * Deterministic, transparent, and reciprocal skill compatibility scoring algorithm.
 */

const { query } = require('../config/database');

/**
 * Calculate smart skill recommendations for an authenticated user
 */
async function getSmartMatches(userId, { limit = 20, offset = 0 } = {}) {
  // 1. Fetch current user's profile and skills
  const currentUserRows = await query(
    `SELECT id, name, location, availability FROM users WHERE id = ? AND is_active = 1 LIMIT 1`,
    [userId]
  );

  if (currentUserRows.length === 0) {
    return { matches: [], total: 0 };
  }

  const currentUser = currentUserRows[0];

  const mySkills = await query(
    `SELECT us.skill_id, us.type, us.proficiency_level, s.name, s.category
     FROM user_skills us
     JOIN skills s ON us.skill_id = s.id
     WHERE us.user_id = ?`,
    [userId]
  );

  const myOffered = mySkills.filter((s) => s.type === 'offered');
  const myWanted = mySkills.filter((s) => s.type === 'wanted');

  // If user has not listed any skills yet, return empty list with guidance
  if (myOffered.length === 0 && myWanted.length === 0) {
    return {
      matches: [],
      total: 0,
      user_skills_count: 0,
      message: 'Add offered and wanted skills to your profile to unlock personalized smart recommendations.'
    };
  }

  const myOfferedIds = new Set(myOffered.map((s) => s.skill_id));
  const myWantedIds = new Set(myWanted.map((s) => s.skill_id));
  const myWantedCategories = new Set(myWanted.map((s) => s.category.toLowerCase()));

  // 2. Fetch candidate public active users (excluding current user)
  const candidateUsers = await query(
    `SELECT u.id, u.name, u.email, u.avatar_url, u.bio, u.location, u.availability, u.created_at
     FROM users u
     WHERE u.id != ? AND u.is_active = 1 AND u.is_public = 1
     ORDER BY u.created_at DESC`,
    [userId]
  );

  if (candidateUsers.length === 0) {
    return { matches: [], total: 0, user_skills_count: mySkills.length };
  }

  // 3. Pre-fetch existing active swaps to avoid recommending existing active partners blindly
  const existingSwaps = await query(
    `SELECT id, requester_id, receiver_id, status 
     FROM swap_requests
     WHERE (requester_id = ? OR receiver_id = ?) AND status IN ('pending', 'accepted')`,
    [userId, userId]
  );

  const activePartnerMap = new Map();
  for (const sw of existingSwaps) {
    const partnerId = sw.requester_id === userId ? sw.receiver_id : sw.requester_id;
    activePartnerMap.set(partnerId, sw.status);
  }

  // 4. Calculate compatibility for each candidate
  const scoredMatches = [];

  for (const candidate of candidateUsers) {
    const candidateSkills = await query(
      `SELECT us.skill_id, us.type, us.proficiency_level, s.name, s.category
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = ?`,
      [candidate.id]
    );

    const candOffered = candidateSkills.filter((s) => s.type === 'offered');
    const candWanted = candidateSkills.filter((s) => s.type === 'wanted');

    // Skip candidates with no skills
    if (candOffered.length === 0 && candWanted.length === 0) {
      continue;
    }

    // Skills candidate offers that current user wants to learn
    const canLearnSkills = candOffered.filter((s) => myWantedIds.has(s.skill_id));
    // Skills current user offers that candidate wants to learn
    const canTeachSkills = candWanted.filter((s) => myOfferedIds.has(s.skill_id));

    let score = 0;
    const reasons = [];
    let isReciprocal = false;

    // Reciprocal match evaluation (Highest value: Two-way exchange)
    if (canLearnSkills.length > 0 && canTeachSkills.length > 0) {
      isReciprocal = true;
      score += 60;
      score += Math.min(20, (canLearnSkills.length + canTeachSkills.length - 2) * 5);

      const learnNames = canLearnSkills.map((s) => s.name).join(', ');
      const teachNames = canTeachSkills.map((s) => s.name).join(', ');
      reasons.push(`Direct Reciprocal Match: They teach ${learnNames} and want ${teachNames}`);
    } else if (canLearnSkills.length > 0) {
      score += 35;
      score += Math.min(15, (canLearnSkills.length - 1) * 5);
      const learnNames = canLearnSkills.map((s) => s.name).join(', ');
      reasons.push(`Offers ${learnNames} which you want to learn`);
    } else if (canTeachSkills.length > 0) {
      score += 30;
      score += Math.min(15, (canTeachSkills.length - 1) * 5);
      const teachNames = canTeachSkills.map((s) => s.name).join(', ');
      reasons.push(`Wants to learn ${teachNames} which you teach`);
    } else {
      // Category alignment fallback
      const catOverlap = candOffered.some((s) => myWantedCategories.has(s.category.toLowerCase()));
      if (catOverlap) {
        score += 15;
        reasons.push(`Offers skills in categories you are interested in`);
      }
    }

    // Proficiency tier bonus
    for (const skill of canLearnSkills) {
      if (skill.proficiency_level === 'expert') {
        score += 6;
        reasons.push(`Expert instructor in ${skill.name}`);
        break;
      } else if (skill.proficiency_level === 'advanced') {
        score += 4;
        break;
      }
    }

    // Location compatibility
    if (currentUser.location && candidate.location) {
      const myLoc = currentUser.location.toLowerCase().trim();
      const candLoc = candidate.location.toLowerCase().trim();
      if (myLoc.includes(candLoc) || candLoc.includes(myLoc)) {
        score += 5;
        reasons.push(`Same location: ${candidate.location}`);
      }
    }

    // Availability compatibility
    if (currentUser.availability && candidate.availability) {
      const myAvail = currentUser.availability.toLowerCase();
      const candAvail = candidate.availability.toLowerCase();
      if (
        (myAvail.includes('weekend') && candAvail.includes('weekend')) ||
        (myAvail.includes('evening') && candAvail.includes('evening')) ||
        myAvail.includes('flexible') ||
        candAvail.includes('flexible')
      ) {
        score += 5;
        reasons.push(`Compatible schedule: ${candidate.availability}`);
      }
    }

    // Ratings bonus (up to 5 points for high community rating)
    const ratingStats = await query(
      `SELECT COUNT(id) AS review_count, AVG(rating) AS avg_rating
       FROM reviews
       WHERE reviewee_id = ?`,
      [candidate.id]
    );

    const reviewCount = ratingStats[0]?.review_count || 0;
    const avgRating = ratingStats[0]?.avg_rating ? parseFloat(ratingStats[0].avg_rating).toFixed(1) : null;

    if (avgRating && parseFloat(avgRating) >= 4.5 && reviewCount >= 1) {
      score += 5;
      reasons.push(`Top-rated community mentor (${avgRating} ★)`);
    }

    // Cap score at 99 unless 100% perfect reciprocal
    const finalScore = Math.min(100, Math.max(0, score));

    // Only include meaningful matches (score >= 25)
    if (finalScore >= 25) {
      scoredMatches.push({
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        avatar_url: candidate.avatar_url,
        bio: candidate.bio,
        location: candidate.location,
        availability: candidate.availability,
        avg_rating: avgRating,
        review_count: reviewCount,
        match_score: finalScore,
        is_reciprocal: isReciprocal,
        reasons,
        can_learn_skills: canLearnSkills,
        can_teach_skills: canTeachSkills,
        offered_skills: candOffered,
        wanted_skills: candWanted,
        active_swap_status: activePartnerMap.get(candidate.id) || null
      });
    }
  }

  // Sort by match_score descending, then rating, then review count
  scoredMatches.sort((a, b) => {
    if (b.match_score !== a.match_score) {
      return b.match_score - a.match_score;
    }
    const rateA = parseFloat(a.avg_rating || 0);
    const rateB = parseFloat(b.avg_rating || 0);
    if (rateB !== rateA) {
      return rateB - rateA;
    }
    return b.review_count - a.review_count;
  });

  const paginated = scoredMatches.slice(offset, offset + limit);

  return {
    total: scoredMatches.length,
    count: paginated.length,
    user_skills_count: mySkills.length,
    matches: paginated
  };
}

module.exports = {
  getSmartMatches
};
