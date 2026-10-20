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

          const profileBase = window.location.pathname.endsWith('.html') ? 'profile.html' : 'profile';
          const profileUrl = `${profileBase}?id=${user.id}`;

          return `
            <div class="user-card">
              <div class="user-card-header">
                <a href="${profileUrl}" data-user-id="${user.id}" class="user-card-profile-link" onclick="sessionStorage.setItem('selected_profile_id', '${user.id}')" style="display: flex; align-items: center; gap: 1rem; text-decoration: none; color: inherit; flex: 1;">
                  <div class="avatar-circle">${initials}</div>
                  <div class="user-card-info" style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                      <h3 style="margin: 0; color: var(--color-text-main);">${user.name}</h3>
                      ${
                        user.avg_rating
                          ? `<span class="badge badge-warning" style="font-size: 0.75rem;">★ ${user.avg_rating} (${user.review_count})</span>`
                          : ''
                      }
                    </div>
                    <p style="margin: 0.25rem 0 0 0;">📍 ${user.location || 'Remote'} &bull; 🕒 ${user.availability || 'Flexible'}</p>
                  </div>
                </a>
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
                  <strong style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-accent); display: block; margin-bottom: 0.35rem;">Wants to Learn:</strong>
                  <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                    ${wantedPills || '<span style="font-size:0.8rem; color:var(--color-text-muted);">Open to anything</span>'}
                  </div>
                </div>
              </div>

              <div class="user-card-footer" style="display: flex; gap: 0.5rem;">
                <a href="${profileUrl}" data-user-id="${user.id}" class="btn btn-outline btn-sm" onclick="sessionStorage.setItem('selected_profile_id', '${user.id}')" style="flex: 1; text-align: center;">View Profile</a>
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
  window.openSwapProposalModal = async (receiverId, encodedName, preselectedOfferedSkillId = null, preselectedRequestedSkillId = null) => {
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
                .map((s) => `<option value="${s.skill_id}" ${preselectedOfferedSkillId && String(preselectedOfferedSkillId) === String(s.skill_id) ? 'selected' : ''}>${s.name} (${s.proficiency_level})</option>`)
                .join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-requested-skill">Skill You Want from ${receiverName}:</label>
            <select id="modal-requested-skill" class="form-control" required>
              ${receiverOfferedSkills
                .map((s) => `<option value="${s.skill_id}" ${preselectedRequestedSkillId && String(preselectedRequestedSkillId) === String(s.skill_id) ? 'selected' : ''}>${s.name} (${s.proficiency_level})</option>`)
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

        const form = document.getElementById('swap-proposal-form');
        const validationSchema = {
          '#modal-offered-skill': {
            required: 'Please select a skill you will teach.'
          },
          '#modal-requested-skill': {
            required: 'Please select a skill you want to learn.'
          }
        };

        const scheduledDateInput = document.getElementById('modal-swap-date');
        if (scheduledDateInput && scheduledDateInput.value) {
          validationSchema['#modal-swap-date'] = {
            futureDate: 'Proposed session date must be in the future.'
          };
        }

        const isValid = validator.validateForm(form, validationSchema);
        if (!isValid) return;

        const submitBtn = document.getElementById('modal-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        const offeredSkillId = document.getElementById('modal-offered-skill').value;
        const requestedSkillId = document.getElementById('modal-requested-skill').value;
        const message = document.getElementById('modal-swap-message').value.trim();
        const scheduledDate = scheduledDateInput ? scheduledDateInput.value : null;

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

  // --- Smart Matches Feature Implementation ---
  const tabBtnDirectory = document.getElementById('tab-btn-directory');
  const tabBtnSmartMatches = document.getElementById('tab-btn-smart-matches');
  const paneDirectory = document.getElementById('pane-directory');
  const paneSmartMatches = document.getElementById('pane-smart-matches');
  const smartMatchesGrid = document.getElementById('smart-matches-grid');
  const refreshMatchesBtn = document.getElementById('refresh-matches-btn');
  const smartBadgeCount = document.getElementById('smart-badge-count');

  function switchTab(target) {
    if (target === 'smart-matches') {
      tabBtnDirectory?.classList.remove('active');
      tabBtnSmartMatches?.classList.add('active');
      if (paneDirectory) paneDirectory.style.display = 'none';
      if (paneSmartMatches) paneSmartMatches.style.display = 'block';
      fetchAndRenderSmartMatches();
    } else {
      tabBtnSmartMatches?.classList.remove('active');
      tabBtnDirectory?.classList.add('active');
      if (paneSmartMatches) paneSmartMatches.style.display = 'none';
      if (paneDirectory) paneDirectory.style.display = 'block';
    }
  }

  tabBtnDirectory?.addEventListener('click', () => switchTab('directory'));
  tabBtnSmartMatches?.addEventListener('click', () => switchTab('smart-matches'));
  refreshMatchesBtn?.addEventListener('click', () => fetchAndRenderSmartMatches(true));

  async function fetchAndRenderSmartMatches(forceRefresh = false) {
    if (!smartMatchesGrid) return;

    if (!auth.isAuthenticated()) {
      smartMatchesGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3.5rem 1.5rem; background: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
          <h3 style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--color-text-main);">Log in for Smart Matching</h3>
          <p style="color: var(--color-text-muted); max-width: 460px; margin: 0 auto 1.5rem;">
            Our smart matching engine analyzes reciprocal learning goals and skill profiles to find your ideal exchange partners.
          </p>
          <a href="login.html" class="btn btn-primary">Log In to View Matches</a>
        </div>
      `;
      return;
    }

    smartMatchesGrid.innerHTML = '<div class="spinner" style="grid-column: 1/-1; margin: 3rem auto;"></div>';

    try {
      const res = await api.get('/matches?limit=30');
      const matches = Array.isArray(res.data) ? res.data : (res.data?.matches || []);
      const userSkillsCount = res.userSkillsCount !== undefined ? res.userSkillsCount : (res.data?.user_skills_count !== undefined ? res.data.user_skills_count : (matches.length > 0 ? matches.length : 0));

      if (smartBadgeCount) {
        if (matches.length > 0) {
          smartBadgeCount.textContent = matches.length;
          smartBadgeCount.style.display = 'inline-block';
        } else {
          smartBadgeCount.style.display = 'none';
        }
      }

      if (userSkillsCount === 0) {
        smartMatchesGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 3.5rem 1.5rem; background: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🎯</div>
            <h3 style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--color-text-main);">Add Skills to Unlock Smart Matches</h3>
            <p style="color: var(--color-text-muted); max-width: 480px; margin: 0 auto 1.5rem;">
              You haven't added any offered or wanted skills to your profile yet. Add the skills you can teach and what you want to learn to get tailored, high-compatibility swap recommendations!
            </p>
            <a href="profile.html" class="btn btn-primary">Go to Profile & Add Skills</a>
          </div>
        `;
        return;
      }

      if (matches.length === 0) {
        smartMatchesGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 3.5rem 1.5rem; background: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">✨</div>
            <h3 style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--color-text-main);">No High-Compatibility Matches Yet</h3>
            <p style="color: var(--color-text-muted); max-width: 480px; margin: 0 auto 1.5rem;">
              We couldn't find an exact reciprocal partner right now. As more members join and list skills, your smart recommendations will update automatically!
            </p>
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('tab-btn-directory').click()">Explore Public Directory</button>
          </div>
        `;
        return;
      }

      const profileBase = window.location.pathname.endsWith('.html') ? 'profile.html' : 'profile';

      smartMatchesGrid.innerHTML = matches
        .map((m) => {
          const initials = ui.getAvatarInitials(m.name);
          const profileUrl = `${profileBase}?id=${m.id}`;

          const preselectedOfferedId = m.can_teach_skills && m.can_teach_skills.length > 0 ? m.can_teach_skills[0].skill_id : null;
          const preselectedRequestedId = m.can_learn_skills && m.can_learn_skills.length > 0 ? m.can_learn_skills[0].skill_id : null;

          const reasonsHtml = (m.reasons || [])
            .map((r) => `<div class="reason-pill"><span>✓</span> <span>${r}</span></div>`)
            .join('');

          const canLearnPills = (m.can_learn_skills || [])
            .map((s) => `<span class="skill-tag offered" style="font-size: 0.75rem; font-weight: 600;">${s.name} <small style="opacity:0.8">(${s.proficiency_level})</small></span>`)
            .join(' ');

          const canTeachPills = (m.can_teach_skills || [])
            .map((s) => `<span class="skill-tag wanted" style="font-size: 0.75rem; font-weight: 600;">${s.name}</span>`)
            .join(' ');

          return `
            <div class="user-card" style="border: 1px solid ${m.is_reciprocal ? 'var(--color-accent)' : 'var(--color-border)'};">
              <div class="user-card-header" style="margin-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                  <a href="${profileUrl}" class="user-card-profile-link" onclick="sessionStorage.setItem('selected_profile_id', '${m.id}')" style="display: flex; align-items: center; gap: 0.85rem; text-decoration: none; color: inherit; flex: 1;">
                    <div class="avatar-circle">${initials}</div>
                    <div class="user-card-info">
                      <h3 style="margin: 0; color: var(--color-text-main);">${m.name}</h3>
                      <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: var(--color-text-muted);">
                        📍 ${m.location || 'Remote'} &bull; 🕒 ${m.availability || 'Flexible'}
                      </p>
                    </div>
                  </a>
                  <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
                    <span class="match-score-badge">
                      ${m.match_score}% Match
                    </span>
                    ${m.is_reciprocal ? `<span style="font-size: 0.68rem; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-full); padding: 0.15rem 0.5rem; font-weight: 700;">🔄 Reciprocal</span>` : ''}
                  </div>
                </div>

                <div class="compatibility-bar-container">
                  <div class="compatibility-bar-fill" style="width: ${m.match_score}%;"></div>
                </div>
              </div>

              <!-- Recommendation Reasons Box -->
              <div class="match-reasons-box">
                <div style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: var(--color-primary-dark); letter-spacing: 0.5px; margin-bottom: 0.2rem;">
                  Why You Match:
                </div>
                ${reasonsHtml}
              </div>

              <!-- Complementary Skills Breakdown -->
              <div class="user-card-skills" style="margin-top: 0.5rem;">
                ${
                  canLearnPills
                    ? `
                    <div style="margin-bottom: 0.6rem;">
                      <strong style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-accent); display: block; margin-bottom: 0.25rem;">
                        🎓 You Can Learn:
                      </strong>
                      <div style="display: flex; flex-wrap: wrap; gap: 0.3rem;">
                        ${canLearnPills}
                      </div>
                    </div>
                  `
                    : ''
                }

                ${
                  canTeachPills
                    ? `
                    <div style="margin-bottom: 0.6rem;">
                      <strong style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-primary-dark); display: block; margin-bottom: 0.25rem;">
                        💡 You Can Teach:
                      </strong>
                      <div style="display: flex; flex-wrap: wrap; gap: 0.3rem;">
                        ${canTeachPills}
                      </div>
                    </div>
                  `
                    : ''
                }
              </div>

              <div class="user-card-footer" style="display: flex; gap: 0.5rem; margin-top: auto;">
                <a href="${profileUrl}" class="btn btn-outline btn-sm" onclick="sessionStorage.setItem('selected_profile_id', '${m.id}')" style="flex: 1; text-align: center;">View Profile</a>
                <button class="btn btn-primary btn-sm" style="flex: 1.2;" onclick="openSwapProposalModal(${m.id}, '${encodeURIComponent(m.name)}', ${preselectedOfferedId || 'null'}, ${preselectedRequestedId || 'null'})">
                  ✨ Propose Swap
                </button>
              </div>
            </div>
          `;
        })
        .join('');

      if (forceRefresh) {
        ui.showToast('Smart match recommendations refreshed!', 'info');
      }
    } catch (err) {
      smartMatchesGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--color-danger); padding: 2rem;">
          <p>Failed to calculate smart matches: ${err.message}</p>
        </div>
      `;
    }
  }

  // Check URL hash or query param for ?tab=matches
  if (initialParams.get('tab') === 'matches' || window.location.hash === '#matches') {
    switchTab('smart-matches');
  }

  fetchAndRenderUsers();

  // Auto-open swap proposal modal if navigated with ?proposeUser=ID
  const proposeUserId = initialParams.get('proposeUser');
  if (proposeUserId) {
    try {
      const userRes = await api.get(`/users/${proposeUserId}`);
      if (userRes.data) {
        openSwapProposalModal(userRes.data.id, encodeURIComponent(userRes.data.name));
      }
    } catch (e) {
      console.warn('Could not auto-open swap proposal modal:', e);
    }
  }
});
