/**
 * SkillSwap - UI Helper Utilities
 * Toast notifications, dynamic navbar state, modals, and date formatting.
 */

const ui = {
  /**
   * Display toast alert
   */
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  /**
   * Modal Dialog System
   */
  openModal(title, bodyHtml, footerHtml = '') {
    this.closeModal();

    const backdrop = document.createElement('div');
    backdrop.id = 'global-modal-backdrop';
    backdrop.className = 'modal-backdrop';

    backdrop.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close-btn" onclick="ui.closeModal()">&times;</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    `;

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        ui.closeModal();
      }
    });

    document.body.appendChild(backdrop);
    // Trigger animation
    requestAnimationFrame(() => {
      backdrop.classList.add('show');
    });
  },

  closeModal() {
    const existing = document.getElementById('global-modal-backdrop');
    if (existing) {
      existing.classList.remove('show');
      setTimeout(() => existing.remove(), 200);
    }
  },

  /**
   * Updates navbar links dynamically based on login state
   */
  async updateNavbarAuth() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    if (window.auth && auth.isAuthenticated()) {
      const user = auth.getUser();
      const initials = this.getAvatarInitials(user?.name || 'User');
      const isAdmin = auth.isAdmin();

      navActions.innerHTML = `
        ${isAdmin ? '<a href="admin.html" class="btn btn-secondary btn-sm" style="border: 1px solid var(--color-danger); color: var(--color-danger); font-weight:700;">Admin Panel</a>' : ''}
        <a href="notifications.html" class="btn btn-outline btn-sm" title="Notifications" id="nav-notifications-link" style="position: relative;">
          🔔 <span id="nav-unread-badge" style="display:none; background:var(--color-danger); color:#fff; border-radius:10px; padding:2px 6px; font-size:11px; font-weight:700;">0</span>
        </a>
        <a href="${window.location.pathname.endsWith('.html') ? 'profile.html' : 'profile'}" class="btn btn-outline btn-sm" onclick="sessionStorage.removeItem('selected_profile_id')" style="display: flex; align-items: center; gap: 0.55rem;">
          <span style="display:inline-block; width:28px; height:28px; border-radius:50%; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; text-align:center; font-size:12px; font-weight:800; line-height:26px;">${initials}</span>
          ${user?.name?.split(' ')[0] || 'Profile'}
        </a>
        <button id="logout-btn" class="btn btn-secondary btn-sm">Logout</button>
      `;

      document.getElementById('logout-btn')?.addEventListener('click', () => auth.logout());

      // Fetch unread notification count
      try {
        const notifRes = await api.get('/notifications');
        const unreadCount = (notifRes.data || []).filter(n => !n.is_read).length;
        const badge = document.getElementById('nav-unread-badge');
        if (badge && unreadCount > 0) {
          badge.textContent = unreadCount;
          badge.style.display = 'inline-block';
        }
      } catch (e) {
        // Silent catch for background unread check
      }
    } else {
      navActions.innerHTML = `
        <a href="login.html" class="btn btn-outline btn-sm">Log In</a>
        <a href="register.html" class="btn btn-primary btn-sm">Sign Up Free</a>
      `;
    }
  },

  /**
   * Toggle mobile navigation menu
   */
  setupMobileMenu() {
    const toggleBtn = document.querySelector('.menu-toggle-btn');
    const navLinks = document.querySelector('.nav-links');

    if (toggleBtn && navLinks) {
      toggleBtn.addEventListener('click', () => {
        navLinks.classList.toggle('show');
      });
    }
  },

  /**
   * Generate 2-letter initials from name
   */
  getAvatarInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  },

  /**
   * Format ISO date string into human friendly date
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  /**
   * Format ISO date string into date & time
   */
  formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Universal Report Modal for Trust & Safety
   */
  async openReportModal({ reportedUserId = null, reportedUserName = 'User', reportedSwapId = null }) {
    if (!window.auth || !auth.isAuthenticated()) {
      this.showToast('Please log in to submit a safety report.', 'error');
      window.location.href = 'login.html';
      return;
    }

    let reasons = [
      'Inappropriate content or messages',
      'Harassment or abusive behavior',
      'No-show / Missed session',
      'Spam / Commercial solicitation',
      'Fake profile or misleading skills',
      'Other'
    ];

    try {
      const res = await api.get('/reports/reasons');
      if (res.data) reasons = res.data;
    } catch (e) {
      // fallback
    }

    const optionsHtml = reasons.map(r => `<option value="${r}">${r}</option>`).join('');

    const bodyHtml = `
      <form id="report-modal-form">
        <p style="color: var(--color-text-secondary); margin-bottom: 1rem; font-size: 0.9rem;">
          You are reporting <strong>${reportedUserName}</strong>. Our Trust & Safety team will review this report and take appropriate moderation action.
        </p>
        <div class="form-group" style="margin-bottom: 1rem;">
          <label style="display: block; font-weight: 600; margin-bottom: 0.35rem; color: var(--color-text-main);">Reason for Report *</label>
          <select id="report-reason-select" class="form-control" required style="width: 100%;">
            <option value="" disabled selected>Select a reason...</option>
            ${optionsHtml}
          </select>
        </div>
        <div class="form-group">
          <label style="display: block; font-weight: 600; margin-bottom: 0.35rem; color: var(--color-text-main);">Additional Details (Optional)</label>
          <textarea id="report-details-input" class="form-control" rows="3" placeholder="Describe the incident or violation..." style="width: 100%;"></textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-outline btn-sm" onclick="ui.closeModal()">Cancel</button>
      <button id="btn-submit-report" class="btn btn-danger btn-sm" style="background: var(--color-danger); color: #fff;">🚩 Submit Report</button>
    `;

    this.openModal(`Report ${reportedUserName}`, bodyHtml, footerHtml);

    const reasonSelect = document.getElementById('report-reason-select');
    reasonSelect?.addEventListener('change', () => {
      if (window.validator) validator.clearError(reasonSelect);
    });

    document.getElementById('btn-submit-report')?.addEventListener('click', async () => {
      const detailsInput = document.getElementById('report-details-input');
      const reason = reasonSelect?.value;

      if (!reason) {
        if (window.validator) {
          validator.showError(reasonSelect, 'Please select a reason for reporting this user.');
          reasonSelect.focus();
        } else {
          ui.showToast('Please select a report reason.', 'error');
        }
        return;
      }

      const submitBtn = document.getElementById('btn-submit-report');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      try {
        const payload = {
          reason,
          details: detailsInput?.value || null
        };
        if (reportedUserId) payload.reportedUserId = reportedUserId;
        if (reportedSwapId) payload.reportedSwapId = reportedSwapId;

        const res = await api.post('/reports', payload);
        ui.closeModal();
        ui.showToast(res.message || 'Report submitted successfully.', 'success');
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚩 Submit Report';
        ui.showToast(err.message || 'Failed to submit report.', 'error');
      }
    });
  }
};

window.ui = ui;

// Automatic navbar setup on page load
document.addEventListener('DOMContentLoaded', () => {
  ui.updateNavbarAuth();
  ui.setupMobileMenu();
});
