/**
 * SkillSwap - Skills Management Logic
 * Loads catalog skills and allows users to add or remove skills from profile.
 */

const skillsManager = {
  async fetchCatalog(category = '') {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await api.get(`/skills${query}`);
    return res.data || [];
  },

  async addSkillToProfile(skillId, type, proficiencyLevel, description) {
    return await api.post('/skills/user', {
      skillId,
      type,
      proficiencyLevel,
      description
    });
  },

  async removeSkillFromProfile(userSkillId) {
    return await api.delete(`/skills/user/${userSkillId}`);
  }
};

window.skillsManager = skillsManager;
