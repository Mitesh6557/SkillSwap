/**
 * SkillSwap - Home Page Logic
 * Loads hero categories, platform preview, and featured skills.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const featuredContainer = document.getElementById('featured-skills-list');
  if (!featuredContainer) return;

  try {
    const res = await api.get('/skills');
    const skills = res.data?.slice(0, 6) || [];

    if (skills.length === 0) {
      featuredContainer.innerHTML = '<p class="text-muted">No skills loaded yet.</p>';
      return;
    }

    featuredContainer.innerHTML = skills
      .map(
        (skill) => `
        <a href="discover.html?search=${encodeURIComponent(skill.name)}" class="card skill-card" style="display:block; text-decoration:none; color:inherit;">
          <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">💡</div>
          <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.35rem; color:var(--color-text-main);">${skill.name}</h3>
          <span class="badge badge-primary" style="margin-bottom: 0.75rem;">${skill.category}</span>
          <p style="font-size: 0.9rem; color: var(--color-text-muted);">${skill.description || 'Learn and exchange this skill.'}</p>
        </a>
      `
      )
      .join('');
  } catch (err) {
    console.error('Failed to load featured skills:', err);
  }
});
