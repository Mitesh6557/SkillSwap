/**
 * SkillSwap - Notifications Page Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!auth.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  const listContainer = document.getElementById('notifications-list');
  const markAllBtn = document.getElementById('mark-all-read-btn');

  async function loadNotifications() {
    if (!listContainer) return;
    try {
      const res = await api.get('/notifications');
      const items = res.data || [];

      if (items.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align: center; padding: 3rem; background: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border);">
            <h3>No notifications</h3>
            <p style="color: var(--color-text-muted);">You're all caught up!</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = items
        .map(
          (n) => `
        <div class="card" style="margin-bottom: 1rem; border-left: 4px solid ${n.is_read ? 'var(--color-border)' : 'var(--color-primary)'}; background: ${n.is_read ? 'var(--color-surface)' : 'var(--color-primary-light)'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h4 style="font-weight: 700; margin-bottom: 0.25rem;">${n.title}</h4>
              <p style="font-size: 0.95rem; color: var(--color-text-main); margin-bottom: 0.5rem;">${n.message}</p>
              <span style="font-size: 0.8rem; color: var(--color-text-muted);">${ui.formatDate(n.created_at)}</span>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              ${n.type.startsWith('swap_') ? '<a href="my-swaps.html" class="btn btn-outline btn-sm">View Swap</a>' : ''}
              ${
                !n.is_read
                  ? `
                <button class="btn btn-primary btn-sm" onclick="markNotificationRead(${n.id})">Mark as read</button>
              `
                  : ''
              }
            </div>
          </div>
        </div>
      `
        )
        .join('');
    } catch (err) {
      listContainer.innerHTML = '<p style="color: var(--color-danger); text-align: center;">Unable to load notifications.</p>';
    }
  }

  window.markNotificationRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      loadNotifications();
    } catch (err) {
      ui.showToast('Failed to update notification', 'error');
    }
  };

  markAllBtn?.addEventListener('click', async () => {
    try {
      await api.patch('/notifications/read-all');
      ui.showToast('All notifications marked as read', 'success');
      loadNotifications();
    } catch (err) {
      ui.showToast('Failed to mark all as read', 'error');
    }
  });

  loadNotifications();
});
