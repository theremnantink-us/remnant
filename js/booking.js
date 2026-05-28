/* ════════════════════════════════════════════════════════════
   REMNANT — Booking page JS
════════════════════════════════════════════════════════════ */

import { supabase } from './supabase-config.js';

const DEFAULT_SLOTS = [
  { start: '10:00', end: '16:00' },
  { start: '16:00', end: '22:00' },
];

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function normalizePhone(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('8') && digits.length === 11) return '+7' + digits.slice(1);
  if (digits.startsWith('7') && digits.length === 11) return '+' + digits;
  if (digits.length === 10) return '+7' + digits;
  return digits ? '+' + digits : '';
}

let curYear, curMonth, selectedDate = null, selectedSlot = null;
const calTitle = document.getElementById('calTitle');
const calGrid = document.getElementById('calGrid');
const slotsContainer = document.getElementById('slotsContainer');
const slotsGrid = document.getElementById('slotsGrid');
const dateInput = document.getElementById('bookingDate');
const slotInput = document.getElementById('bookingSlot');
const toStep2Btn = document.getElementById('toStep2');

function pad(n) { return String(n).padStart(2, '0'); }

async function renderCalendar(year, month) {
  curYear = year; curMonth = month;
  calTitle.textContent = `${MONTHS[month]} ${year}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const from = `${year}-${pad(month + 1)}-01`;
  const to   = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;

  // Fetch which dates are explicitly open/partial for this month
  const { data: blockRows } = await supabase
    .from('blocked_dates')
    .select('date, blocked_slots')
    .gte('date', from)
    .lte('date', to);
  const blockMap = new Map((blockRows || []).map(r => [r.date, r.blocked_slots]));

  let html = DOW.map(d => `<div class="cal-dow">${d}</div>`).join('');
  const first = new Date(year, month, 1);
  let startDay = first.getDay();
  if (startDay === 0) startDay = 7;
  startDay--;

  const today = new Date(); today.setHours(0,0,0,0);

  for (let i = 0; i < startDay; i++) html += '<div class="cal-day empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dt  = new Date(year, month, d);
    const iso = `${year}-${pad(month + 1)}-${pad(d)}`;
    const isPast  = dt < today;
    const isToday = dt.getTime() === today.getTime();
    const isSel   = iso === selectedDate;
    const cls = ['cal-day'];

    if (isPast) {
      cls.push('disabled');
    } else if (!blockMap.has(iso)) {
      cls.push('disabled');                        // no row = closed by default
    } else {
      const val = blockMap.get(iso);
      if (val === null) cls.push('disabled');      // explicitly closed
      // [] or [slots] = clickable (fully open or partial)
    }

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

  calGrid.querySelectorAll('.cal-day').forEach(el => el.classList.toggle('selected', el.dataset.date === iso));
  slotsContainer.style.display = 'block';
  slotsGrid.innerHTML = '<span class="slots-empty">Загрузка...</span>';

  try {
    // Fetch blocked info and existing bookings for this date in parallel
    const [{ data: blockedRow }, { data: bookedRows }] = await Promise.all([
      supabase.from('blocked_dates').select('blocked_slots').eq('date', iso).maybeSingle(),
      supabase.from('bookings').select('time_slot').eq('date', iso).neq('status', 'cancelled'),
    ]);

    // New model: no row OR null = fully closed; [] = fully open; [slots] = partial
    const isFullyClosed = !blockedRow || blockedRow.blocked_slots === null;
    const isFullyOpen   = blockedRow && Array.isArray(blockedRow.blocked_slots)
                          && blockedRow.blocked_slots.length === 0;

    if (isFullyClosed) {
      slotsGrid.innerHTML = '<span class="slots-empty">Нет доступных слотов на эту дату</span>';
      return;
    }

    const blockedSlots = isFullyOpen ? new Set() : new Set(blockedRow.blocked_slots);
    const bookedSlots  = new Set((bookedRows || []).map(r => r.time_slot));

    const slots = DEFAULT_SLOTS.map(s => ({
      ...s,
      available: !blockedSlots.has(s.start) && !bookedSlots.has(s.start),
    }));

    if (slots.every(s => !s.available)) {
      slotsGrid.innerHTML = '<span class="slots-empty">Нет доступных слотов на эту дату</span>';
      return;
    }

    slotsGrid.innerHTML = '';
    slots.forEach(s => {
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
  document.querySelectorAll('.form-step').forEach(el => el.classList.toggle('active', Number(el.dataset.step) === n));
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
    // Check if user is logged in to attach user_id
    const { data: { session } } = await supabase.auth.getSession();

    // Upload reference photo if provided
    let referenceUrl = null;
    const refFile = refInput?.files?.[0];
    if (refFile) {
      submitBtn.textContent = 'Загрузка фото...';
      const ext  = refFile.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('booking-references')
        .upload(path, refFile, { contentType: refFile.type, upsert: false });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('booking-references').getPublicUrl(path);
        referenceUrl = urlData?.publicUrl || null;
      }
      submitBtn.textContent = 'Отправка...';
    }

    const bookingData = {
      date:          payload.date,
      time_slot:     payload.time_slot,
      style:         payload.style || null,
      notes:         payload.notes || null,
      name:          payload.name,
      phone:         normalizePhone(payload.phone),
      status:        'new',
      reference_url: referenceUrl,
    };
    if (session?.user) bookingData.user_id = session.user.id;

    const { data: inserted, error } = await supabase.from('bookings').insert(bookingData).select().single();

    if (error) {
      alert(error.message || 'Ошибка при отправке');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Записаться';
      return;
    }

    // Notify studio about new booking (fire-and-forget)
    if (inserted) {
      supabase.functions.invoke('notify-booking', { body: { type: 'new', booking: inserted } }).catch(() => {});
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

/* ── Reference photo upload ── */
const refInput     = document.getElementById('reference');
const refUploadBtn = document.getElementById('refUploadBtn');
const refPreview   = document.getElementById('refPreview');
const refPreviewImg = document.getElementById('refPreviewImg');
const refRemoveBtn = document.getElementById('refRemoveBtn');

if (refUploadBtn) refUploadBtn.addEventListener('click', () => refInput?.click());

if (refInput) {
  refInput.addEventListener('change', () => {
    const file = refInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      refPreviewImg.src = e.target.result;
      refPreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });
}

if (refRemoveBtn) {
  refRemoveBtn.addEventListener('click', () => {
    refInput.value = '';
    refPreview.classList.add('hidden');
    refPreviewImg.src = '';
  });
}

/* ── Realtime: instantly reflect admin availability changes ── */
supabase
  .channel('booking-blocked-dates')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_dates' }, () => {
    renderCalendar(curYear, curMonth);
    if (selectedDate) selectDate(selectedDate);
  })
  .subscribe();

// Pre-fill form if client is logged in
(async function prefillClientData() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: profile } = await supabase.from('profiles').select('name, phone').eq('id', session.user.id).single();
    const nameEl  = document.getElementById('name');
    const phoneEl = document.getElementById('phone');
    if (nameEl  && !nameEl.value  && profile?.name)  nameEl.value  = profile.name;
    if (phoneEl && !phoneEl.value && profile?.phone) phoneEl.value = profile.phone;
  } catch {}
})();
