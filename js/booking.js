/* ════════════════════════════════════════════════════════════
   REMNANT — Booking page JS  (uses /api/slots + /api/bookings)
════════════════════════════════════════════════════════════ */

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

let curYear, curMonth, selectedDate = null, selectedSlot = null;
const calTitle = document.getElementById('calTitle');
const calGrid = document.getElementById('calGrid');
const slotsContainer = document.getElementById('slotsContainer');
const slotsGrid = document.getElementById('slotsGrid');
const dateInput = document.getElementById('bookingDate');
const slotInput = document.getElementById('bookingSlot');
const toStep2Btn = document.getElementById('toStep2');

function pad(n) { return String(n).padStart(2, '0'); }

function renderCalendar(year, month) {
  curYear = year; curMonth = month;
  calTitle.textContent = `${MONTHS[month]} ${year}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const first = new Date(year, month, 1);
  let startDay = first.getDay();
  if (startDay === 0) startDay = 7;
  startDay--;

  let html = DOW.map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < startDay; i++) html += '<div class="cal-day empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dt  = new Date(year, month, d);
    const iso = `${year}-${pad(month + 1)}-${pad(d)}`;
    const isPast  = dt < today;
    const isToday = dt.getTime() === today.getTime();
    const isSel   = iso === selectedDate;
    const cls = ['cal-day'];
    if (isPast)  cls.push('disabled');
    if (isToday) cls.push('today');
    if (isSel)   cls.push('selected');
    html += `<div class="${cls.join(' ')}" data-date="${iso}">${d}</div>`;
  }
  calGrid.innerHTML = html;

  calGrid.querySelectorAll('.cal-day:not(.empty):not(.disabled)').forEach(el => {
    el.addEventListener('click', () => selectDate(el.dataset.date));
  });
}

async function selectDate(iso) {
  selectedDate = iso;
  selectedSlot = null;
  dateInput.value = iso;
  slotInput.value = '';
  toStep2Btn.disabled = true;

  calGrid.querySelectorAll('.cal-day').forEach(el =>
    el.classList.toggle('selected', el.dataset.date === iso)
  );
  slotsContainer.style.display = 'block';
  slotsGrid.innerHTML = '<span class="slots-empty">Загрузка...</span>';

  try {
    const res = await fetch(`/api/slots?date=${iso}`);
    const data = await res.json();

    if (data.blocked || !data.slots?.length) {
      slotsGrid.innerHTML = '<span class="slots-empty">Нет доступных слотов на эту дату</span>';
      return;
    }

    slotsGrid.innerHTML = '';
    data.slots.forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = s.available ? 'slot-btn' : 'slot-btn taken';
      btn.dataset.slot = s.start;
      btn.textContent = `${s.start} – ${s.end}`;
      if (s.available) {
        btn.addEventListener('click', () => {
          slotsGrid.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('chosen'));
          btn.classList.add('chosen');
          selectedSlot = s.start;
          slotInput.value = s.start;
          toStep2Btn.disabled = false;
        });
      }
      slotsGrid.appendChild(btn);
    });
  } catch (err) {
    console.error(err);
    slotsGrid.innerHTML = '<span class="slots-empty">Ошибка загрузки. Попробуйте позже.</span>';
  }
}

const now = new Date();
renderCalendar(now.getFullYear(), now.getMonth());
document.getElementById('calPrev').addEventListener('click', () => {
  let m = curMonth - 1, y = curYear;
  if (m < 0) { m = 11; y--; }
  renderCalendar(y, m);
});
document.getElementById('calNext').addEventListener('click', () => {
  let m = curMonth + 1, y = curYear;
  if (m > 11) { m = 0; y++; }
  renderCalendar(y, m);
});

function goToStep(n) {
  document.querySelectorAll('.form-step').forEach(el =>
    el.classList.toggle('active', Number(el.dataset.step) === n)
  );
  document.querySelectorAll('.step-indicator .step').forEach(el => {
    const s = Number(el.dataset.step);
    el.classList.toggle('active', s === n);
    el.classList.toggle('done', s < n);
  });
}

toStep2Btn.addEventListener('click', () => goToStep(2));
document.getElementById('backStep1').addEventListener('click', () => goToStep(1));
document.getElementById('toStep3').addEventListener('click', () => goToStep(3));
document.getElementById('backStep2').addEventListener('click', () => goToStep(2));

const form = document.getElementById('bookingForm');
const successMessage = document.getElementById('successMessage');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());

  if (!payload.name || !payload.phone) {
    alert('Заполните имя и телефон');
    return;
  }
  if (!payload.date || !payload.time_slot) {
    alert('Выберите дату и время');
    goToStep(1);
    return;
  }

  const submitBtn = form.querySelector('.form-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Отправка...';

  try {
    const bookingData = {
      date:        payload.date,
      time_slot:   payload.time_slot,
      style:       payload.style       || '',
      size:        payload.size        || '',
      description: payload.description || payload.notes || '',
      name:        payload.name,
      phone:       payload.phone,
      email:       payload.email       || '',
      location:    payload.location    || '',
    };

    const headers = { 'Content-Type': 'application/json' };
    const clientToken = localStorage.getItem('remnant_client_token');
    if (clientToken) headers['Authorization'] = `Bearer ${clientToken}`;

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers,
      body: JSON.stringify(bookingData),
    });
    const result = await res.json();

    if (!res.ok) {
      alert(result.error || 'Ошибка при отправке');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Записаться';
      return;
    }

    successMessage.classList.add('show');
    form.reset();
    selectedDate = null;
    selectedSlot = null;
    goToStep(1);
    slotsContainer.style.display = 'none';
    renderCalendar(curYear, curMonth);
    setTimeout(() => successMessage.classList.remove('show'), 8000);
  } catch (err) {
    console.error(err);
    alert('Не удалось отправить заявку. Попробуйте позже или напишите в Telegram.');
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Записаться';
});

/* ── Phone mask: +7 (___) ___-__-__ ── */
const phoneInput = document.getElementById('phone');

phoneInput.addEventListener('focus', () => {
  if (!phoneInput.value) phoneInput.value = '+7 (';
});

phoneInput.addEventListener('input', () => {
  const raw = phoneInput.value.replace(/\D/g, '');
  let digits = raw.startsWith('7') ? raw.slice(1) : (raw.startsWith('8') ? raw.slice(1) : raw);
  if (digits.length > 10) digits = digits.slice(0, 10);

  let formatted = '+7';
  if (digits.length > 0) formatted += ' (' + digits.slice(0, 3);
  if (digits.length >= 3) formatted += ') ';
  if (digits.length > 3) formatted += digits.slice(3, 6);
  if (digits.length >= 6) formatted += '-';
  if (digits.length > 6) formatted += digits.slice(6, 8);
  if (digits.length >= 8) formatted += '-';
  if (digits.length > 8) formatted += digits.slice(8, 10);

  phoneInput.value = formatted;
});

phoneInput.addEventListener('keydown', (e) => {
  if (e.key === 'Backspace' && phoneInput.value.length <= 4) {
    e.preventDefault();
    phoneInput.value = '+7 (';
  }
});

phoneInput.addEventListener('blur', () => {
  if (phoneInput.value === '+7 (' || phoneInput.value === '+7') {
    phoneInput.value = '';
  }
});

/* ── Reference photo (local preview only, no upload) ── */
const refInput      = document.getElementById('reference');
const refUploadBtn  = document.getElementById('refUploadBtn');
const refPreview    = document.getElementById('refPreview');
const refPreviewImg = document.getElementById('refPreviewImg');
const refRemoveBtn  = document.getElementById('refRemoveBtn');

if (refUploadBtn) refUploadBtn.addEventListener('click', () => refInput?.click());

if (refInput) {
  refInput.addEventListener('change', () => {
    const file = refInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (refPreviewImg) refPreviewImg.src = ev.target.result;
      if (refPreview) refPreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });
}

if (refRemoveBtn) {
  refRemoveBtn.addEventListener('click', () => {
    if (refInput) refInput.value = '';
    if (refPreview) refPreview.classList.add('hidden');
    if (refPreviewImg) refPreviewImg.src = '';
  });
}

/* ── Pre-fill name / phone if client is logged in ── */
(async function prefillClientData() {
  try {
    const token = localStorage.getItem('remnant_client_token');
    if (!token) return;
    const res = await fetch('/api/client/profile', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return;
    const profile = await res.json();
    const nameEl  = document.getElementById('name');
    const phoneEl = document.getElementById('phone');
    if (nameEl  && !nameEl.value  && profile?.name)  nameEl.value  = profile.name;
    if (phoneEl && !phoneEl.value && profile?.phone) phoneEl.value = profile.phone;
  } catch {}
})();
