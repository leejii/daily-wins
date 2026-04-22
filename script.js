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

  const payload = {
    date:     dateInput.value,
    activity: activityValue,
    duration: durationSlider.value,
    memo:     document.getElementById('memo').value.trim(),
  };

  setLoading(true);

  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode:   'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body:   JSON.stringify(payload),
    });

    showToast('저장되었습니다', 'success');
    resetForm();
  } catch {
    showToast('저장에 실패했습니다. 다시 시도해주세요', 'error');
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
