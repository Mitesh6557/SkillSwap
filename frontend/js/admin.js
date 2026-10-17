/**
 * SkillSwap - Admin Portal Logic
 * Moderation, metrics, user management, skills cataloging, swap tracking, announcements, and CSV exports.
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!auth.isAdmin()) {
    ui.showToast('Administrator privileges required.', 'error');
    window.location.href = 'dashboard.html';
    return;
  }

  // Tab Switching
  const tabs = document.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.admin-tab-pane');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      panes.forEach((p) => (p.style.display = 'none'));

      tab.classList.add('active');
      const targetPane = document.getElementById(tab.dataset.tab);
      if (targetPane) targetPane.style.display = 'block';

      // Lazy load tab data
      if (tab.dataset.tab === 'tab-skills') loadAdminSkills();
      if (tab.dataset.tab === 'tab-swaps') loadAdminSwaps();
      if (tab.dataset.tab === 'tab-logs') loadAdminLogs();
    });
  });

  // 1. Load Stats
  async function loadAdminStats() {
    try {
      const res = await api.get('/admin/stats');
      const s = res.data;

      const userEl = document.getElementById('stat-total-users');
      const publicEl = document.getElementById('stat-public-profiles');
      const totalSwapsEl = document.getElementById('stat-total-swaps');
      const pendingSwapsEl = document.getElementById('stat-pending-swaps');
      const completedSwapsEl = document.getElementById('stat-completed-swaps');
      const skillsEl = document.getElementById('stat-total-skills');

      if (userEl) userEl.textContent = s.totalUsers || 0;
      if (publicEl) publicEl.textContent = s.publicProfiles || 0;
      if (totalSwapsEl) totalSwapsEl.textContent = s.totalSwaps || 0;
      if (pendingSwapsEl) pendingSwapsEl.textContent = s.pendingSwaps || 0;
      if (completedSwapsEl) completedSwapsEl.textContent = s.completedSwaps || 0;
      if (skillsEl) skillsEl.textContent = s.totalSkills || 0;
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    }
  }

  // 2. Load Users Table
  async function loadAdminUsers(search = '') {
    const tableBody = document.getElementById('admin-users-table-body');
    if (!tableBody) return;

    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get(`/admin/users${query}`);
      const users = res.data || [];

      if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">No members found.</td></tr>';
        return;
      }

      tableBody.innerHTML = users
        .map(
          (u) => `
        <tr style="border-bottom: 1px solid var(--color-border);">
          <td style="padding: 0.85rem;"><strong>${u.name}</strong></td>
          <td style="padding: 0.85rem;">${u.email}</td>
          <td style="padding: 0.85rem;"><span class="badge ${u.role === 'admin' ? 'badge-primary' : 'badge-secondary'}">${u.role}</span></td>
          <td style="padding: 0.85rem;"><span class="badge ${u.is_public ? 'badge-success' : 'badge-warning'}">${u.is_public ? 'Public' : 'Private'}</span></td>
          <td style="padding: 0.85rem;"><span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">${u.is_active ? 'Active' : 'Suspended'}</span></td>
          <td style="padding: 0.85rem; text-align: right;">
            ${
              u.role !== 'admin'
                ? `
              <button class="btn ${u.is_active ? 'btn-danger' : 'btn-primary'} btn-sm" onclick="toggleUserStatus(${u.id}, ${!u.is_active})">
                ${u.is_active ? 'Suspend' : 'Activate'}
              </button>
            `
                : '<span style="color:var(--color-text-muted); font-size:0.8rem; font-weight:600;">Admin</span>'
            }
          </td>
        </tr>
      `
        )
        .join('');
    } catch (err) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-danger); padding: 1.5rem;">Failed to load user list.</td></tr>';
    }
  }

  // Toggle User Active Status
  window.toggleUserStatus = async (userId, newActiveState) => {
    const action = newActiveState ? 'reactivate' : 'suspend';
    if (!confirm(`Are you sure you want to ${action} this account?`)) return;

    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive: newActiveState });
      ui.showToast(`User status updated to ${newActiveState ? 'active' : 'suspended'}!`, 'success');
      loadAdminUsers(document.getElementById('admin-user-search')?.value.trim());
      loadAdminStats();
    } catch (err) {
      ui.showToast(err.message, 'error');
    }
  };

  // Search input handler
  let searchTimeout = null;
  document.getElementById('admin-user-search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadAdminUsers(e.target.value.trim());
    }, 300);
  });

  // 3. Load Skills Table
  async function loadAdminSkills() {
    const tableBody = document.getElementById('admin-skills-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;"><div class="spinner"></div></td></tr>';

    try {
      const res = await api.get('/skills');
      const skills = res.data || [];

      tableBody.innerHTML = skills
        .map(
          (s) => `
        <tr style="border-bottom: 1px solid var(--color-border);">
          <td style="padding: 0.85rem;"><strong>${s.name}</strong></td>
          <td style="padding: 0.85rem;"><span class="badge badge-primary">${s.category}</span></td>
          <td style="padding: 0.85rem; color: var(--color-text-muted);">${s.description || 'N/A'}</td>
          <td style="padding: 0.85rem; text-align: right;">
            <button class="btn btn-outline btn-sm" style="color: var(--color-danger); border-color: #fca5a5;" onclick="deleteCatalogSkill(${s.id}, '${encodeURIComponent(s.name)}')">
              Delete
            </button>
          </td>
        </tr>
      `
        )
        .join('');
    } catch (err) {
      tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--color-danger); padding: 1.5rem;">Failed to load skills.</td></tr>';
    }
  }

  // Delete skill
  window.deleteCatalogSkill = async (skillId, encodedName) => {
    const name = decodeURIComponent(encodedName);
    if (!confirm(`Are you sure you want to remove skill '${name}' from the global catalog?`)) return;

    try {
      await api.delete(`/admin/skills/${skillId}`);
      ui.showToast(`Skill '${name}' removed.`, 'success');
      loadAdminSkills();
      loadAdminStats();
    } catch (err) {
      ui.showToast(err.message, 'error');
    }
  };

  // Add Catalog Skill Modal
  document.getElementById('admin-add-skill-btn')?.addEventListener('click', () => {
    const modalHtml = `
      <form id="admin-add-skill-form">
        <div class="form-group">
          <label class="form-label" for="new-skill-name">Skill Name</label>
          <input type="text" id="new-skill-name" class="form-control" placeholder="e.g. Graphic Design" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="new-skill-cat">Category</label>
          <input type="text" id="new-skill-cat" class="form-control" placeholder="e.g. Design" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="new-skill-desc">Description</label>
          <textarea id="new-skill-desc" class="form-control" rows="2" placeholder="Brief summary..."></textarea>
        </div>
        <div class="modal-footer" style="padding: 1rem 0 0; border-top: none; background: transparent;">
          <button type="button" class="btn btn-secondary" onclick="ui.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="btn-save-new-skill">Add to Catalog</button>
        </div>
      </form>
    `;

    ui.openModal('Add New Skill to Catalog', modalHtml);

    document.getElementById('admin-add-skill-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-skill-name').value.trim();
      const category = document.getElementById('new-skill-cat').value.trim();
      const description = document.getElementById('new-skill-desc').value.trim();

      try {
        await api.post('/skills', { name, category, description });
        ui.closeModal();
        ui.showToast('Skill successfully added to catalog!', 'success');
        loadAdminSkills();
        loadAdminStats();
      } catch (err) {
        ui.showToast(err.message, 'error');
      }
    });
  });

  // 4. Load Swaps Table
  async function loadAdminSwaps() {
    const tableBody = document.getElementById('admin-swaps-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;"><div class="spinner"></div></td></tr>';

    try {
      const res = await api.get('/admin/swaps');
      const swaps = res.data || [];

      if (swaps.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">No swaps on record.</td></tr>';
        return;
      }

      tableBody.innerHTML = swaps
        .map(
          (s) => `
        <tr style="border-bottom: 1px solid var(--color-border);">
          <td style="padding: 0.85rem; font-weight: 700;">#${s.id}</td>
          <td style="padding: 0.85rem;">${s.requester_name} <br><small style="color:var(--color-text-muted);">${s.requester_email}</small></td>
          <td style="padding: 0.85rem;">${s.receiver_name} <br><small style="color:var(--color-text-muted);">${s.receiver_email}</small></td>
          <td style="padding: 0.85rem;">
            <strong>${s.offered_skill_name}</strong> ➔ <strong>${s.requested_skill_name}</strong>
          </td>
          <td style="padding: 0.85rem;">
            <span class="badge badge-${s.status === 'completed' ? 'success' : s.status === 'accepted' ? 'primary' : s.status === 'pending' ? 'warning' : 'danger'}">
              ${s.status}
            </span>
          </td>
          <td style="padding: 0.85rem; font-size: 0.8rem; color: var(--color-text-muted);">${ui.formatDate(s.created_at)}</td>
        </tr>
      `
        )
        .join('');
    } catch (err) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-danger); padding: 1.5rem;">Failed to load swaps.</td></tr>';
    }
  }

  // 5. Broadcast Announcement Form
  document.getElementById('admin-announcement-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-publish-announcement');
    btn.disabled = true;

    const title = document.getElementById('announcement-title').value.trim();
    const content = document.getElementById('announcement-content').value.trim();

    try {
      await api.post('/admin/announcements', { title, content });
      ui.showToast('Announcement published successfully to all users!', 'success');
      document.getElementById('announcement-title').value = '';
      document.getElementById('announcement-content').value = '';
      loadAdminLogs();
    } catch (err) {
      ui.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  // 6. Load Audit Logs
  async function loadAdminLogs() {
    const tableBody = document.getElementById('admin-audit-table-body');
    if (!tableBody) return;

    try {
      const res = await api.get('/admin/audit-logs');
      const logs = res.data || [];

      if (logs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">No audit logs recorded yet.</td></tr>';
        return;
      }

      tableBody.innerHTML = logs
        .map(
          (l) => `
        <tr style="border-bottom: 1px solid var(--color-border);">
          <td style="padding: 0.75rem; color: var(--color-text-muted); font-size:0.8rem;">${ui.formatDate(l.created_at)}</td>
          <td style="padding: 0.75rem;"><strong>${l.admin_name || 'Admin'}</strong></td>
          <td style="padding: 0.75rem;"><span class="badge badge-primary">${l.action}</span></td>
          <td style="padding: 0.75rem;">${l.target_type} #${l.target_id || ''}</td>
          <td style="padding: 0.75rem; font-family:monospace; color:var(--color-text-muted);">${l.ip_address || '127.0.0.1'}</td>
        </tr>
      `
        )
        .join('');
    } catch (err) {
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-danger); padding: 1.5rem;">Failed to load audit trail.</td></tr>';
    }
  }

  // 7. CSV Exports with Bearer Token
  async function downloadCsv(endpoint, defaultFilename) {
    try {
      ui.showToast('Preparing CSV export...', 'info');
      const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${auth.getToken()}`
        }
      });
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      ui.showToast('Download started!', 'success');
    } catch (err) {
      ui.showToast('CSV export failed: ' + err.message, 'error');
    }
  }

  document.getElementById('btn-export-users')?.addEventListener('click', (e) => {
    e.preventDefault();
    downloadCsv('/admin/export/users', 'skillswap_users.csv');
  });

  document.getElementById('btn-export-swaps')?.addEventListener('click', (e) => {
    e.preventDefault();
    downloadCsv('/admin/export/swaps', 'skillswap_swaps.csv');
  });

  document.getElementById('btn-export-feedback')?.addEventListener('click', (e) => {
    e.preventDefault();
    downloadCsv('/admin/export/feedback', 'skillswap_feedback.csv');
  });

  // Initial load
  loadAdminStats();
  loadAdminUsers();
});
