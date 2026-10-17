/**
 * SkillSwap - Discover Page Logic
 * Advanced partner search, multi-factor filtering, pagination, and swap proposal modal.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const usersGrid = document.getElementById('users-grid');
  const searchInput = document.getElementById('search-input');
  const wantedFilter = document.getElementById('wanted-skill-filter');
  const locationFilter = document.getElementById('location-filter');
  const availabilityFilter = document.getElementById('availability-filter');
  const resetBtn = document.getElementById('reset-filters-btn');
  const resultsCount = document.getElementById('results-count');
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  const pageIndicator = document.getElementById('page-indicator');

  let currentPage = 1;
  const PAGE_SIZE = 12;

  // Pre-fill from URL query param if present
  const initialParams = new URLSearchParams(window.location.search);
  if (initialParams.get('search') && searchInput) {
    searchInput.value = initialParams.get('search');
  }

  async function fetchAndRenderUsers() {
    if (!usersGrid) return;
    usersGrid.innerHTML = '<div class="spinner"></div>';

    const search = searchInput?.value.trim() || '';
    const wanted = wantedFilter?.value.trim() || '';
    const location = locationFilter?.value.trim() || '';
    const availability = availabilityFilter?.value || '';

    const offset = (currentPage - 1) * PAGE_SIZE;

    const params = new URLSearchParams({
      limit: PAGE_SIZE,
      offset
    });
    if (search) params.append('search', search);
    if (wanted) params.append('wantedSkill', wanted);
    if (location) params.append('location', location);
    if (availability) params.append('availability', availability);

    try {
      const res = await api.get(`/users?${params.toString()}`);
      const users = res.data || [];
      const currentUserId = auth.getUser()?.id;

      if (resultsCount) {
        resultsCount.textContent = `Found ${users.length} member${users.length === 1 ? '' : 's'} matching criteria`;
      }

      // Update Pagination UI
      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = users.length < PAGE_SIZE;
      if (pageIndicator) pageIndicator.textContent = `Page ${currentPage}`;

      if (users.length === 0) {
        usersGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 3.5rem 1.5rem; background: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
            <h3 style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem;">No exchange partners found</h3>
            <p style="color: var(--color-text-muted); max-width: 440px; margin: 0 auto 1.5rem;">
              We couldn't find anyone matching your search filters. Try clearing your filters or searching for general keywords.
            </p>
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('reset-filters-btn').click()">Clear All Filters</button>
          </div>
        `;
        return;
      }

      usersGrid.innerHTML = users
        .map((user) => {
          const initials = ui.getAvatarInitials(user.name);
          const isSelf = currentUserId && user.id === currentUserId;

          const offeredPills = (user.offered_skills || [])
            .map(
              (s) =>
                `<span class="skill-tag offered" style="font-size: 0.75rem;">${s.name} <small style="opacity:0.7">(${s.proficiency_level})</small></span>`
            )
            .join(' ');

          const wantedPills = (user.wanted_skills || [])
            .map((s) => `<span class="skill-tag wanted" style="font-size: 0.75rem;">${s.name}</span>`)
            .join(' ');

          return `
            <div class="user-card">
              <div class="user-card-header">
                <div class="avatar-circle">${initials}</div>
                <div class="user-card-info" style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h3>${user.name}</h3>
                    ${
                      user.avg_rating
                        ? `<span class="badge badge-warning" style="font-size: 0.75rem;">★ ${user.avg_rating} (${user.review_count})</span>`
                        : ''
                    }
                  </div>
                  <p>📍 ${user.location || 'Remote'} &bull; 🕒 ${user.availability || 'Flexible'}</p>
                </div>
              </div>

              <p class="user-card-bio">${user.bio || 'SkillSwap community member eager to learn and exchange expertise.'}</p>

              <div class="user-card-skills">
                <div style="margin-bottom: 0.75rem;">
                  <strong style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-primary-dark); display: block; margin-bottom: 0.35rem;">Can Teach:</strong>
                  <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                    ${offeredPills || '<span style="font-size:0.8rem; color:var(--color-text-muted);">None listed yet</span>'}
                  </div>
                </div>

                <div>
                  <strong style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: #0e7490; display: block; margin-bottom: 0.35rem;">Wants to Learn:</strong>
                  <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                    ${wantedPills || '<span style="font-size:0.8rem; color:var(--color-text-muted);">Open to anything</span>'}
                  </div>
                </div>
              </div>

              <div class="user-card-footer" style="display: flex; gap: 0.5rem;">
                <a href="profile.html?id=${user.id}" class="btn btn-outline btn-sm" style="flex: 1;">View Profile</a>
                ${
                  !isSelf
                    ? `<button class="btn btn-primary btn-sm" style="flex: 1;" onclick="openSwapProposalModal(${user.id}, '${encodeURIComponent(user.name)}')">✨ Propose Swap</button>`
                    : '<span class="badge badge-secondary" style="flex: 1; justify-content: center;">You</span>'
                }
              </div>
            </div>
          `;
        })
        .join('');
    } catch (err) {
      usersGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--color-danger); padding: 2rem;">
          <p>Failed to load exchange partners. Please verify server connectivity.</p>
        </div>
      `;
    }
  }

  // Filter change handlers with debounce
  let filterTimeout = null;
  const triggerFilteredSearch = () => {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
      currentPage = 1;
      fetchAndRenderUsers();
    }, 300);
  };

  searchInput?.addEventListener('input', triggerFilteredSearch);
  wantedFilter?.addEventListener('input', triggerFilteredSearch);
  locationFilter?.addEventListener('input', triggerFilteredSearch);
  availabilityFilter?.addEventListener('change', () => {
    currentPage = 1;
    fetchAndRenderUsers();
  });

  resetBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (wantedFilter) wantedFilter.value = '';
    if (locationFilter) locationFilter.value = '';
    if (availabilityFilter) availabilityFilter.value = '';
    currentPage = 1;
    fetchAndRenderUsers();
  });

  prevBtn?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      fetchAndRenderUsers();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  nextBtn?.addEventListener('click', () => {
    currentPage++;
    fetchAndRenderUsers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Modal for Proposing Swap
  window.openSwapProposalModal = async (receiverId, encodedName) => {
    const receiverName = decodeURIComponent(encodedName);

    if (!auth.isAuthenticated()) {
      ui.showToast('Please log in or sign up to propose a skill exchange.', 'warning');
      setTimeout(() => (window.location.href = 'login.html'), 1200);
      return;
    }

    const currentUserId = auth.getUser().id;

    try {
      // 1. Fetch current user's profile to get offered skills
      const myProfileRes = await api.get(`/users/${currentUserId}`);
      const myOfferedSkills = myProfileRes.data?.offered_skills || [];

      if (myOfferedSkills.length === 0) {
        ui.openModal(
          'Add Skills to Your Profile First',
          `
            <div style="text-align: center; padding: 1rem 0;">
              <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🎓</div>
              <p style="margin-bottom: 1rem;">To propose a skill swap, you must offer at least one skill in your profile so your partner knows what they will learn.</p>
              <a href="profile.html" class="btn btn-primary">Go to Profile & Add Skills</a>
            </div>
          `
        );
        return;
      }

      // 2. Fetch receiver's profile to get their offered skills
      const receiverRes = await api.get(`/users/${receiverId}`);
      const receiverOfferedSkills = receiverRes.data?.offered_skills || [];

      if (receiverOfferedSkills.length === 0) {
        ui.showToast(`${receiverName} has not listed any offered skills yet.`, 'warning');
        return;
      }

      const modalHtml = `
        <form id="swap-proposal-form">
          <p style="margin-bottom: 1.25rem; font-size: 0.95rem; color: var(--color-text-muted);">
            Proposing a reciprocal skill exchange with <strong>${receiverName}</strong>.
          </p>

          <div class="form-group">
            <label class="form-label" for="modal-offered-skill">Skill You Will Teach:</label>
            <select id="modal-offered-skill" class="form-control" required>
              ${myOfferedSkills
                .map((s) => `<option value="${s.skill_id}">${s.name} (${s.proficiency_level})</option>`)
                .join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-requested-skill">Skill You Want from ${receiverName}:</label>
            <select id="modal-requested-skill" class="form-control" required>
              ${receiverOfferedSkills
                .map((s) => `<option value="${s.skill_id}">${s.name} (${s.proficiency_level})</option>`)
                .join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-swap-message">Introductory Message:</label>
            <textarea id="modal-swap-message" class="form-control" rows="3" placeholder="Hi! I'd love to swap my skills for your sessions..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-swap-date">Proposed Session Date (Optional):</label>
            <input type="datetime-local" id="modal-swap-date" class="form-control">
          </div>

          <div class="modal-footer" style="padding: 1rem 0 0; border-top: none; background: transparent;">
            <button type="button" class="btn btn-secondary" onclick="ui.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" id="modal-submit-btn">Send Proposal</button>
          </div>
        </form>
      `;

      ui.openModal(`Propose Swap with ${receiverName}`, modalHtml);

      // Handle Form Submit
      document.getElementById('swap-proposal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('modal-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        const offeredSkillId = document.getElementById('modal-offered-skill').value;
        const requestedSkillId = document.getElementById('modal-requested-skill').value;
        const message = document.getElementById('modal-swap-message').value.trim();
        const scheduledDate = document.getElementById('modal-swap-date').value || null;

        try {
          await api.post('/swaps', {
            receiverId,
            offeredSkillId,
            requestedSkillId,
            message,
            scheduledDate: scheduledDate ? scheduledDate.replace('T', ' ') + ':00' : null
          });

          ui.closeModal();
          ui.showToast('Swap request sent successfully! Track it in My Swaps.', 'success');
        } catch (err) {
          ui.showToast(err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Proposal';
        }
      });
    } catch (err) {
      ui.showToast('Unable to initiate swap proposal: ' + err.message, 'error');
    }
  };

  fetchAndRenderUsers();
});
