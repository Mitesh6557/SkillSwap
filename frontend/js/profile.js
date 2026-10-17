/**
 * SkillSwap - Profile Page Logic
 * Full profile management, avatar uploads, skill associations, and reviews display.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);

  let rawId = urlParams.get('id') || urlParams.get('userId') || urlParams.get('user_id')
    || hashParams.get('id') || hashParams.get('userId') || hashParams.get('user_id');

  // If query string was stripped by a static server cleanUrls redirect, restore from session
  const sessionProfileId = sessionStorage.getItem('selected_profile_id');
  if (!rawId && sessionProfileId) {
    rawId = sessionProfileId;
    sessionStorage.removeItem('selected_profile_id');
    const currentPath = window.location.pathname;
    window.history.replaceState({}, '', `${currentPath}?id=${rawId}`);
  }

  const hasIdParam = Boolean(rawId) || urlParams.has('id') || urlParams.has('userId') || urlParams.has('user_id');
  const currentUser = auth.getUser();
  let userIdToFetch = null;

  console.log(`[Profile Navigation] Initialized: rawId=${rawId}, hasIdParam=${hasIdParam}, CurrentURL=${window.location.href}`);

  if (hasIdParam) {
    // Explicit ID provided: validate it strictly
    const parsedId = parseInt(rawId, 10);
    if (!rawId || isNaN(parsedId) || parsedId <= 0) {
      // Invalid user ID provided - handle gracefully without defaulting to logged-in user
      const container = document.querySelector('.profile-layout .container');
      if (container) {
        const discoverBase = window.location.pathname.endsWith('.html') ? 'discover.html' : 'discover';
        container.innerHTML = `
          <div class="card" style="text-align: center; padding: 3rem; margin: 2rem auto; max-width: 600px;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Invalid Profile Request</h2>
            <p style="color: var(--color-text-muted); margin-bottom: 1.5rem;">The requested user profile ID is invalid or missing.</p>
            <a href="${discoverBase}" class="btn btn-primary">Browse Exchange Partners</a>
          </div>
        `;
      }
      return;
    }
    userIdToFetch = parsedId;
  } else {
    // No ID parameter: this is "My Profile" navigation
    if (!currentUser || !currentUser.id) {
      ui.showToast('Please log in to view your profile.', 'warning');
      const loginBase = window.location.pathname.endsWith('.html') ? 'login.html' : 'login';
      setTimeout(() => (window.location.href = loginBase), 1000);
      return;
    }
    userIdToFetch = currentUser.id;
  }

  const isOwnProfile = currentUser && Number(currentUser.id) === Number(userIdToFetch);
  console.log(`[Profile Navigation] Selected target: userIdToFetch=${userIdToFetch}, isOwnProfile=${isOwnProfile}`);

  async function loadProfile() {
    try {
      const res = await api.get(`/users/${userIdToFetch}`);
      const user = res.data;

      // 1. Render Basic Info
      const nameEl = document.getElementById('profile-name');
      const locationEl = document.getElementById('profile-location');
      const availabilityEl = document.getElementById('profile-availability');
      const bioEl = document.getElementById('profile-bio');
      const avatarEl = document.getElementById('profile-avatar');
      const visibilityBadge = document.getElementById('profile-visibility-badge');

      if (nameEl) nameEl.textContent = user.name;
      if (locationEl) locationEl.textContent = user.location ? `📍 ${user.location}` : '📍 Remote';
      if (availabilityEl) availabilityEl.textContent = `🕒 Availability: ${user.availability || 'Flexible'}`;
      if (bioEl) bioEl.textContent = user.bio || 'No personal bio added yet.';

      if (avatarEl) {
        if (user.avatar_url) {
          avatarEl.innerHTML = `<img src="${CONFIG.UPLOADS_BASE_URL}/${user.avatar_url}" alt="${user.name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
          avatarEl.textContent = ui.getAvatarInitials(user.name);
        }
      }

      if (visibilityBadge) {
        if (user.is_public) {
          visibilityBadge.className = 'badge badge-success';
          visibilityBadge.textContent = 'Public Profile';
        } else {
          visibilityBadge.className = 'badge badge-warning';
          visibilityBadge.textContent = 'Private Profile';
        }
      }

      // 2. Setup Owner Controls vs Visitor View
      const avatarUploadLabel = document.getElementById('avatar-upload-label');
      const editProfileCard = document.getElementById('edit-profile-card');
      const addOfferedBtn = document.getElementById('add-offered-skill-btn');
      const addWantedBtn = document.getElementById('add-wanted-skill-btn');
      const actionBtn = document.getElementById('profile-action-btn');

      if (isOwnProfile) {
        if (avatarUploadLabel) avatarUploadLabel.style.display = 'flex';
        if (editProfileCard) editProfileCard.style.display = 'block';
        if (addOfferedBtn) addOfferedBtn.style.display = 'inline-flex';
        if (addWantedBtn) addWantedBtn.style.display = 'inline-flex';
        if (actionBtn) actionBtn.innerHTML = '';

        // Pre-fill edit form
        const editName = document.getElementById('edit-name');
        const editLocation = document.getElementById('edit-location');
        const editAvailability = document.getElementById('edit-availability');
        const editVisibility = document.getElementById('edit-visibility');
        const editBio = document.getElementById('edit-bio');

        if (editName) editName.value = user.name || '';
        if (editLocation) editLocation.value = user.location || '';
        if (editAvailability) editAvailability.value = user.availability || '';
        if (editVisibility) editVisibility.value = user.is_public ? '1' : '0';
        if (editBio) editBio.value = user.bio || '';
      } else {
        if (avatarUploadLabel) avatarUploadLabel.style.display = 'none';
        if (editProfileCard) editProfileCard.style.display = 'none';
        if (addOfferedBtn) addOfferedBtn.style.display = 'none';
        if (addWantedBtn) addWantedBtn.style.display = 'none';

        if (actionBtn) {
          const discoverBase = window.location.pathname.endsWith('.html') ? 'discover.html' : 'discover';
          actionBtn.innerHTML = `
            <a href="${discoverBase}?proposeUser=${user.id}" class="btn btn-primary">
              ✨ Propose Skill Swap
            </a>
          `;
        }
      }

      // 3. Render Offered Skills
      const offeredList = document.getElementById('offered-skills-list');
      if (offeredList) {
        if (user.offered_skills && user.offered_skills.length > 0) {
          offeredList.innerHTML = user.offered_skills
            .map(
              (s) => `
            <div class="skill-tag offered">
              <strong>${s.name}</strong> 
              <span style="opacity: 0.8; font-size: 0.75rem;">(${s.proficiency_level})</span>
              ${
                isOwnProfile
                  ? `<button style="background:none; border:none; color:var(--color-danger); cursor:pointer; font-weight:bold; margin-left:4px;" onclick="removeSkill(${s.user_skill_id})" title="Remove skill">&times;</button>`
                  : ''
              }
            </div>
          `
            )
            .join('');
        } else {
          offeredList.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.9rem;">No skills offered yet.</p>';
        }
      }

      // 4. Render Wanted Skills
      const wantedList = document.getElementById('wanted-skills-list');
      if (wantedList) {
        if (user.wanted_skills && user.wanted_skills.length > 0) {
          wantedList.innerHTML = user.wanted_skills
            .map(
              (s) => `
            <div class="skill-tag wanted">
              <strong>${s.name}</strong>
              ${
                isOwnProfile
                  ? `<button style="background:none; border:none; color:var(--color-danger); cursor:pointer; font-weight:bold; margin-left:4px;" onclick="removeSkill(${s.user_skill_id})" title="Remove skill">&times;</button>`
                  : ''
              }
            </div>
          `
            )
            .join('');
        } else {
          wantedList.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.9rem;">No learning interests specified.</p>';
        }
      }

      // 5. Render Reviews
      loadReviews(user.id);
    } catch (err) {
      const container = document.querySelector('.profile-layout .container');
      if (container) {
        container.innerHTML = `
          <div class="card" style="text-align: center; padding: 3rem; margin: 2rem auto; max-width: 600px;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
            <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Profile Unavailable</h2>
            <p style="color: var(--color-text-muted); margin-bottom: 1.5rem;">${err.message || 'This profile is private or does not exist.'}</p>
            <a href="${window.location.pathname.endsWith('.html') ? 'discover.html' : 'discover'}" class="btn btn-primary">Browse Public Members</a>
          </div>
        `;
      }
    }
  }

  // Load reviews list
  async function loadReviews(userId) {
    const listEl = document.getElementById('reviews-list');
    const summaryEl = document.getElementById('profile-rating-summary');
    if (!listEl) return;

    try {
      const res = await api.get(`/reviews/user/${userId}`);
      const reviews = res.data || [];

      if (reviews.length === 0) {
        listEl.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.95rem;">No reviews yet. Complete a skill exchange to receive feedback!</p>';
        if (summaryEl) summaryEl.innerHTML = '<span class="badge badge-secondary">No Ratings Yet</span>';
        return;
      }

      const avg = (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);
      if (summaryEl) {
        summaryEl.innerHTML = `<span class="badge badge-warning" style="font-size: 0.9rem;">★ ${avg} out of 5 (${reviews.length} review${reviews.length === 1 ? '' : 's'})</span>`;
      }

      listEl.innerHTML = reviews
        .map(
          (r) => `
        <div style="padding: 1rem 0; border-bottom: 1px solid var(--color-border);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <strong>${r.reviewer_name}</strong>
            <span style="color: #f59e0b; font-weight: 700;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
          </div>
          <p style="font-size: 0.95rem; color: var(--color-text-main); margin-bottom: 0.35rem;">"${r.comment || 'Great exchange!'}"</p>
          <span style="font-size: 0.8rem; color: var(--color-text-muted);">${ui.formatDate(r.created_at)}</span>
        </div>
      `
        )
        .join('');
    } catch (err) {
      listEl.innerHTML = '<p style="color: var(--color-text-muted);">Unable to load reviews.</p>';
    }
  }

  // Owner: Edit Profile Form Submit
  const editForm = document.getElementById('edit-profile-form');
  editForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const name = document.getElementById('edit-name').value.trim();
    const location = document.getElementById('edit-location').value.trim();
    const availability = document.getElementById('edit-availability').value.trim();
    const is_public = document.getElementById('edit-visibility').value === '1';
    const bio = document.getElementById('edit-bio').value.trim();

    try {
      await api.put('/users/profile', { name, location, availability, is_public, bio });
      ui.showToast('Profile updated successfully!', 'success');
      loadProfile();
    } catch (err) {
      ui.showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  });

  // Owner: Avatar Upload Change
  const avatarInput = document.getElementById('avatar-file-input');
  avatarInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      ui.showToast('Image size exceeds 5MB limit.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      ui.showToast('Uploading photo...', 'info');
      await api.upload('/users/avatar', formData);
      ui.showToast('Profile photo updated!', 'success');
      loadProfile();
    } catch (err) {
      ui.showToast('Avatar upload failed: ' + err.message, 'error');
    }
  });

  // Owner: Remove Skill
  window.removeSkill = async (userSkillId) => {
    if (!confirm('Are you sure you want to remove this skill from your profile?')) return;
    try {
      await api.delete(`/skills/user/${userSkillId}`);
      ui.showToast('Skill removed.', 'success');
      loadProfile();
    } catch (err) {
      ui.showToast(err.message, 'error');
    }
  };

  // Owner: Add Skill Modal (Offered or Wanted)
  async function openAddSkillModal(type) {
    try {
      const skillsRes = await api.get('/skills');
      const catalog = skillsRes.data || [];

      const modalHtml = `
        <form id="add-skill-modal-form">
          <div class="form-group">
            <label class="form-label">Select from Catalog:</label>
            <select id="modal-select-skill" class="form-control">
              <option value="">-- Choose an existing skill --</option>
              ${catalog.map((s) => `<option value="${s.id}">${s.name} (${s.category})</option>`).join('')}
              <option value="NEW">+ Add New Custom Skill to Catalog</option>
            </select>
          </div>

          <div id="new-skill-fields" style="display: none; padding: 1rem; background: var(--color-bg); border-radius: var(--radius-md); margin-bottom: 1rem;">
            <div class="form-group">
              <label class="form-label">New Skill Name:</label>
              <input type="text" id="modal-new-skill-name" class="form-control" placeholder="e.g. Docker, Piano, Watercolor...">
            </div>
            <div class="form-group">
              <label class="form-label">Category:</label>
              <input type="text" id="modal-new-skill-category" class="form-control" placeholder="e.g. Technology, Music, Arts...">
            </div>
          </div>

          ${
            type === 'offered'
              ? `
            <div class="form-group">
              <label class="form-label">Your Proficiency Level:</label>
              <select id="modal-skill-level" class="form-control">
                <option value="beginner">Beginner</option>
                <option value="intermediate" selected>Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          `
              : ''
          }

          <div class="form-group">
            <label class="form-label">Description / Notes (Optional):</label>
            <input type="text" id="modal-skill-desc" class="form-control" placeholder="What specific topics or tools?">
          </div>

          <div class="modal-footer" style="padding: 1rem 0 0; border-top: none; background: transparent;">
            <button type="button" class="btn btn-secondary" onclick="ui.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" id="modal-add-skill-btn">Add to Profile</button>
          </div>
        </form>
      `;

      ui.openModal(`Add Skill (${type === 'offered' ? 'I Can Teach' : 'I Want to Learn'})`, modalHtml);

      // Toggle new skill fields
      document.getElementById('modal-select-skill').addEventListener('change', (e) => {
        const isNew = e.target.value === 'NEW';
        document.getElementById('new-skill-fields').style.display = isNew ? 'block' : 'none';
      });

      // Submit
      document.getElementById('add-skill-modal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('modal-add-skill-btn');
        submitBtn.disabled = true;

        let selectedId = document.getElementById('modal-select-skill').value;
        const level = document.getElementById('modal-skill-level')?.value || 'intermediate';
        const description = document.getElementById('modal-skill-desc').value.trim();

        try {
          if (selectedId === 'NEW') {
            const name = document.getElementById('modal-new-skill-name').value.trim();
            const category = document.getElementById('modal-new-skill-category').value.trim();
            if (!name || !category) {
              ui.showToast('Skill name and category are required.', 'error');
              submitBtn.disabled = false;
              return;
            }
            const createRes = await api.post('/skills', { name, category });
            selectedId = createRes.data.id;
          }

          if (!selectedId) {
            ui.showToast('Please select or specify a skill.', 'error');
            submitBtn.disabled = false;
            return;
          }

          await api.post('/skills/user', {
            skillId: selectedId,
            type,
            proficiencyLevel: level,
            description
          });

          ui.closeModal();
          ui.showToast('Skill added to your profile!', 'success');
          loadProfile();
        } catch (err) {
          ui.showToast(err.message, 'error');
          submitBtn.disabled = false;
        }
      });
    } catch (err) {
      ui.showToast('Unable to open skills dialog.', 'error');
    }
  }

  document.getElementById('add-offered-skill-btn')?.addEventListener('click', () => openAddSkillModal('offered'));
  document.getElementById('add-wanted-skill-btn')?.addEventListener('click', () => openAddSkillModal('wanted'));

  loadProfile();
});
