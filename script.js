/* ==========================================================================
   CHANAKYA - Strategic Cohort Accountability & Performance OS
   Featuring Calendar Exam & Work Scheduler + PDF Briefing
   ========================================================================== */

const STORAGE_KEY = 'chanakya_cohort_v3_master';

// Chanakya Strategic Principles
const CHANAKYA_NEETI = [
  "A man is great by deeds, not by birth.",
  "Education is the best friend. An educated person is respected everywhere.",
  "Before you start some work, always ask yourself: Why am I doing it, What the results might be, and Will I be successful.",
  "Learn from the mistakes of others... you can't live long enough to make them all yourself.",
  "Once you start working on something, don't be afraid of failure and don't abandon it.",
  "The fragrance of flowers spreads only in the direction of the wind. But the goodness of a person spreads in all directions."
];

// Founding Team Setup
const DEFAULT_MEMBERS = [
  {
    id: 'sandeep',
    name: 'Sandeep Gowravam',
    dept: 'B.Tech - EEE',
    color: '#06b6d4',
    avatar: 'SG'
  },
  {
    id: 'yasaswini',
    name: 'Yasaswini Arepalli',
    dept: 'B.Tech - ECE',
    color: '#a855f7',
    avatar: 'YA'
  }
];

// Application State
let state = {
  activeMemberId: 'sandeep',
  members: [...DEFAULT_MEMBERS],
  logs: [],       // Clean production start: No dummy logs
  events: [],     // Calendar Works, Exams & Deadlines
  milestones: [
    
  ],
  cohortFilter: 'all',
  calendarDate: new Date(),
  selectedDateStr: getTodayISO()
};

// Chart.js references
let velocityChartInstance = null;
let domainChartInstance = null;

/* --------------------------------------------------------------------------
   Initialization
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  
  // Set default modal dates to today
  const todayStr = getTodayISO();
  const dateInput = document.getElementById('logDateInput');
  if (dateInput) dateInput.value = todayStr;

  const eventDateInput = document.getElementById('eventDateInput');
  if (eventDateInput) eventDateInput.value = todayStr;

  rotatePrinciple();
  initCharts();
  renderAll();
});

function getTodayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rotatePrinciple() {
  const rand = Math.floor(Math.random() * CHANAKYA_NEETI.length);
  const elem = document.getElementById('chanakyaQuote');
  if (elem) elem.innerText = `"${CHANAKYA_NEETI[rand]}" — Chanakya`;
}

/* --------------------------------------------------------------------------
   Storage Persistence
   -------------------------------------------------------------------------- */
function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.members) && parsed.members.length > 0) state.members = parsed.members;
      if (Array.isArray(parsed.logs)) state.logs = parsed.logs;
      if (Array.isArray(parsed.events)) state.events = parsed.events;
      if (Array.isArray(parsed.milestones)) state.milestones = parsed.milestones;
      if (parsed.activeMemberId) state.activeMemberId = parsed.activeMemberId;
    } catch (e) {
      console.error('Storage parse error:', e);
    }
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    members: state.members,
    logs: state.logs,
    events: state.events,
    milestones: state.milestones,
    activeMemberId: state.activeMemberId
  }));
}

/* --------------------------------------------------------------------------
   Member Management & Carousel
   -------------------------------------------------------------------------- */
function renderMemberSwitcher() {
  const container = document.getElementById('membersPillList');
  const modalSelect = document.getElementById('logMemberSelect');
  const eventSelect = document.getElementById('eventMemberSelect');
  const milestoneOwnerSelect = document.getElementById('msOwnerSelect');
  const filterWrap = document.getElementById('feedFilterButtons');

  if (!container) return;
  container.innerHTML = '';
  if (modalSelect) modalSelect.innerHTML = '';
  if (eventSelect) eventSelect.innerHTML = `<option value="cohort">Joint Cohort (All)</option>`;
  if (milestoneOwnerSelect) milestoneOwnerSelect.innerHTML = `<option value="cohort">Joint Cohort Effort</option>`;

  if (filterWrap) {
    filterWrap.innerHTML = `<button class="filter-pill ${state.cohortFilter === 'all' ? 'active' : ''}" onclick="setCohortFilter('all')">All Cohort</button>`;
  }

  state.members.forEach(m => {
    // 1. Carousel Pill
    const pill = document.createElement('button');
    pill.className = `member-pill ${m.id === state.activeMemberId ? 'active' : ''}`;
    pill.onclick = () => selectActiveMember(m.id);
    pill.innerHTML = `
      <span class="pill-dot" style="background-color: ${m.color}; box-shadow: 0 0 6px ${m.color};"></span>
      ${m.name.split(' ')[0]} (${m.dept.split(' ')[0]})
    `;
    container.appendChild(pill);

    // 2. Select in Modals
    if (modalSelect) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.innerText = `${m.name} (${m.dept})`;
      if (m.id === state.activeMemberId) opt.selected = true;
      modalSelect.appendChild(opt);
    }

    if (eventSelect) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.innerText = m.name;
      eventSelect.appendChild(opt);
    }

    if (milestoneOwnerSelect) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.innerText = m.name;
      milestoneOwnerSelect.appendChild(opt);
    }

    // 3. Feed Filter Pills
    if (filterWrap) {
      const fPill = document.createElement('button');
      fPill.className = `filter-pill ${state.cohortFilter === m.id ? 'active' : ''}`;
      fPill.onclick = () => setCohortFilter(m.id);
      fPill.innerText = m.name.split(' ')[0];
      filterWrap.appendChild(fPill);
    }
  });
}

function selectActiveMember(id) {
  state.activeMemberId = id;
  saveToStorage();
  renderMemberSwitcher();
  renderMetrics();
  updateCharts();
}

function openMemberModal() {
  document.getElementById('memberModal').classList.add('open');
}

function closeMemberModal() {
  document.getElementById('memberModal').classList.remove('open');
}

function submitNewMember(event) {
  event.preventDefault();
  const name = document.getElementById('newMemberName').value.trim();
  const dept = document.getElementById('newMemberDept').value.trim();
  const color = document.querySelector('input[name="memberColor"]:checked')?.value || '#06b6d4';

  if (!name || !dept) return;

  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const newId = 'mem_' + Date.now();

  state.members.push({
    id: newId,
    name: name,
    dept: dept,
    color: color,
    avatar: initials || 'CO'
  });

  state.activeMemberId = newId;
  saveToStorage();
  closeMemberModal();
  document.getElementById('memberForm').reset();
  renderAll();
}

/* --------------------------------------------------------------------------
   Master Render
   -------------------------------------------------------------------------- */
function renderAll() {
  renderMemberSwitcher();
  renderMetrics();
  updateCharts();
  renderCalendar();
  renderTargetQueue();
  renderMilestones();
  renderFeed();
}

/* --------------------------------------------------------------------------
   Metrics & KPI Computation
   -------------------------------------------------------------------------- */
function renderMetrics() {
  const currentMemberId = state.activeMemberId;
  const userLogs = state.logs.filter(l => l.memberId === currentMemberId);

  // 1. Momentum Streak
  const streak = computeStreak(userLogs);
  document.getElementById('metricStreak').innerHTML = `${streak} <span class="unit">Days</span>`;
  const checkedToday = userLogs.some(l => l.date === getTodayISO());
  document.getElementById('metricStreakFoot').innerText = checkedToday ? '✓ Check-in recorded today' : 'Pending today\'s standup';

  // 2. Study Hours Logged
  const totalHrs = userLogs.reduce((acc, curr) => acc + (parseFloat(curr.hours) || 0), 0);
  document.getElementById('metricTotalHrs').innerHTML = `${totalHrs.toFixed(1)} <span class="unit">Hrs</span>`;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklyHrs = userLogs
    .filter(l => new Date(l.date) >= sevenDaysAgo)
    .reduce((acc, curr) => acc + (parseFloat(curr.hours) || 0), 0);
  document.getElementById('metricWeeklyHrs').innerText = `Past 7 days: ${weeklyHrs.toFixed(1)} hrs`;

  // 3. Execution Quality
  if (userLogs.length > 0) {
    const avgEnergy = (userLogs.reduce((acc, curr) => acc + (parseInt(curr.energy) || 4), 0) / userLogs.length).toFixed(1);
    document.getElementById('metricFlow').innerHTML = `${avgEnergy} <span class="unit">/ 5.0</span>`;
  } else {
    document.getElementById('metricFlow').innerHTML = `-- <span class="unit">/ 5.0</span>`;
  }

  // 4. Upcoming Events / Works Count
  const upcomingEvents = state.events.filter(e => !e.completed).length;
  document.getElementById('metricEvents').innerText = upcomingEvents;
  document.getElementById('metricEventsFoot').innerText = `${upcomingEvents} items on agenda`;
}

function computeStreak(logs) {
  if (!logs || logs.length === 0) return 0;
  const uniqueDates = [...new Set(logs.map(l => l.date))].sort().reverse();
  const today = getTodayISO();

  let streak = 0;
  let check = new Date();

  if (!uniqueDates.includes(today)) {
    check.setDate(check.getDate() - 1);
  }

  while (true) {
    const y = check.getFullYear();
    const m = String(check.getMonth() + 1).padStart(2, '0');
    const d = String(check.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;

    if (uniqueDates.includes(iso)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/* --------------------------------------------------------------------------
   Charts (Chart.js)
   -------------------------------------------------------------------------- */
function initCharts() {
  const vCtx = document.getElementById('velocityChart').getContext('2d');
  velocityChartInstance = new Chart(vCtx, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } } }
      },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: '#64748b', stepSize: 1 }, grid: { color: 'rgba(34, 48, 73, 0.4)' } }
      }
    }
  });

  const dCtx = document.getElementById('domainChart').getContext('2d');
  domainChartInstance = new Chart(dCtx, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#94a3b8', boxWidth: 10, font: { size: 10 } } }
      }
    }
  });
}

function updateCharts() {
  if (!velocityChartInstance || !domainChartInstance) return;

  // Past 7 Days
  const pastDays = [];
  const pastLabels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    pastDays.push(`${y}-${m}-${day}`);
    pastLabels.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }));
  }

  const datasets = state.members.map(m => {
    const memberHours = pastDays.map(dayStr => {
      return state.logs
        .filter(l => l.memberId === m.id && l.date === dayStr)
        .reduce((sum, l) => sum + (parseFloat(l.hours) || 0), 0);
    });

    return {
      label: m.name.split(' ')[0],
      data: memberHours,
      backgroundColor: m.color + 'bb',
      borderColor: m.color,
      borderRadius: 6
    };
  });

  velocityChartInstance.data.labels = pastLabels;
  velocityChartInstance.data.datasets = datasets;
  velocityChartInstance.update();

  // Domain Split
  const domainTotals = {};
  state.logs.forEach(l => {
    const d = l.domain || 'Core B.Tech';
    domainTotals[d] = (domainTotals[d] || 0) + (parseFloat(l.hours) || 0);
  });

  const domKeys = Object.keys(domainTotals);
  const domVals = Object.values(domainTotals);

  if (domKeys.length === 0) {
    domainChartInstance.data.labels = ['No logs recorded yet'];
    domainChartInstance.data.datasets[0].data = [1];
    domainChartInstance.data.datasets[0].backgroundColor = ['#1e293b'];
  } else {
    domainChartInstance.data.labels = domKeys;
    domainChartInstance.data.datasets[0].data = domVals;
    domainChartInstance.data.datasets[0].backgroundColor = [
      '#06b6d4', '#a855f7', '#10b981', '#f59e0b',
      '#ec4899', '#3b82f6', '#14b8a6', '#64748b'
    ];
  }
  domainChartInstance.update();
}

/* --------------------------------------------------------------------------
   Interactive Calendar Engine with Work / Exam Badges
   -------------------------------------------------------------------------- */
function shiftMonth(delta) {
  state.calendarDate.setMonth(state.calendarDate.getMonth() + delta);
  renderCalendar();
}

function goTodayMonth() {
  state.calendarDate = new Date();
  state.selectedDateStr = getTodayISO();
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const cal = state.calendarDate;
  const year = cal.getFullYear();
  const month = cal.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  document.getElementById('calendarTitle').innerText = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const todayStr = getTodayISO();

  // Empty leading days
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-cell empty';
    grid.appendChild(empty);
  }

  // Month days
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (dateStr === todayStr) cell.classList.add('today');
    if (dateStr === state.selectedDateStr) cell.classList.add('selected');

    cell.innerHTML = `<span>${day}</span>`;

    const indicatorsWrap = document.createElement('div');
    indicatorsWrap.className = 'cal-cell-indicators';

    // 1. Check for scheduled Exams / Works
    const dayEvents = state.events.filter(e => e.date === dateStr);
    if (dayEvents.length > 0) {
      const badgeRow = document.createElement('div');
      badgeRow.className = 'cal-event-badge-row';
      
      const hasExam = dayEvents.some(e => e.category === 'exam');
      const hasDeadline = dayEvents.some(e => e.category === 'deadline');
      const hasWork = dayEvents.some(e => e.category === 'work');

      if (hasExam) badgeRow.innerHTML += `<span title="Exam on this day">📝</span>`;
      else if (hasDeadline) badgeRow.innerHTML += `<span title="Deadline due">⏰</span>`;
      else if (hasWork) badgeRow.innerHTML += `<span title="Project work">💼</span>`;
      else badgeRow.innerHTML += `<span>📌</span>`;

      indicatorsWrap.appendChild(badgeRow);
    }

    // 2. Check for daily standup check-ins
    const dayLogs = state.logs.filter(l => l.date === dateStr);
    if (dayLogs.length > 0) {
      const dotRow = document.createElement('div');
      dotRow.className = 'cal-dot-row';

      const loggedMemberIds = [...new Set(dayLogs.map(l => l.memberId))];
      loggedMemberIds.forEach(mId => {
        const mem = state.members.find(m => m.id === mId);
        const dot = document.createElement('span');
        dot.className = 'cal-indicator-dot';
        dot.style.backgroundColor = mem ? mem.color : '#06b6d4';
        dotRow.appendChild(dot);
      });
      indicatorsWrap.appendChild(dotRow);
    }

    cell.appendChild(indicatorsWrap);
    cell.onclick = () => onSelectDate(dateStr);
    grid.appendChild(cell);
  }

  // Refresh day inspector
  renderDayInspector(state.selectedDateStr || todayStr);
}

function onSelectDate(dateStr) {
  state.selectedDateStr = dateStr;
  renderCalendar();
}

function renderDayInspector(dateStr) {
  const titleBox = document.getElementById('selectedDateTitle');
  const contentBox = document.getElementById('selectedDateContent');
  if (!titleBox || !contentBox) return;

  const dateObj = new Date(dateStr + 'T00:00:00');
  const displayDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  titleBox.innerText = `Agenda: ${displayDate}`;

  const dayEvents = state.events.filter(e => e.date === dateStr);
  const dayLogs = state.logs.filter(l => l.date === dateStr);

  let html = '';

  // 1. Scheduled Events / Works
  if (dayEvents.length > 0) {
    html += `<div class="inspector-section-label">Scheduled Exams & Works</div>`;
    dayEvents.forEach(ev => {
      const assigned = ev.memberId === 'cohort' ? 'Cohort' : (state.members.find(m => m.id === ev.memberId)?.name.split(' ')[0] || 'Member');
      let catIcon = '📌';
      if (ev.category === 'exam') catIcon = '📝 Exam';
      else if (ev.category === 'deadline') catIcon = '⏰ Deadline';
      else if (ev.category === 'work') catIcon = '💼 Work';

      html += `
        <div class="inspector-event-item ${ev.category} ${ev.completed ? 'done' : ''}">
          <div class="iev-info">
            <span class="iev-title">${escapeHtml(ev.title)}</span>
            <span class="iev-sub">${catIcon} &bull; Lead: ${assigned} &bull; ${ev.priority.toUpperCase()}</span>
          </div>
          <div class="iev-actions">
            <button class="btn-icon-tiny" onclick="toggleEventComplete('${ev.id}')" title="Toggle Done">${ev.completed ? '↩' : '✓'}</button>
            <button class="btn-icon-tiny" onclick="deleteEvent('${ev.id}')" title="Delete">✕</button>
          </div>
        </div>
      `;
    });
  }

  // 2. Standup Logs on this day
  if (dayLogs.length > 0) {
    html += `<div class="inspector-section-label">Standups Logged</div>`;
    dayLogs.forEach(l => {
      const mem = state.members.find(m => m.id === l.memberId);
      html += `
        <div class="inspector-standup-summary">
          <strong>${mem ? mem.name.split(' ')[0] : 'Teammate'}</strong> (${l.hours}h &bull; ${l.domain}): 
          <span>${escapeHtml(l.done.substring(0, 80))}${l.done.length > 80 ? '...' : ''}</span>
        </div>
      `;
    });
  }

  if (dayEvents.length === 0 && dayLogs.length === 0) {
    html = `<p style="font-size:0.75rem; color:#64748b; margin-top:0.3rem;">No exams, works, or standups logged for this date. Click "+ Add Work / Exam" above to schedule a priority.</p>`;
  }

  contentBox.innerHTML = html;
}

/* --------------------------------------------------------------------------
   Calendar Event / Exam / Work Modal Operations
   -------------------------------------------------------------------------- */
function openEventModal() {
  const dateInput = document.getElementById('eventDateInput');
  if (dateInput) dateInput.value = state.selectedDateStr || getTodayISO();
  document.getElementById('eventModal').classList.add('open');
}

function closeEventModal() {
  document.getElementById('eventModal').classList.remove('open');
}

function submitNewEvent(event) {
  event.preventDefault();
  const title = document.getElementById('eventTitleInput').value.trim();
  const date = document.getElementById('eventDateInput').value;
  const priority = document.getElementById('eventPrioritySelect').value;
  const category = document.querySelector('input[name="eventCatRadio"]:checked')?.value || 'exam';
  const memberId = document.getElementById('eventMemberSelect').value;

  if (!title || !date) return;

  const newEv = {
    id: 'ev_' + Date.now(),
    title: title,
    date: date,
    priority: priority,
    category: category,
    memberId: memberId,
    completed: false
  };

  state.events.push(newEv);
  state.selectedDateStr = date;
  saveToStorage();
  closeEventModal();
  document.getElementById('eventForm').reset();
  renderAll();
}

function toggleEventComplete(id) {
  const ev = state.events.find(e => e.id === id);
  if (ev) {
    ev.completed = !ev.completed;
    saveToStorage();
    renderAll();
  }
}

function deleteEvent(id) {
  state.events = state.events.filter(e => e.id !== id);
  saveToStorage();
  renderAll();
}

/* --------------------------------------------------------------------------
   Target Execution Queue
   -------------------------------------------------------------------------- */
function renderTargetQueue() {
  const container = document.getElementById('targetQueueList');
  const countBadge = document.getElementById('targetCount');
  if (!container) return;
  container.innerHTML = '';

  const allTargets = [];
  state.logs.forEach(l => {
    if (l.target && l.target.trim() !== '') {
      allTargets.push({
        id: 'tgt_' + l.id,
        logId: l.id,
        text: l.target,
        memberId: l.memberId,
        date: l.date,
        done: !!l.targetCompleted
      });
    }
  });

  if (countBadge) countBadge.innerText = `${allTargets.filter(t => !t.done).length} Pending`;

  if (allTargets.length === 0) {
    container.innerHTML = `<p style="font-size:0.75rem; color:#64748b;">No active targets pledged yet. Log today's check-in to set your next target.</p>`;
    return;
  }

  allTargets.slice(-8).reverse().forEach(t => {
    const member = state.members.find(m => m.id === t.memberId);
    const item = document.createElement('div');
    item.className = `target-item ${t.done ? 'done' : ''}`;
    item.innerHTML = `
      <div class="target-check-wrap">
        <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTargetCompletion('${t.logId}', this.checked)" />
        <span class="target-title">${escapeHtml(t.text)}</span>
      </div>
      <span class="target-owner-tag" style="border-left: 2px solid ${member ? member.color : '#64748b'};">
        ${member ? member.name.split(' ')[0] : 'Member'}
      </span>
    `;
    container.appendChild(item);
  });
}

function toggleTargetCompletion(logId, isDone) {
  const log = state.logs.find(l => l.id === logId);
  if (log) {
    log.targetCompleted = isDone;
    saveToStorage();
    renderTargetQueue();
  }
}

/* --------------------------------------------------------------------------
   Daily Standup Feed & Peer Coaching
   -------------------------------------------------------------------------- */
function setCohortFilter(filter) {
  state.cohortFilter = filter;
  renderMemberSwitcher();
  renderFeed();
}

function renderFeed() {
  const container = document.getElementById('feedLogsContainer');
  if (!container) return;
  container.innerHTML = '';

  let list = [...state.logs].reverse();
  if (state.cohortFilter !== 'all') {
    list = list.filter(l => l.memberId === state.cohortFilter);
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-feed">
        <div class="empty-icon">🛡️</div>
        <h4>No Standup Check-Ins Yet</h4>
        <p>Start recording your daily milestones, technical progress, and strategic targets to ignite peer accountability.</p>
        <button class="btn btn-primary" onclick="openStandupModal()">Log First Standup</button>
      </div>
    `;
    return;
  }

  list.forEach(log => {
    const member = state.members.find(m => m.id === log.memberId) || DEFAULT_MEMBERS[0];
    const logDateObj = new Date(log.date + 'T00:00:00');
    const displayDate = logDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const card = document.createElement('div');
    card.className = 'standup-entry';

    card.innerHTML = `
      <div class="entry-header">
        <div class="author-badge-group">
          <div class="author-avatar" style="background:${member.color};">
            ${member.avatar}
          </div>
          <div class="author-meta">
            <h4>${member.name}</h4>
            <span>${member.dept} &bull; ${displayDate}</span>
          </div>
        </div>
        <div class="entry-pills">
          <span class="hours-tag">${log.hours} hrs</span>
          <span class="domain-tag">${log.domain}</span>
        </div>
      </div>

      <div class="entry-content">
        <div class="content-block">
          <div class="block-title">⚡ Accomplished Today</div>
          <div class="block-text">${escapeHtml(log.done)}</div>
        </div>

        <div class="content-block">
          <div class="block-title">🎯 Tomorrow's Target</div>
          <div class="block-text">${escapeHtml(log.target)}</div>
        </div>

        ${log.blocker ? `
          <div class="blocker-alert-box ${log.blockerResolved ? 'resolved' : ''}">
            <div>
              <strong>🚧 Blocker:</strong> ${escapeHtml(log.blocker)}
            </div>
            <button class="btn-resolve" onclick="toggleBlockerResolved('${log.id}')">
              ${log.blockerResolved ? '✓ Resolved' : 'Mark Resolved'}
            </button>
          </div>
        ` : ''}

        ${log.improvement ? `
          <div class="improvement-alert-box">
            <strong>🌱 1% Improvement Habit:</strong> ${escapeHtml(log.improvement)}
          </div>
        ` : ''}
      </div>

      <div class="entry-actions">
        <div class="kudos-cluster">
          ${renderKudosBtn(log.id, '🚀', log.kudos?.['🚀'] || 0)}
          ${renderKudosBtn(log.id, '🔥', log.kudos?.['🔥'] || 0)}
          ${renderKudosBtn(log.id, '💡', log.kudos?.['💡'] || 0)}
          ${renderKudosBtn(log.id, '👏', log.kudos?.['👏'] || 0)}
        </div>
        <span style="font-size:0.75rem; color:#94a3b8;">
          Energy: ${'⚡'.repeat(log.energy || 4)}
        </span>
      </div>

      <div class="comments-panel">
        <div class="comments-box">
          ${(log.comments || []).map(c => `
            <div class="comment-bubble">
              <span class="comment-author">${escapeHtml(c.author)}:</span>
              <span>${escapeHtml(c.text)}</span>
            </div>
          `).join('')}
        </div>
        <form class="comment-input-row" onsubmit="postPeerComment(event, '${log.id}')">
          <input type="text" placeholder="Offer advice, feedback or solution..." required />
          <button type="submit" class="btn-micro">Reply</button>
        </form>
      </div>
    `;

    container.appendChild(card);
  });
}

function renderKudosBtn(logId, emoji, count) {
  return `
    <button class="btn-kudos" onclick="triggerKudo('${logId}', '${emoji}')">
      ${emoji} ${count > 0 ? count : ''}
    </button>
  `;
}

function triggerKudo(logId, emoji) {
  const log = state.logs.find(l => l.id === logId);
  if (!log) return;
  if (!log.kudos) log.kudos = {};
  log.kudos[emoji] = (log.kudos[emoji] || 0) + 1;
  saveToStorage();
  renderFeed();
}

function toggleBlockerResolved(logId) {
  const log = state.logs.find(l => l.id === logId);
  if (log) {
    log.blockerResolved = !log.blockerResolved;
    saveToStorage();
    renderFeed();
    renderMetrics();
  }
}

function postPeerComment(event, logId) {
  event.preventDefault();
  const input = event.target.querySelector('input');
  const val = input.value.trim();
  if (!val) return;

  const log = state.logs.find(l => l.id === logId);
  if (!log) return;
  if (!log.comments) log.comments = [];

  const currentMember = state.members.find(m => m.id === state.activeMemberId);
  log.comments.push({
    author: currentMember ? currentMember.name.split(' ')[0] : 'Teammate',
    text: val,
    time: new Date().toISOString()
  });

  input.value = '';
  saveToStorage();
  renderFeed();
}

/* --------------------------------------------------------------------------
   Standup Form Submission
   -------------------------------------------------------------------------- */
function updateHoursSlider(val) {
  document.getElementById('hoursValDisplay').innerText = `${parseFloat(val).toFixed(1)} hrs`;
}

function openStandupModal() {
  document.getElementById('logMemberSelect').value = state.activeMemberId;
  document.getElementById('standupModal').classList.add('open');
}

function closeStandupModal() {
  document.getElementById('standupModal').classList.remove('open');
}

function submitStandupForm(event) {
  event.preventDefault();

  const newLog = {
    id: 'log_' + Date.now(),
    memberId: document.getElementById('logMemberSelect').value,
    date: document.getElementById('logDateInput').value,
    hours: parseFloat(document.getElementById('logHoursSlider').value) || 1,
    domain: document.getElementById('logDomainSelect').value,
    done: document.getElementById('logDoneText').value.trim(),
    target: document.getElementById('logTargetText').value.trim(),
    energy: parseInt(document.querySelector('input[name="energyRadio"]:checked')?.value || 4),
    blocker: document.getElementById('logBlockerInput').value.trim(),
    blockerResolved: false,
    improvement: document.getElementById('logImprovementInput').value.trim(),
    targetCompleted: false,
    kudos: {},
    comments: []
  };

  state.logs.push(newLog);
  state.selectedDateStr = newLog.date;
  saveToStorage();
  closeStandupModal();
  document.getElementById('standupForm').reset();
  document.getElementById('logDateInput').value = getTodayISO();
  updateHoursSlider(3.5);

  renderAll();
}

/* --------------------------------------------------------------------------
   Milestones
   -------------------------------------------------------------------------- */
function openMilestoneModal() {
  document.getElementById('milestoneModal').classList.add('open');
}

function closeMilestoneModal() {
  document.getElementById('milestoneModal').classList.remove('open');
}

function submitNewMilestone(event) {
  event.preventDefault();
  const title = document.getElementById('msTitleInput').value.trim();
  const owner = document.getElementById('msOwnerSelect').value;
  const date = document.getElementById('msDateInput').value;

  if (!title) return;

  state.milestones.push({
    id: 'ms_' + Date.now(),
    title: title,
    ownerId: owner,
    targetDate: date,
    progress: 0
  });

  saveToStorage();
  closeMilestoneModal();
  document.getElementById('milestoneForm').reset();
  renderMilestones();
}

function renderMilestones() {
  const container = document.getElementById('milestonesList');
  if (!container) return;
  container.innerHTML = '';

  if (state.milestones.length === 0) {
    container.innerHTML = `<p style="font-size:0.75rem; color:#64748b;">No active milestones. Click "+ Milestone" to declare a key target.</p>`;
    return;
  }

  state.milestones.forEach(ms => {
    let ownerLabel = 'Joint Cohort';
    if (ms.ownerId !== 'cohort') {
      const mem = state.members.find(m => m.id === ms.ownerId);
      if (mem) ownerLabel = mem.name.split(' ')[0];
    }

    const box = document.createElement('div');
    box.className = 'milestone-box';
    box.innerHTML = `
      <div class="ms-header">
        <span>${escapeHtml(ms.title)}</span>
        <span style="color:#06b6d4;">${ms.progress}%</span>
      </div>
      <div class="ms-bar">
        <div class="ms-fill" style="width:${ms.progress}%;"></div>
      </div>
      <div class="ms-footer">
        <span>Lead: ${ownerLabel} &bull; Due: ${ms.targetDate || 'TBD'}</span>
        <button class="btn-micro" onclick="promptMilestoneEdit('${ms.id}', ${ms.progress})">Update %</button>
      </div>
    `;
    container.appendChild(box);
  });
}

function promptMilestoneEdit(msId, curr) {
  const val = prompt('Enter new completion progress (0 - 100):', curr);
  if (val !== null) {
    const num = Math.min(100, Math.max(0, parseInt(val) || 0));
    const target = state.milestones.find(m => m.id === msId);
    if (target) {
      target.progress = num;
      saveToStorage();
      renderMilestones();
    }
  }
}

/* --------------------------------------------------------------------------
   PDF Report Generator (Including Calendar Events & Exams)
   -------------------------------------------------------------------------- */
function generatePdfReport() {
  const printBox = document.getElementById('printReportContainer');
  const totalHours = state.logs.reduce((sum, l) => sum + (parseFloat(l.hours) || 0), 0);
  const totalCheckins = state.logs.length;
  const todayStr = new Date().toLocaleDateString('en-US', { dateStyle: 'full' });

  // 1. Teammates performance table
  let memberRowsHtml = '';
  state.members.forEach(m => {
    const mLogs = state.logs.filter(l => l.memberId === m.id);
    const mHours = mLogs.reduce((s, l) => s + (parseFloat(l.hours) || 0), 0);
    const mStreak = computeStreak(mLogs);
    memberRowsHtml += `
      <tr>
        <td><strong>${escapeHtml(m.name)}</strong></td>
        <td>${escapeHtml(m.dept)}</td>
        <td>${mLogs.length}</td>
        <td>${mHours.toFixed(1)} hrs</td>
        <td>${mStreak} days</td>
      </tr>
    `;
  });

  // 2. Scheduled Works & Exams
  let eventsHtml = '';
  if (state.events.length > 0) {
    eventsHtml = `
      <table class="report-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Title / Scope</th>
            <th>Priority</th>
            <th>Assigned</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${state.events.map(ev => {
            const assigned = ev.memberId === 'cohort' ? 'Cohort' : (state.members.find(m => m.id === ev.memberId)?.name || 'Member');
            return `
              <tr>
                <td><strong>${ev.date}</strong></td>
                <td>${ev.category.toUpperCase()}</td>
                <td>${escapeHtml(ev.title)}</td>
                <td>${ev.priority.toUpperCase()}</td>
                <td>${assigned}</td>
                <td>${ev.completed ? 'COMPLETED' : 'PENDING'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } else {
    eventsHtml = '<p>No scheduled exams or deadlines registered in the calendar.</p>';
  }

  // 3. Recent 10 standup entries
  let recentLogsHtml = '';
  state.logs.slice(-10).reverse().forEach(l => {
    const mem = state.members.find(m => m.id === l.memberId);
    recentLogsHtml += `
      <div class="report-log-card">
        <h4>${mem ? mem.name : 'Member'} — <span style="font-weight:normal; font-size:8.5pt;">${l.date} (${l.hours} hrs &bull; ${l.domain})</span></h4>
        <p><strong>Accomplished:</strong> ${escapeHtml(l.done)}</p>
        <p><strong>Next Target:</strong> ${escapeHtml(l.target)} ${l.targetCompleted ? '(Completed)' : ''}</p>
        ${l.blocker ? `<p><strong>Blocker:</strong> ${escapeHtml(l.blocker)} [${l.blockerResolved ? 'Resolved' : 'Pending'}]</p>` : ''}
      </div>
    `;
  });

  printBox.innerHTML = `
    <div class="report-header">
      <div class="report-title">
        <h1>CHANAKYA &bull; COHORT PERFORMANCE AUDIT</h1>
        <p>Executive Execution & Accountability Briefing</p>
      </div>
      <div class="report-meta">
        <p><strong>Generated:</strong> ${todayStr}</p>
        <p><strong>Total Check-Ins:</strong> ${totalCheckins} sessions</p>
        <p><strong>Aggregate Study Time:</strong> ${totalHours.toFixed(1)} hours</p>
      </div>
    </div>

    <div class="report-section">
      <h2>Teammate Velocity & Consistency</h2>
      <table class="report-table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Discipline / Department</th>
            <th>Total Sessions</th>
            <th>Cumulative Hours</th>
            <th>Active Streak</th>
          </tr>
        </thead>
        <tbody>
          ${memberRowsHtml}
        </tbody>
      </table>
    </div>

    <div class="report-section">
      <h2>Scheduled Exams, Project Works & Deadlines</h2>
      ${eventsHtml}
    </div>

    <div class="report-section">
      <h2>Curriculum & Deliverable Milestones</h2>
      <table class="report-table">
        <thead>
          <tr>
            <th>Deliverable / Milestone</th>
            <th>Lead</th>
            <th>Target Deadline</th>
            <th>Completion Status</th>
          </tr>
        </thead>
        <tbody>
          ${state.milestones.map(ms => `
            <tr>
              <td>${escapeHtml(ms.title)}</td>
              <td>${ms.ownerId === 'cohort' ? 'Joint Cohort' : (state.members.find(m => m.id === ms.ownerId)?.name || 'Member')}</td>
              <td>${ms.targetDate || 'TBD'}</td>
              <td><strong>${ms.progress}%</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="report-section">
      <h2>Recent Standups & Daily Check-Ins</h2>
      ${recentLogsHtml || '<p>No check-ins logged yet.</p>'}
    </div>
  `;

  // Trigger Native Vector PDF Print
  window.print();
}

/* --------------------------------------------------------------------------
   HTML Escaping Utility
   -------------------------------------------------------------------------- */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
