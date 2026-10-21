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
  const sessionsCountPill = document.getElementById('sessions-count-pill');
  let currentFilter = 'all';
  let allSwaps = [];
  let allSessions = [];

  // Check URL query param for ?tab=sessions
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'sessions') {
    currentFilter = 'sessions';
    tabButtons.forEach((b) => {
      b.classList.toggle('active', b.dataset.filter === 'sessions');
    });
  }

  async function loadSwapsAndSessions() {
    if (!swapsList) return;
    swapsList.innerHTML = '<div class="spinner"></div>';

    try {
      const [swapsRes, sessionsRes] = await Promise.all([
        api.get('/swaps'),
        api.get('/sessions').catch(() => ({ data: [] }))
      ]);

      allSwaps = swapsRes.data || [];
      allSessions = sessionsRes.data || [];

      if (sessionsCountPill) {
        if (allSessions.length > 0) {
          sessionsCountPill.textContent = allSessions.length;
          sessionsCountPill.style.display = 'inline-block';
        } else {
          sessionsCountPill.style.display = 'none';
        }
      }

      renderCurrentView();
    } catch (err) {
      swapsList.innerHTML = `
        <div class="card" style="text-align: center; color: var(--color-danger); padding: 2.5rem;">
          <p>Failed to load exchange requests: ${err.message}</p>
        </div>
      `;
    }
  }

  function renderCurrentView() {
    if (currentFilter === 'sessions') {
      renderSessionsView();
    } else {
      renderFilteredSwaps();
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
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--color-text-main);">No exchanges found</h3>
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
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span class="badge ${isSender ? 'badge-accent' : 'badge-primary'}">${isSender ? 'Outgoing' : 'Incoming'}</span>
                  <h3 style="font-size: 1.15rem; font-weight: 700; margin: 0;">
                    ${isSender ? 'To: ' : 'From: '} <a href="${window.location.pathname.endsWith('.html') ? 'profile.html' : 'profile'}?id=${partnerId}" onclick="sessionStorage.setItem('selected_profile_id', '${partnerId}')">${partnerName}</a>
                  </h3>
                  <button type="button" class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 0.15rem 0.5rem; color: var(--color-text-muted); border-color: var(--color-border);" onclick="ui.openReportModal({ reportedUserId: ${partnerId}, reportedUserName: '${encodeURIComponent(partnerName)}', reportedSwapId: ${swap.id} })" title="Report inappropriate behavior">
                    🚩 Report
                  </button>
                </div>
                <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.35rem;">
                  Proposed on ${ui.formatDate(swap.created_at)}
                  ${swap.scheduled_date ? ` &bull; 📅 Session: ${ui.formatDateTime ? ui.formatDateTime(swap.scheduled_date) : ui.formatDate(swap.scheduled_date)}` : ''}
                </div>
              </div>
              <div>${statusBadge}</div>
            </div>

            <div style="background: var(--color-bg); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; border: 1px solid var(--color-border);">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.5rem;">
                <div>
                  <small style="text-transform: uppercase; font-size: 0.75rem; font-weight: 700; color: var(--color-primary);">Offered Skill:</small>
                  <p style="font-weight: 600; font-size: 1rem; margin-top: 0.2rem;">${swap.offered_skill_name}</p>
                </div>
                <div>
                  <small style="text-transform: uppercase; font-size: 0.75rem; font-weight: 700; color: var(--color-accent);">Requested Skill:</small>
                  <p style="font-weight: 600; font-size: 1rem; margin-top: 0.2rem;">${swap.requested_skill_name}</p>
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
                <button class="btn btn-outline btn-sm" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.4);" onclick="withdrawProposal(${swap.id})">
                  Withdraw Request
                </button>
              `
                  : ''
              }

              ${
                swap.status === 'accepted'
                  ? `
                <button class="btn btn-outline btn-sm" style="border-color: var(--color-border); color: var(--color-primary); font-weight: 600;" onclick="openScheduleSessionModal(${swap.id}, '${encodeURIComponent(partnerName)}', '${encodeURIComponent(swap.offered_skill_name)}', '${encodeURIComponent(swap.requested_skill_name)}')">
                  📅 Schedule Session
                </button>
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

  // --- Scheduled Sessions View & Management ---
  function renderSessionsView() {
    if (allSessions.length === 0) {
      swapsList.innerHTML = `
        <div class="card" style="text-align: center; padding: 3.5rem 1.5rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--color-text-main);">No Scheduled Sessions Yet</h3>
          <p style="color: var(--color-text-muted); max-width: 480px; margin: 0 auto 1.5rem;">
            When you and an exchange partner accept a skill swap, you can schedule dedicated 1-on-1 learning sessions here.
          </p>
          <button class="btn btn-primary btn-sm" onclick="document.querySelector('.tab-btn[data-filter=\\'accepted\\']').click()">View Active Swaps to Schedule</button>
        </div>
      `;
      return;
    }

    swapsList.innerHTML = `
      <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <p style="color: var(--color-text-muted); margin: 0; font-size: 0.95rem;">
          Showing <strong>${allSessions.length}</strong> arranged skill exchange session${allSessions.length === 1 ? '' : 's'}
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        ${allSessions
          .map((session) => {
            const partnerName = session.partner?.name || 'Swap Partner';
            const partnerId = session.partner?.id;
            const sessionDateDisplay = ui.formatDateTime ? ui.formatDateTime(session.session_date) : new Date(session.session_date).toLocaleString();

            let statusBadge = '';
            if (session.status === 'pending') {
              statusBadge = `<span class="session-status session-status-pending">Pending Confirmation</span>`;
            } else if (session.status === 'confirmed') {
              statusBadge = `<span class="session-status session-status-confirmed">✓ Confirmed</span>`;
            } else if (session.status === 'completed') {
              statusBadge = `<span class="session-status session-status-completed">✓ Completed</span>`;
            } else if (session.status === 'cancelled') {
              statusBadge = `<span class="session-status session-status-cancelled">Cancelled</span>`;
            }

            return `
              <div class="session-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                      <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--color-text-main); margin: 0;">${session.title}</h3>
                      ${statusBadge}
                    </div>
                    <p style="margin: 0.35rem 0 0; font-size: 0.875rem; color: var(--color-text-muted);">
                      Topic: <strong style="color: var(--color-accent);">${session.topic || session.offered_skill_name}</strong> &bull; With <a href="${window.location.pathname.endsWith('.html') ? 'profile.html' : 'profile'}?id=${partnerId}" onclick="sessionStorage.setItem('selected_profile_id', '${partnerId}')" style="color: var(--color-primary); font-weight: 600;">${partnerName}</a>
                    </p>
                  </div>

                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <button type="button" class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 0.2rem 0.55rem; color: var(--color-text-muted); border-color: var(--color-border);" onclick="ui.openReportModal({ reportedUserId: ${partnerId}, reportedUserName: '${encodeURIComponent(partnerName)}', reportedSwapId: ${session.swap_id} })" title="Report inappropriate behavior">
                      🚩 Report
                    </button>
                  </div>
                </div>

                <!-- Session Metadata Grid -->
                <div class="session-meta-grid">
                  <div>
                    <span style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted); display: block; font-weight: 700;">Date & Time</span>
                    <strong style="font-size: 0.95rem; color: var(--color-text-main);">🕒 ${sessionDateDisplay}</strong>
                  </div>
                  <div>
                    <span style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted); display: block; font-weight: 700;">Duration</span>
                    <strong style="font-size: 0.95rem; color: var(--color-text-main);">⏱️ ${session.duration_minutes} minutes</strong>
                  </div>
                  <div>
                    <span style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted); display: block; font-weight: 700;">Exchange Focus</span>
                    <span style="font-size: 0.9rem; color: var(--color-text-secondary);">${session.offered_skill_name} &harr; ${session.requested_skill_name}</span>
                  </div>
                </div>

                ${
                  session.agenda
                    ? `
                  <div style="background: var(--color-surface-soft); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1rem; font-size: 0.875rem;">
                    <strong style="color: var(--color-text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 0.25rem;">Agenda / Notes:</strong>
                    <div style="color: var(--color-text-secondary); line-height: 1.5;">${session.agenda}</div>
                  </div>
                `
                    : ''
                }

                <!-- Action Controls -->
                <div style="display: flex; gap: 0.65rem; justify-content: flex-end; align-items: center; flex-wrap: wrap; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--color-border);">
                  ${
                    session.can_confirm
                      ? `
                    <button class="btn btn-outline btn-sm" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.4);" onclick="handleSessionStatusAction(${session.id}, 'cancelled')">
                      ✗ Decline Session
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="handleSessionStatusAction(${session.id}, 'confirmed')">
                      ✓ Accept & Confirm Session
                    </button>
                  `
                      : ''
                  }

                  ${
                    session.status === 'pending' && session.is_creator
                      ? `
                    <span style="font-size: 0.85rem; color: var(--color-text-muted); margin-right: auto;">
                      ⏳ Waiting for ${partnerName} to confirm this session
                    </span>
                    <button class="btn btn-outline btn-sm" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.4);" onclick="handleSessionStatusAction(${session.id}, 'cancelled')">
                      Cancel Invitation
                    </button>
                  `
                      : ''
                  }

                  ${
                    session.status === 'confirmed'
                      ? `
                    <button class="btn btn-outline btn-sm" onclick="openRescheduleSessionModal(${session.id}, '${encodeURIComponent(session.title)}', '${session.session_date}', ${session.duration_minutes}, '${encodeURIComponent(session.agenda || '')}')">
                      🔄 Reschedule
                    </button>
                    <button class="btn btn-outline btn-sm" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.4);" onclick="handleSessionStatusAction(${session.id}, 'cancelled')">
                      Cancel
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="handleSessionStatusAction(${session.id}, 'completed')">
                      ✓ Mark Session Completed
                    </button>
                  `
                      : ''
                  }
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  // Handle Tab filter changes
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderCurrentView();
    });
  });

  // Action: Accept / Reject / Complete Swap
  window.handleSwapAction = async (swapId, newStatus) => {
    let confirmMsg = `Are you sure you want to change this swap to '${newStatus}'?`;
    if (newStatus === 'completed') confirmMsg = 'Confirm that both parties have completed your skill exchange?';
    if (!confirm(confirmMsg)) return;

    try {
      await api.patch(`/swaps/${swapId}/status`, { status: newStatus });
      ui.showToast(`Swap updated to '${newStatus}'!`, 'success');
      loadSwapsAndSessions();
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
      loadSwapsAndSessions();
    } catch (err) {
      ui.showToast(err.message, 'error');
    }
  };

  // --- Session Modal: Schedule a New Session ---
  window.openScheduleSessionModal = (swapId, encodedPartnerName, encodedOfferedSkill, encodedRequestedSkill) => {
    const partnerName = decodeURIComponent(encodedPartnerName);
    const offeredSkill = decodeURIComponent(encodedOfferedSkill);
    const requestedSkill = decodeURIComponent(encodedRequestedSkill);

    // Default to tomorrow at 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const defaultDateStr = tomorrow.toISOString().slice(0, 16);

    const modalHtml = `
      <form id="schedule-session-form">
        <p style="margin-bottom: 1.25rem; font-size: 0.95rem; color: var(--color-text-muted);">
          Arrange a dedicated 1-on-1 skill exchange session with <strong>${partnerName}</strong>.
        </p>

        <div class="form-group">
          <label class="form-label" for="session-title">Session Title:</label>
          <input type="text" id="session-title" class="form-control" required value="${offeredSkill} & ${requestedSkill} Practice Session">
        </div>

        <div class="form-group">
          <label class="form-label" for="session-topic">Primary Topic / Skill Focus:</label>
          <input type="text" id="session-topic" class="form-control" value="${offeredSkill}">
        </div>

        <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label" for="session-date">Date & Start Time:</label>
            <input type="datetime-local" id="session-date" class="form-control" required value="${defaultDateStr}">
          </div>

          <div class="form-group">
            <label class="form-label" for="session-duration">Duration:</label>
            <select id="session-duration" class="form-control" required>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60" selected>60 minutes</option>
              <option value="90">90 minutes</option>
              <option value="120">2 hours</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="session-agenda">Agenda / Notes (Optional):</label>
          <textarea id="session-agenda" class="form-control" rows="3" placeholder="Outline what concepts or projects you plan to work through during this session..."></textarea>
        </div>

        <div class="modal-footer" style="padding: 1rem 0 0; border-top: none; background: transparent;">
          <button type="button" class="btn btn-secondary" onclick="ui.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="schedule-session-submit-btn">Send Session Invitation</button>
        </div>
      </form>
    `;

    ui.openModal(`Schedule Session with ${partnerName}`, modalHtml);

    document.getElementById('schedule-session-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const form = document.getElementById('schedule-session-form');
      const isValid = validator.validateForm(form, {
        '#session-title': {
          required: 'Please enter a title for the session.'
        },
        '#session-date': {
          required: 'Please select a session date and time.',
          futureDate: 'Session date and time must be scheduled in the future.'
        },
        '#session-duration': {
          required: 'Please select a session duration.'
        }
      });

      if (!isValid) return;

      const submitBtn = document.getElementById('schedule-session-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Scheduling...';

      const title = document.getElementById('session-title').value.trim();
      const topic = document.getElementById('session-topic').value.trim();
      const sessionDate = document.getElementById('session-date').value;
      const durationMinutes = parseInt(document.getElementById('session-duration').value, 10);
      const agenda = document.getElementById('session-agenda').value.trim();

      try {
        await api.post('/sessions', {
          swapId,
          title,
          topic,
          sessionDate,
          durationMinutes,
          agenda
        });

        ui.closeModal();
        ui.showToast('Session scheduled! An invitation was sent to your partner.', 'success');
        currentFilter = 'sessions';
        tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.filter === 'sessions'));
        loadSwapsAndSessions();
      } catch (err) {
        ui.showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Session Invitation';
      }
    });
  };

  // --- Session Modal: Reschedule Session ---
  window.openRescheduleSessionModal = (sessionId, encodedTitle, currentDate, currentDuration, encodedAgenda) => {
    const title = decodeURIComponent(encodedTitle);
    const agenda = decodeURIComponent(encodedAgenda);
    const dateFormatted = new Date(currentDate).toISOString().slice(0, 16);

    const modalHtml = `
      <form id="reschedule-session-form">
        <p style="margin-bottom: 1.25rem; font-size: 0.95rem; color: var(--color-text-muted);">
          Propose a new date and time for <strong>"${title}"</strong>.
        </p>

        <div class="form-group">
          <label class="form-label" for="reschedule-title">Session Title:</label>
          <input type="text" id="reschedule-title" class="form-control" required value="${title}">
        </div>

        <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label" for="reschedule-date">New Date & Time:</label>
            <input type="datetime-local" id="reschedule-date" class="form-control" required value="${dateFormatted}">
          </div>

          <div class="form-group">
            <label class="form-label" for="reschedule-duration">Duration:</label>
            <select id="reschedule-duration" class="form-control" required>
              <option value="30" ${currentDuration === 30 ? 'selected' : ''}>30 minutes</option>
              <option value="45" ${currentDuration === 45 ? 'selected' : ''}>45 minutes</option>
              <option value="60" ${currentDuration === 60 ? 'selected' : ''}>60 minutes</option>
              <option value="90" ${currentDuration === 90 ? 'selected' : ''}>90 minutes</option>
              <option value="120" ${currentDuration === 120 ? 'selected' : ''}>2 hours</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="reschedule-agenda">Updated Notes (Optional):</label>
          <textarea id="reschedule-agenda" class="form-control" rows="3">${agenda}</textarea>
        </div>

        <div class="modal-footer" style="padding: 1rem 0 0; border-top: none; background: transparent;">
          <button type="button" class="btn btn-secondary" onclick="ui.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="reschedule-submit-btn">Send Reschedule Request</button>
        </div>
      </form>
    `;

    ui.openModal('Reschedule Session', modalHtml);

    document.getElementById('reschedule-session-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const form = document.getElementById('reschedule-session-form');
      const isValid = validator.validateForm(form, {
        '#reschedule-title': {
          required: 'Please enter a title for the session.'
        },
        '#reschedule-date': {
          required: 'Please select a new date and time.',
          futureDate: 'New session date and time must be in the future.'
        },
        '#reschedule-duration': {
          required: 'Please select session duration.'
        }
      });

      if (!isValid) return;

      const submitBtn = document.getElementById('reschedule-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';

      const newTitle = document.getElementById('reschedule-title').value.trim();
      const sessionDate = document.getElementById('reschedule-date').value;
      const durationMinutes = parseInt(document.getElementById('reschedule-duration').value, 10);
      const newAgenda = document.getElementById('reschedule-agenda').value.trim();

      try {
        await api.patch(`/sessions/${sessionId}/reschedule`, {
          title: newTitle,
          sessionDate,
          durationMinutes,
          agenda: newAgenda
        });

        ui.closeModal();
        ui.showToast('Session rescheduled and sent for partner confirmation.', 'success');
        loadSwapsAndSessions();
      } catch (err) {
        ui.showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reschedule Request';
      }
    });
  };

  // --- Session Status Transitions (Confirm / Cancel / Complete) ---
  window.handleSessionStatusAction = async (sessionId, newStatus) => {
    let confirmMsg = `Are you sure you want to mark this session as '${newStatus}'?`;
    if (newStatus === 'confirmed') confirmMsg = 'Confirm this session time with your partner?';
    if (newStatus === 'completed') confirmMsg = 'Mark this exchange session as successfully completed?';
    if (newStatus === 'cancelled') confirmMsg = 'Are you sure you want to cancel this scheduled session?';

    if (!confirm(confirmMsg)) return;

    try {
      await api.patch(`/sessions/${sessionId}/status`, { status: newStatus });
      ui.showToast(`Session marked as '${newStatus}'!`, 'success');
      loadSwapsAndSessions();
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

      const rating = parseInt(document.getElementById('selected-rating').value, 10);
      if (!rating || rating < 1 || rating > 5) {
        validator.showError(starPicker, 'Please select a star rating between 1 and 5 stars.');
        return;
      }

      const submitBtn = document.getElementById('submit-review-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

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
        loadSwapsAndSessions();
      } catch (err) {
        ui.showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Feedback';
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

  loadSwapsAndSessions();
});
