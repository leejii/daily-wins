// Keep in sync with script.js SCRIPT_URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwxE2VB2D08UkxsHH0nAZK_w-bThxyVqP9_Je63xpBLRPBTUcJBfEZnWuv-WBkMDfBsYw/exec';

let allData       = [];
let currentMonth  = new Date();
let activityChart = null;
let weeklyChart   = null;

let currentPeriod   = 'all';  // 'all' | 'month' | '30d'
let currentActivity = 'all';

let editingRowIndex = null;
let editingDateStr  = null;

const CACHE_KEY = 'daily-wins-cache';
const CACHE_TTL = 5 * 60 * 1000; // 5분

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* 저장 공간 부족 시 무시 */ }
}

function clearCache() {
  localStorage.removeItem(CACHE_KEY);
}

currentMonth.setDate(1);
currentMonth.setHours(0, 0, 0, 0);

// ─── Filters ───────────────────────────────────────────

function getFilteredData() {
  let data = allData;

  if (currentPeriod === 'month') {
    const today  = new Date();
    const prefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    data = data.filter(d => d.date.startsWith(prefix));
  } else if (currentPeriod === '30d') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toLocaleDateString('sv-SE');
    data = data.filter(d => d.date >= cutoffStr);
  }

  if (currentActivity !== 'all') {
    data = data.filter(d => d.activity === currentActivity);
  }

  return data;
}

function renderActivityFilterChips() {
  const activities = [...new Set(allData.map(d => d.activity).filter(Boolean))].sort();
  const container  = document.getElementById('activity-filter-chips');

  container.innerHTML =
    `<button class="filter-chip${currentActivity === 'all' ? ' active' : ''}" data-activity="all">전체</button>` +
    activities.map(a =>
      `<button class="filter-chip${currentActivity === a ? ' active' : ''}" data-activity="${a.replace(/"/g, '&quot;')}">${a}</button>`
    ).join('');

  container.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      currentActivity = btn.dataset.activity;
      renderActivityFilterChips();
      refreshAll();
    });
  });
}

function setupPeriodFilter() {
  document.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = btn.dataset.period;
      refreshAll();
    });
  });
}

function refreshAll() {
  renderSummary();
  renderCalendar();
  if (activityChart) { activityChart.destroy(); activityChart = null; }
  if (weeklyChart)   { weeklyChart.destroy();   weeklyChart   = null; }
  renderActivityChart();
  if (document.getElementById('tab-weekly').style.display !== 'none') {
    renderWeeklyChart();
  }
}

// ─── Init ──────────────────────────────────────────────

function showStats(data) {
  document.getElementById('loading').style.display = 'none';
  if (data.length === 0) {
    document.getElementById('empty-state').style.display = 'block';
    return;
  }
  document.getElementById('stats-content').style.display = 'block';
  renderActivityFilterChips();
  setupPeriodFilter();
  renderSummary();
  renderCalendar();
  renderActivityChart();
}

async function init() {
  const cached = loadCache();
  if (cached) {
    allData = cached;
    showStats(allData);
    return;
  }

  try {
    const res  = await fetch(SCRIPT_URL);
    const json = JSON.parse(await res.text());

    if (json.result !== 'success') throw new Error(json.message);

    allData = json.data;
    saveCache(allData);
    showStats(allData);

  } catch (err) {
    document.getElementById('loading').innerHTML =
      `<p style="color:#EF4444">데이터를 불러오지 못했습니다.<br><small>${err.message}</small></p>`;
  }
}

// ─── Summary ───────────────────────────────────────────

function renderSummary() {
  const data = getFilteredData();
  document.getElementById('total-count').textContent  = data.length;
  document.getElementById('streak-count').textContent = calcStreak() + '일';
  document.getElementById('top-activity').textContent = calcTopActivity(data);
}

function calcStreak() {
  const dates  = new Set(allData.map(d => d.date));
  const cursor = new Date();
  let streak   = 0;
  while (true) {
    const str = cursor.toLocaleDateString('sv-SE');
    if (!dates.has(str)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function calcTopActivity(data) {
  const counts = {};
  data.forEach(d => {
    if (d.activity) counts[d.activity] = (counts[d.activity] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || '-';
}

// ─── Calendar ──────────────────────────────────────────

document.getElementById('cal-prev').addEventListener('click', () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  renderCalendar();
});

document.getElementById('cal-next').addEventListener('click', () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  renderCalendar();
});

function renderCalendar() {
  const data  = getFilteredData();
  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  document.getElementById('cal-title').textContent = `${year}년 ${month + 1}월`;

  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const dayMap = {};
  data.forEach(d => {
    if (d.date?.startsWith(prefix)) dayMap[d.date] = (dayMap[d.date] || 0) + 1;
  });

  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr    = new Date().toLocaleDateString('sv-SE');

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  ['일', '월', '화', '수', '목', '금', '토'].forEach(h => {
    const el = document.createElement('div');
    el.className = 'cal-header';
    el.textContent = h;
    grid.appendChild(el);
  });

  for (let i = 0; i < firstDow; i++) {
    grid.appendChild(Object.assign(document.createElement('div'), { className: 'cal-cell' }));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${prefix}-${String(d).padStart(2, '0')}`;
    const count   = dayMap[dateStr] || 0;

    const el = document.createElement('div');
    el.className = 'cal-cell' +
      (count === 1 ? ' record-1' : '') +
      (count >= 2  ? ' record-2' : '') +
      (dateStr === todayStr ? ' today' : '');
    el.textContent = d;

    if (count > 0) {
      el.title = `${count}개 기록`;
      el.addEventListener('click', () => showDayDetail(dateStr));
    }

    grid.appendChild(el);
  }

  document.getElementById('cal-detail').style.display = 'none';
}

function showDayDetail(dateStr) {
  const records = allData.filter(d => d.date === dateStr);
  if (records.length === 0) return;

  const [y, m, d] = dateStr.split('-');
  document.getElementById('cal-detail-date').textContent =
    `${y}년 ${Number.parseInt(m)}월 ${Number.parseInt(d)}일`;

  document.getElementById('cal-detail-list').innerHTML = records.map(r => `
    <li class="cal-detail-item">
      <div class="cal-detail-row">
        <span class="detail-badge">${r.timeslot || ''}</span>
        <span class="detail-activity">${r.activity}</span>
        <span class="detail-duration">${r.duration}분</span>
      </div>
      ${r.memo ? `<p class="detail-memo">${r.memo}</p>` : ''}
      <div class="detail-actions">
        <button class="detail-edit-btn" data-row="${r.rowIndex}" data-date="${dateStr}">수정</button>
        <button class="detail-delete-btn" data-row="${r.rowIndex}" data-date="${dateStr}">삭제</button>
      </div>
    </li>
  `).join('');

  document.querySelectorAll('.detail-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const record = allData.find(d => d.rowIndex === Number(btn.dataset.row));
      openEditModal(record, btn.dataset.date);
    });
  });

  document.querySelectorAll('.detail-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('이 기록을 삭제할까요?')) {
        deleteRecord(Number(btn.dataset.row), btn.dataset.date);
      }
    });
  });

  document.getElementById('cal-detail').style.display = 'block';
}

document.getElementById('cal-detail-close').addEventListener('click', () => {
  document.getElementById('cal-detail').style.display = 'none';
});

// ─── Delete ────────────────────────────────────────────

async function deleteRecord(rowIndex, dateStr) {
  try {
    const res  = await fetch(SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body:    JSON.stringify({ action: 'delete', rowIndex }),
    });
    const json = JSON.parse(await res.text());
    if (json.result !== 'success') throw new Error(json.message);

    allData = allData.filter(d => d.rowIndex !== rowIndex);
    allData.forEach(d => { if (d.rowIndex > rowIndex) d.rowIndex--; });
    saveCache(allData);

    renderActivityFilterChips();
    refreshAll();

    const remaining = allData.filter(d => d.date === dateStr);
    if (remaining.length > 0) showDayDetail(dateStr);
    else document.getElementById('cal-detail').style.display = 'none';

    showToast('기록이 삭제되었습니다.');
  } catch (err) {
    showToast('삭제 실패: ' + err.message, 'error');
  }
}

// ─── Edit Modal ────────────────────────────────────────

function openEditModal(record, dateStr) {
  editingRowIndex = record.rowIndex;
  editingDateStr  = dateStr;

  document.querySelectorAll('.ts-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === record.timeslot);
  });
  document.getElementById('edit-activity').value = record.activity;
  document.getElementById('edit-duration').value  = record.duration;
  document.getElementById('edit-memo').value       = record.memo || '';

  document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  editingRowIndex = null;
  editingDateStr  = null;
}

document.getElementById('modal-close').addEventListener('click', closeEditModal);
document.getElementById('modal-cancel').addEventListener('click', closeEditModal);
document.getElementById('edit-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeEditModal();
});

document.querySelectorAll('.ts-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ts-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

document.getElementById('modal-save').addEventListener('click', async () => {
  const timeslot = document.querySelector('.ts-btn.active')?.dataset.value || '';
  const activity = document.getElementById('edit-activity').value.trim();
  const duration = Number(document.getElementById('edit-duration').value);
  const memo     = document.getElementById('edit-memo').value.trim();

  if (!activity)          { showToast('활동을 입력하세요.', 'error'); return; }
  if (!duration || duration < 5) { showToast('시간을 입력하세요.', 'error'); return; }

  const saveBtn = document.getElementById('modal-save');
  saveBtn.disabled = true;
  saveBtn.classList.add('loading');

  try {
    const record  = allData.find(d => d.rowIndex === editingRowIndex);
    const updates = { date: record.date, timeslot, activity, duration, memo };

    const res  = await fetch(SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body:    JSON.stringify({ action: 'update', rowIndex: editingRowIndex, ...updates }),
    });
    const json = JSON.parse(await res.text());
    if (json.result !== 'success') throw new Error(json.message);

    Object.assign(record, updates);
    saveCache(allData);

    const dateStr = editingDateStr;
    closeEditModal();

    renderActivityFilterChips();
    refreshAll();
    showDayDetail(dateStr);
    showToast('기록이 수정되었습니다.');
  } catch (err) {
    showToast('수정 실패: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.classList.remove('loading');
  }
});

// ─── Charts ────────────────────────────────────────────

document.querySelectorAll('.chart-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const tab = btn.dataset.tab;
    document.getElementById('tab-activity').style.display = tab === 'activity' ? 'block' : 'none';
    document.getElementById('tab-weekly').style.display   = tab === 'weekly'   ? 'block' : 'none';

    if (tab === 'weekly' && !weeklyChart) renderWeeklyChart();
  });
});

function renderActivityChart() {
  const data   = getFilteredData();
  const counts = {};
  data.forEach(d => {
    if (d.activity) counts[d.activity] = (counts[d.activity] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  activityChart = new Chart(document.getElementById('activity-chart'), {
    type: 'bar',
    data: {
      labels: sorted.map(([k]) => k),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: '#4F46E5',
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: '#9CA3AF' },
          grid:  { color: '#F3F4F6' },
        },
        y: {
          ticks: { color: '#374151' },
          grid:  { display: false },
        },
      },
    },
  });
}

function renderWeeklyChart() {
  const data  = getFilteredData();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() - (7 - i) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const total = data
      .filter(d => { const dt = new Date(d.date); return dt >= start && dt <= end; })
      .reduce((sum, d) => sum + (Number(d.duration) || 0), 0);

    return { label: `${start.getMonth() + 1}/${start.getDate()}`, total };
  });

  weeklyChart = new Chart(document.getElementById('weekly-chart'), {
    type: 'bar',
    data: {
      labels: weeks.map(w => w.label),
      datasets: [{
        data: weeks.map(w => w.total),
        backgroundColor: '#818CF8',
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.raw}분` } },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => `${v}분`, color: '#9CA3AF' },
          grid:  { color: '#F3F4F6' },
        },
        x: {
          ticks: { color: '#9CA3AF' },
          grid:  { display: false },
        },
      },
    },
  });
}

// ─── Toast ─────────────────────────────────────────────

function showToast(msg, type = 'success') {
  const toast = document.querySelector('.toast');
  toast.textContent = msg;
  toast.className   = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ─── Start ─────────────────────────────────────────────
init();
