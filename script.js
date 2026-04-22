// Replace this with your deployed Google Apps Script Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwxE2VB2D08UkxsHH0nAZK_w-bThxyVqP9_Je63xpBLRPBTUcJBfEZnWuv-WBkMDfBsYw/exec';

const dateInput       = document.getElementById('date');
const durationSlider  = document.getElementById('duration');
const durationValue   = document.getElementById('durationValue');
const activityRadios  = document.querySelectorAll('input[name="activity"]');
const customInputDiv  = document.getElementById('customInput');
const customActivity  = document.getElementById('customActivity');
const cancelBtn       = document.getElementById('cancelBtn');
const saveBtn         = document.getElementById('saveBtn');
const form            = document.getElementById('dailyForm');
const toast           = document.getElementById('toast');

// ─── Init ──────────────────────────────────────────────

dateInput.value = todayString();
setDefaultTimeslot();

updateSliderUI();

// ─── Duration slider ───────────────────────────────────

durationSlider.addEventListener('input', updateSliderUI);

function updateSliderUI() {
  const val = durationSlider.value;
  durationValue.textContent = val;

  const pct = ((val - durationSlider.min) / (durationSlider.max - durationSlider.min)) * 100;
  durationSlider.style.background =
    `linear-gradient(to right, var(--accent) ${pct}%, var(--border) ${pct}%)`;
}

// ─── Activity chips ────────────────────────────────────

activityRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.value === '기타' && radio.checked) {
      customInputDiv.style.display = 'block';
      customActivity.focus();
    } else {
      customInputDiv.style.display = 'none';
      customActivity.value = '';
    }
  });
});

// ─── Cancel ────────────────────────────────────────────

cancelBtn.addEventListener('click', resetForm);

function resetForm() {
  form.reset();
  dateInput.value = todayString();
  customInputDiv.style.display = 'none';
  updateSliderUI();
  setDefaultTimeslot();
}

// ─── Submit ────────────────────────────────────────────

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const checked = document.querySelector('input[name="activity"]:checked');
  if (!checked) {
    showToast('수행 목표를 선택해주세요', 'error');
    return;
  }

  const activityValue = checked.value === '기타'
    ? customActivity.value.trim()
    : checked.value;

  if (!activityValue) {
    showToast('기타 항목을 입력해주세요', 'error');
    customActivity.focus();
    return;
  }

  const checkedTimeslot = document.querySelector('input[name="timeslot"]:checked');
  if (!checkedTimeslot) {
    showToast('시간대를 선택해주세요', 'error');
    return;
  }

  const payload = {
    date:     dateInput.value,
    timeslot: checkedTimeslot.value,
    activity: activityValue,
    duration: durationSlider.value,
    memo:     document.getElementById('memo').value.trim(),
  };

  setLoading(true);

  try {
    const res  = await fetch(SCRIPT_URL, {
      method:   'POST',
      headers:  { 'Content-Type': 'text/plain' },
      body:     JSON.stringify(payload),
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }

    if (res.ok && json?.result === 'success') {
      showToast('저장되었습니다', 'success');
      resetForm();
    } else {
      const reason = json?.message || `오류 코드: ${res.status}`;
      showToast(`저장 실패 — ${reason}`, 'error');
    }
  } catch (err) {
    showToast(`저장 실패 — ${err.message}`, 'error');
  } finally {
    setLoading(false);
  }
});

// ─── Helpers ───────────────────────────────────────────

function setLoading(on) {
  saveBtn.disabled = on;
  saveBtn.classList.toggle('loading', on);
  saveBtn.querySelector('.save-text').textContent = on ? '저장 중' : '저장';
}

let toastTimer;
function showToast(message, type = 'success') {
  clearTimeout(toastTimer);
  toast.className = `toast ${type}`;
  toast.textContent = message;

  // force reflow so re-trigger works
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');

  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function todayString() {
  return new Date().toLocaleDateString('sv-SE'); // 'YYYY-MM-DD'
}

function setDefaultTimeslot() {
  const hour = new Date().getHours();
  let value = '저녁';
  if      (hour >= 5  && hour < 12) value = '오전';
  else if (hour >= 12 && hour < 18) value = '오후';

  const radio = document.querySelector(`input[name="timeslot"][value="${value}"]`);
  if (radio) radio.checked = true;
}
