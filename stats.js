// Keep in sync with script.js SCRIPT_URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwxE2VB2D08UkxsHH0nAZK_w-bThxyVqP9_Je63xpBLRPBTUcJBfEZnWuv-WBkMDfBsYw/exec';

let allData      = [];
let currentMonth = new Date();
let activityChart = null;
let weeklyChart   = null;

currentMonth.setDate(1);
currentMonth.setHours(0, 0, 0, 0);

// ─── Init ──────────────────────────────────────────────

async function init() {
  try {
    const res  = await fetch(SCRIPT_URL);
    const text = await res.text();
    const json = JSON.parse(text);

    if (json.result !== 'success') throw new Error(json.message);

    allData = json.data;

    document.getElementById('loading').style.display = 'none';

    if (allData.length === 0) {
      document.getElementById('empty-state').style.display = 'block';
      return;
    }

    document.getElementById('stats-content').style.display = 'block';
    renderSummary();
    renderCalendar();
    renderActivityChart();

  } catch (err) {
    document.getElementById('loading').innerHTML =
      `<p style="color:#EF4444">데이터를 불러오지 못했습니다.<br><small>${err.message}</small></p>`;
  }
}

// ─── Summary ───────────────────────────────────────────

function renderSummary() {
  document.getElementById('total-count').textContent   = allData.length;
  document.getElementById('streak-count').textContent  = calcStreak() + '일';
  document.getElementById('top-activity').textContent  = calcTopActivity();
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

function calcTopActivity() {
  const counts = {};
  allData.forEach(d => {
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
  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  document.getElementById('cal-title').textContent = `${year}년 ${month + 1}월`;

  const prefix      = `${year}-${String(month + 1).padStart(2, '0')}`;
  const dayMap      = {};
  allData.forEach(d => {
    if (d.date?.startsWith(prefix)) {
      dayMap[d.date] = (dayMap[d.date] || 0) + 1;
    }
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
    </li>
  `).join('');

  document.getElementById('cal-detail').style.display = 'block';
}

document.getElementById('cal-detail-close').addEventListener('click', () => {
  document.getElementById('cal-detail').style.display = 'none';
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
  const counts = {};
  allData.forEach(d => {
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
          grid: { color: '#F3F4F6' },
        },
        y: {
          ticks: { color: '#374151' },
          grid: { display: false },
        },
      },
    },
  });
}

function renderWeeklyChart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() - (7 - i) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const total = allData
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
          grid: { color: '#F3F4F6' },
        },
        x: {
          ticks: { color: '#9CA3AF' },
          grid: { display: false },
        },
      },
    },
  });
}

// ─── Start ─────────────────────────────────────────────
init();
