/**
 * SkillSwap - Swaps Management Page Logic
 * Sent/Received tabs, lifecycle state transitions, proposal withdrawals, and feedback submissions.
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!auth.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  const swapsList = document.getElementById('swaps-list');
  const tabButtons = document.querySelectorAll('.tab-btn');
  let currentFilter = 'all';
  let allSwaps = [];

  async function loadSwaps() {
    if (!swapsList) return;
    swapsList.innerHTML = '<div class="spinner"></div>';

    try {
      const res = await api.get('/swaps');
      allSwaps = res.data || [];
      renderFilteredSwaps();
    } catch (err) {
      swapsList.innerHTML = `
        <div class="card" style="text-align: center; color: var(--color-danger); padding: 2.5rem;">
          <p>Failed to load exchange requests: ${err.message}</p>
        </div>
      `;
    }
  }

  function renderFilteredSwaps() {
    const currentUserId = auth.getUser().id;

    const filtered = allSwaps.filter((swap) => {
      const isSender = swap.requester_id === currentUserId;
      if (currentFilter === 'all') return true;
      if (currentFilter === 'received') return !isSender;
      if (currentFilter === 'sent') return isSender;
      if (currentFilter === 'pending') return swap.status === 'pending';
      if (currentFilter === 'accepted') return swap.status === 'accepted';
      if (currentFilter === 'completed') return swap.status === 'completed';
      return true;
    });

    if (filtered.length === 0) {
      swapsList.innerHTML = `
        <div class="card" style="text-align: center; padding: 3.5rem 1.5rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🤝</div>
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">No exchanges found</h3>
          <p style="color: var(--color-text-muted); max-width: 440px; margin: 0 auto 1.5rem;">
            ${
              currentFilter === 'all'
                ? "You haven't initiated or received any skill exchange proposals yet."
                : `No exchanges found under the '${currentFilter}' filter.`
            }
          </p>
          <a href="discover.html" class="btn btn-primary">Find an Exchange Partner</a>
        </div>
      `;
      return;
    }

    swapsList.innerHTML = filtered
      .map((swap) => {
        const isSender = swap.requester_id === currentUserId;
        const partnerName = isSender ? swap.receiver_name : swap.requester_name;
        const partnerId = isSender ? swap.receiver_id : swap.requester_id;
        const statusBadge = getStatusBadge(swap.status);

        return `
          <div class="card" style="margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="badge ${isSender ? 'badge-accent' : 'badge-primary'}">${isSender ? 'Outgoing' : 'Incoming'}</span>
                  <h3 style="font-size: 1.15rem; font-weight: 700;">
                    ${isSender ? 'To: ' : 'From: '} <a href="profile.html?id=${partnerId}">${partnerName}</a>
                  </h3>
                </div>
                <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.25rem;">
                  Proposed on ${ui.formatDate(swap.created_at)}
                  ${swap.scheduled_date ? ` &bull; 📅 Session scheduled: ${ui.formatDate(swap.scheduled_date)}` : ''}
                </div>
              </div>
              <div>${statusBadge}</div>
            </div>

            <div style="background: var(--color-bg); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; border: 1px solid var(--color-border);">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.5rem;">
                <div>
                  <small style="text-transform: uppercase; font-size: 0.75rem; font-weight: 700; color: var(--color-primary);">Offered Skill:</small>
                  <p style="font-weight: 600; font-size: 1rem;">${swap.offered_skill_name}</p>
                </div>
                <div>
                  <small style="text-transform: uppercase; font-size: 0.75rem; font-weight: 700; color: #0e7490;">Requested Skill:</small>
                  <p style="font-weight: 600; font-size: 1rem;">${swap.requested_skill_name}</p>
                </div>
              </div>
              ${
                swap.message
                  ? `<div style="font-size: 0.9rem; color: var(--color-text-main); font-style: italic; border-left: 3px solid var(--color-border); padding-left: 0.75rem; margin-top: 0.5rem;">"${swap.message}"</div>`
                  : ''
              }
            </div>

            <div style="display: flex; gap: 0.75rem; justify-content: flex-end; align-items: center; flex-wrap: wrap;">
              ${
                !isSender && swap.status === 'pending'
                  ? `
                <button class="btn btn-secondary btn-sm" onclick="handleSwapAction(${swap.id}, 'rejected')">Decline</button>
                <button class="btn btn-primary btn-sm" onclick="handleSwapAction(${swap.id}, 'accepted')">✓ Accept Proposal</button>
              `
                  : ''
              }

              ${
                isSender && swap.status === 'pending'
                  ? `
                <button class="btn btn-outline btn-sm" style="color: var(--color-danger); border-color: #fca5a5;" onclick="withdrawProposal(${swap.id})">
                  Withdraw Request
                </button>
              `
                  : ''
              }

              ${
                swap.status === 'accepted'
                  ? `
                <button class="btn btn-primary btn-sm" onclick="handleSwapAction(${swap.id}, 'completed')">
                  ✓ Mark Exchange as Completed
                </button>
              `
                  : ''
              }

              ${
                swap.status === 'completed'
                  ? swap.has_reviewed
                    ? '<span class="badge badge-success">✓ Review Submitted</span>'
                    : `<button class="btn btn-primary btn-sm" onclick="openReviewModal(${swap.id}, ${partnerId}, '${encodeURIComponent(partnerName)}')">⭐ Leave Review & Rating</button>`
                  : ''
              }
            </div>
          </div>
        `;
      })
      .join('');
  }

  // Handle Tab filter changes
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderFilteredSwaps();
    });
  });

  // Action: Accept / Reject / Complete
  window.handleSwapAction = async (swapId, newStatus) => {
    let confirmMsg = `Are you sure you want to change this swap to '${newStatus}'?`;
    if (newStatus === 'completed') confirmMsg = 'Confirm that both parties have completed your skill exchange?';
    if (!confirm(confirmMsg)) return;

    try {
      await api.patch(`/swaps/${swapId}/status`, { status: newStatus });
      ui.showToast(`Swap updated to '${newStatus}'!`, 'success');
      loadSwaps();
    } catch (err) {
      ui.showToast(err.message, 'error');
    }
  };

  // Action: Withdraw pending request
  window.withdrawProposal = async (swapId) => {
    if (!confirm('Are you sure you want to withdraw this swap proposal?')) return;
    try {
      await api.delete(`/swaps/${swapId}`);
      ui.showToast('Proposal withdrawn successfully.', 'success');
      loadSwaps();
    } catch (err) {
      ui.showToast(err.message, 'error');
    }
  };

  // Action: Submit Review Modal
  window.openReviewModal = (swapId, revieweeId, encodedName) => {
    const partnerName = decodeURIComponent(encodedName);

    const modalHtml = `
      <form id="submit-review-form">
        <p style="margin-bottom: 1.25rem; font-size: 0.95rem; color: var(--color-text-muted);">
          Share your experience learning with <strong>${partnerName}</strong>. Your feedback helps build trust in our community.
        </p>

        <div class="form-group">
          <label class="form-label">Rating:</label>
          <div id="star-picker" style="font-size: 2rem; cursor: pointer; color: #f59e0b; user-select: none;">
            <span data-star="1">★</span><span data-star="2">★</span><span data-star="3">★</span><span data-star="4">★</span><span data-star="5">★</span>
          </div>
          <input type="hidden" id="selected-rating" value="5">
        </div>

        <div class="form-group">
          <label class="form-label" for="review-comment">Written Review (Optional):</label>
          <textarea id="review-comment" class="form-control" rows="3" placeholder="How was the session? Did they explain concepts clearly?"></textarea>
        </div>

        <div class="modal-footer" style="padding: 1rem 0 0; border-top: none; background: transparent;">
          <button type="button" class="btn btn-secondary" onclick="ui.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="submit-review-btn">Submit Feedback</button>
        </div>
      </form>
    `;

    ui.openModal(`Review Exchange with ${partnerName}`, modalHtml);

    // Star picker interactive behavior
    let currentRating = 5;
    const starPicker = document.getElementById('star-picker');
    const updateStars = (val) => {
      currentRating = val;
      document.getElementById('selected-rating').value = val;
      starPicker.querySelectorAll('span').forEach((s, idx) => {
        s.textContent = idx < val ? '★' : '☆';
      });
    };

    starPicker.querySelectorAll('span').forEach((s) => {
      s.addEventListener('click', () => updateStars(parseInt(s.dataset.star, 10)));
    });

    // Form submission
    document.getElementById('submit-review-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submit-review-btn');
      submitBtn.disabled = true;

      const rating = parseInt(document.getElementById('selected-rating').value, 10);
      const comment = document.getElementById('review-comment').value.trim();

      try {
        await api.post('/reviews', {
          swapId,
          revieweeId,
          rating,
          comment
        });

        ui.closeModal();
        ui.showToast('Thank you! Your feedback has been recorded.', 'success');
        loadSwaps();
      } catch (err) {
        ui.showToast(err.message, 'error');
        submitBtn.disabled = false;
      }
    });
  };

  function getStatusBadge(status) {
    switch (status) {
      case 'pending':
        return '<span class="badge badge-warning">Pending Response</span>';
      case 'accepted':
        return '<span class="badge badge-primary">Active Exchange</span>';
      case 'completed':
        return '<span class="badge badge-success">Completed</span>';
      case 'rejected':
        return '<span class="badge badge-danger">Declined</span>';
      case 'cancelled':
        return '<span class="badge badge-secondary">Withdrawn</span>';
      default:
        return `<span class="badge">${status}</span>`;
    }
  }

  loadSwaps();
});
