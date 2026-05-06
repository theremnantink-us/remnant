// js/admin.js  — all data via /api/admin/* (JWT auth, no Supabase)
import { createOrbital } from './orbital-nav.js';

const ADM_ICONS = {
  bookings:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  schedule:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  analytics: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  recent:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 106 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>`,
};

const STATUS_RU = { new: 'Новая', confirmed: 'Подтверждена', done: 'Завершена', cancelled: 'Отменена' };
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

/* ══ Token helpers ════════════════════════════════ */
const TOKEN_KEY = 'remnant_token';
function getToken()    { return localStorage.getItem(TOKEN_KEY); }
function setToken(t)   { localStorage.setItem(TOKEN_KEY, t); }
function clearToken()  { localStorage.removeItem(TOKEN_KEY); }

async function adminApi(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch('/api/admin' + path, { ...opts, headers });
  if (res.status === 401 || res.status === 403) {
    clearToken();
    showAuth();
    throw new Error('Unauthorized');
  }
  return res;
}

document.getElementById('modal-close')?.addEventListener('click', () => {
  document.getElementById('booking-modal').classList.add('hidden');
});

/* ══ Toast ════════════════════════════════════════ */
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const textEl = document.createElement('span');
  textEl.textContent = msg;
  const progressEl = document.createElement('div');
  progressEl.className = 'toast-progress';
  el.appendChild(textEl);
  el.appendChild(progressEl);
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

/* ══ Section routing ══════════════════════════════ */
function showSection(name) {
  document.querySelectorAll('.adm-section').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });
  document.querySelectorAll('.adm-nav-item').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('section-' + name);
  if (sec) { sec.classList.remove('hidden'); sec.classList.add('active'); }
  const btn = document.querySelector(`.adm-nav-item[data-section="${name}"]`);
  if (btn) btn.classList.add('active');
  if (name === 'dashboard') loadDashboard();
  if (name === 'bookings')  loadBookings();
  if (name === 'schedule')  renderScheduleCalendar();
  if (name === 'analytics') loadAnalytics();
  const backBtn = document.getElementById('adm-back');
  if (backBtn) backBtn.classList.toggle('hidden', name === 'dashboard');
}

document.querySelectorAll('[data-section]').forEach(btn => {
  btn.addEventListener('click', () => {
    showSection(btn.dataset.section);
    closeSidebar();
  });
});

document.getElementById('adm-back')?.addEventListener('click', () => showSection('dashboard'));

/* ══ Mobile sidebar ═══════════════════════════════ */
function closeSidebar() {
  document.getElementById('adm-sidebar').classList.remove('open');
  document.getElementById('adm-backdrop')?.classList.add('hidden');
}
document.getElementById('burger-btn')?.addEventListener('click', () => {
  const open = document.getElementById('adm-sidebar').classList.toggle('open');
  document.getElementById('adm-backdrop')?.classList.toggle('hidden', !open);
});
document.getElementById('adm-backdrop')?.addEventListener('click', closeSidebar);

/* ══ Auth ═════════════════════════════════════════ */
function showAuth() {
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
}

document.getElementById('admin-login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('a-username').value.trim();
  const password = document.getElementById('a-password').value;
  const btn      = document.getElementById('login-btn');
  btn.disabled   = true; btn.textContent = 'Вход...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok || !data.token) {
      document.getElementById('login-error').textContent = data.error || 'Неверный логин или пароль';
      btn.disabled = false; btn.textContent = 'Войти';
      return;
    }

    setToken(data.token);
    openApp(data.username || username);
  } catch {
    document.getElementById('login-error').textContent = 'Ошибка соединения';
    btn.disabled = false; btn.textContent = 'Войти';
  }
});

document.getElementById('adm-logout').addEventListener('click', () => {
  clearToken();
  analyticsLoaded = false;
  showAuth();
});

// Restore session on page load
(function restoreSession() {
  if (getToken()) {
    try {
      const payload = JSON.parse(atob(getToken().split('.')[1]));
      if (payload.exp * 1000 > Date.now()) {
        openApp(payload.username || 'Admin');
        return;
      }
    } catch {}
    clearToken();
  }
  showAuth();
})();

function openApp(username) {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  const emailLabel = document.getElementById('adm-email-label');
  if (emailLabel) emailLabel.textContent = username;
  showSection('dashboard');
  subscribePush();
}

/* ══ Password toggle ══════════════════════════════ */
document.querySelectorAll('.pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.for);
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
  });
});

/* ══ Push subscription ════════════════════════════ */
async function subscribePush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return; // already subscribed

    const res = await adminApi('/push/vapid-key');
    const { publicKey } = await res.json();
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    });
    await adminApi('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(sub),
    });
  } catch {}
}

/* ══ Dashboard ════════════════════════════════════ */
async function loadDashboard() {
  try {
    const [statsRes, recentRes] = await Promise.all([
      adminApi('/stats'),
      adminApi('/bookings?limit=5'),
    ]);
    const stats  = await statsRes.json();
    const recent = (await recentRes.json()).bookings || [];

    const byStatus = Object.fromEntries((stats.byStatus || []).map(r => [r.status, r.count]));
    const newCount  = byStatus.new       || 0;
    const confCount = byStatus.confirmed || 0;
    const doneCount = byStatus.done      || 0;
    const total     = stats.total        || 0;

    const now   = new Date();
    const month = now.toISOString().slice(0, 7);
    const doneMonth = recent.filter(b => b.status === 'done' && b.date?.startsWith(month)).length;

    document.getElementById('s-new').textContent       = newCount;
    document.getElementById('s-confirmed').textContent = confCount;
    document.getElementById('s-done').textContent      = doneCount;
    document.getElementById('s-revenue').textContent   = total;

    const badge = document.getElementById('new-badge');
    if (badge) { badge.textContent = newCount; badge.classList.toggle('hidden', newCount === 0); }

    const list = document.getElementById('recent-list');
    list.innerHTML = '';
    recent.forEach(b => {
      const row = document.createElement('div');
      row.className = 'recent-booking-row';
      const clientEl = document.createElement('div');
      clientEl.className = 'recent-booking-row__name';
      clientEl.textContent = b.name || '—';
      const metaEl = document.createElement('div');
      metaEl.className = 'recent-booking-row__meta';
      metaEl.textContent = `${b.date} · ${b.time_slot || ''} · ${b.style || '—'}`;
      const infoEl = document.createElement('div');
      infoEl.className = 'recent-booking-row__info';
      infoEl.appendChild(clientEl);
      infoEl.appendChild(metaEl);
      const statusEl = document.createElement('span');
      statusEl.className = `status-badge ${b.status}`;
      statusEl.textContent = STATUS_RU[b.status];
      const actionsEl = document.createElement('div');
      actionsEl.className = 'recent-booking-row__actions';
      actionsEl.appendChild(statusEl);
      if (b.status === 'new') {
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn-ghost';
        confirmBtn.style.cssText = 'font-size:.72rem;padding:.3rem .6rem';
        confirmBtn.dataset.confirm = b.id;
        confirmBtn.textContent = 'Подтвердить';
        actionsEl.appendChild(confirmBtn);
      }
      row.appendChild(infoEl);
      row.appendChild(actionsEl);
      list.appendChild(row);
    });

    list.querySelectorAll('[data-confirm]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await adminApi(`/bookings/${btn.dataset.confirm}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'confirmed' }),
        });
        toast('Запись подтверждена');
        loadDashboard();
      });
    });

    buildAdminOrbital({ newCount, confCount, doneMonth, total, recent });
  } catch (err) {
    if (err.message !== 'Unauthorized') console.error('Dashboard error:', err);
  }
}

let _admOrbital = null;
function buildAdminOrbital(stats) {
  const mount = document.getElementById('adm-orbital');
  if (!mount) return;

  const recentText = (stats.recent || []).slice(0, 3).map(b =>
    `• ${b.date || '—'} ${b.time_slot || ''} · ${STATUS_RU[b.status] || b.status}`
  ).join('<br>') || 'Новых записей нет.';

  const nodes = [
    {
      id: 1,
      title: 'Заявки',
      icon: ADM_ICONS.bookings,
      badge: stats.newCount ? String(stats.newCount) : '',
      status: stats.newCount ? 'in-progress' : 'completed',
      date: `${stats.total} всего`,
      content: `Новые: ${stats.newCount} · Подтверждено: ${stats.confCount} · Завершено за месяц: ${stats.doneMonth}.`,
      energy: stats.total ? Math.min(100, Math.round((stats.newCount / Math.max(stats.total, 1)) * 100)) : 0,
      energyLabel: 'Доля новых',
      relatedIds: [2, 4],
      ctaLabel: 'Открыть список',
      onActivate: () => showSection('bookings'),
    },
    {
      id: 2,
      title: 'Расписание',
      icon: ADM_ICONS.schedule,
      status: 'in-progress',
      date: '',
      content: 'Управление слотами, блокировка дней, особые часы работы.',
      relatedIds: [1],
      ctaLabel: 'Открыть календарь',
      onActivate: () => showSection('schedule'),
    },
    {
      id: 3,
      title: 'Статистика',
      icon: ADM_ICONS.analytics,
      status: 'completed',
      date: '',
      content: `Завершено за текущий месяц: ${stats.doneMonth}. Всего записей в системе: ${stats.total}.`,
      energy: stats.total ? Math.min(100, Math.round((stats.doneMonth / Math.max(stats.total, 1)) * 100)) : 0,
      energyLabel: 'Месячная активность',
      relatedIds: [1],
      ctaLabel: 'Открыть статистику',
      onActivate: () => showSection('analytics'),
    },
    {
      id: 4,
      title: 'Последние',
      icon: ADM_ICONS.recent,
      status: 'in-progress',
      date: '',
      content: recentText,
      relatedIds: [1],
      ctaLabel: 'Все заявки',
      onActivate: () => showSection('bookings'),
    },
  ];

  if (_admOrbital) _admOrbital.destroy();
  _admOrbital = createOrbital(mount, {
    nodes,
    center: { type: 'text', value: 'R' },
    radius: 200,
    autoRotate: true,
    onHubClick: () => showSection('bookings'),
    hint: 'Клик на узел — карточка раздела · Повторный клик — открыть раздел',
  });
}

/* ══ Bookings ═════════════════════════════════════ */
let allBookings = [];

async function loadBookings() {
  try {
    const res = await adminApi('/bookings?limit=200');
    const { bookings } = await res.json();
    allBookings = bookings || [];
    renderBookingsTable(allBookings);
  } catch (err) {
    if (err.message !== 'Unauthorized') console.error('Bookings error:', err);
  }
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderBookingsTable(rows) {
  const tbody = document.getElementById('bookings-tbody');
  const cards = document.getElementById('bookings-cards');
  tbody.innerHTML = ''; cards.innerHTML = '';

  rows.forEach(b => {
    // Table row
    const tr = document.createElement('tr');
    const statusSelect = document.createElement('select');
    statusSelect.className = 'adm-status-select';
    statusSelect.dataset.id = b.id;
    ['new','confirmed','done','cancelled'].forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = STATUS_RU[s];
      if (b.status === s) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    const detailBtn = document.createElement('button');
    detailBtn.className = 'btn-ghost';
    detailBtn.style.cssText = 'font-size:.72rem;padding:.3rem .6rem';
    detailBtn.dataset.detail = b.id;
    detailBtn.textContent = 'Детали';

    const tdId     = document.createElement('td'); tdId.textContent     = b.name || '—';
    const tdDate   = document.createElement('td'); tdDate.textContent   = b.date;
    const tdTime   = document.createElement('td'); tdTime.textContent   = b.time_slot || '—';
    const tdStyle  = document.createElement('td'); tdStyle.textContent  = b.style || '—';
    const tdStatus = document.createElement('td'); tdStatus.appendChild(statusSelect);
    const tdAct    = document.createElement('td'); tdAct.appendChild(detailBtn);
    [tdId, tdDate, tdTime, tdStyle, tdStatus, tdAct].forEach(td => tr.appendChild(td));
    tbody.appendChild(tr);

    // Mobile card
    const card = document.createElement('div');
    card.className = 'booking-mob-card';
    const topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem';
    const dateSpan = document.createElement('span');
    dateSpan.style.cssText = 'font-size:.88rem';
    dateSpan.textContent = `${b.date} · ${b.time_slot || ''}`;
    const statusBadge = document.createElement('span');
    statusBadge.className = `status-badge ${b.status}`;
    statusBadge.textContent = STATUS_RU[b.status];
    topRow.appendChild(dateSpan);
    topRow.appendChild(statusBadge);
    const styleEl = document.createElement('div');
    styleEl.style.cssText = 'font-size:.8rem;color:var(--muted)';
    styleEl.textContent = [b.name, b.phone, b.style].filter(Boolean).join(' · ') || '—';
    const cardBtn = document.createElement('button');
    cardBtn.className = 'btn-ghost';
    cardBtn.style.cssText = 'margin-top:.75rem;font-size:.72rem';
    cardBtn.dataset.detail = b.id;
    cardBtn.textContent = 'Детали';
    card.appendChild(topRow);
    card.appendChild(styleEl);
    card.appendChild(cardBtn);
    cards.appendChild(card);
  });

  // Status inline change
  tbody.querySelectorAll('.adm-status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      try {
        const res = await adminApi(`/bookings/${sel.dataset.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: sel.value }),
        });
        if (!res.ok) { toast('Ошибка обновления', 'error'); return; }
        sel.closest('tr').classList.add('realtime-flash');
        toast('Статус обновлён');
      } catch {}
    });
  });

  // Detail buttons
  document.querySelectorAll('[data-detail]').forEach(btn => {
    btn.addEventListener('click', () => openBookingModal(Number(btn.dataset.detail)));
  });
}

// Search + filter
let searchDebounce = null;
document.getElementById('search-input')?.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => filterBookings(), 300);
});
document.getElementById('status-filter')?.addEventListener('change', filterBookings);
function filterBookings() {
  const q  = (document.getElementById('search-input')?.value || '').toLowerCase();
  const st = document.getElementById('status-filter')?.value || '';
  const filtered = allBookings.filter(b =>
    (!st || b.status === st) &&
    (!q  || (b.name||'').toLowerCase().includes(q)
          || (b.phone||'').includes(q)
          || (b.style||'').toLowerCase().includes(q)
          || (b.description||'').toLowerCase().includes(q))
  );
  renderBookingsTable(filtered);
}

// CSV export
document.getElementById('export-csv-btn')?.addEventListener('click', () => {
  const header = ['ID','Date','Time','Style','Status','Description'];
  const rows = allBookings.map(b =>
    [b.id, b.date, b.time_slot, b.style, b.status, b.description]
      .map(v => `"${String(v || '').replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv  = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'bookings.csv' });
  a.click();
});

// Modal
function openBookingModal(bookingId) {
  const b = allBookings.find(x => x.id === bookingId);
  if (!b) return;

  document.getElementById('modal-title').textContent = `Запись ${b.date}`;

  const body = document.getElementById('modal-body');
  body.innerHTML = '';

  const rows = [
    ['Клиент',   b.name        || '—'],
    ['Телефон',  b.phone       || '—'],
    ['Email',    b.email       || '—'],
    ['Дата',     b.date],
    ['Время',    b.time_slot   || '—'],
    ['Стиль',    b.style       || '—'],
    ['Размер',   b.size        || '—'],
    ['Локация',  b.location    || '—'],
  ];
  rows.forEach(([label, value]) => {
    const rowEl   = document.createElement('div'); rowEl.className = 'modal-body-row';
    const labelEl = document.createElement('span'); labelEl.className = 'modal-body-label'; labelEl.textContent = label;
    const valueEl = document.createElement('span'); valueEl.textContent = value;
    rowEl.appendChild(labelEl); rowEl.appendChild(valueEl);
    body.appendChild(rowEl);
  });

  const statusRow   = document.createElement('div'); statusRow.className = 'modal-body-row';
  const statusLabel = document.createElement('span'); statusLabel.className = 'modal-body-label'; statusLabel.textContent = 'Статус';
  const statusBadge = document.createElement('span'); statusBadge.className = `status-badge ${b.status}`; statusBadge.textContent = STATUS_RU[b.status];
  statusRow.appendChild(statusLabel); statusRow.appendChild(statusBadge);
  body.appendChild(statusRow);

  if (b.description) {
    const descRow   = document.createElement('div'); descRow.className = 'modal-body-row';
    const descLabel = document.createElement('span'); descLabel.className = 'modal-body-label'; descLabel.textContent = 'Описание';
    const descValue = document.createElement('span'); descValue.textContent = b.description;
    descRow.appendChild(descLabel); descRow.appendChild(descValue);
    body.appendChild(descRow);
  }

  const actions  = document.getElementById('modal-actions');
  actions.innerHTML = '';
  const closeBtn = document.createElement('button'); closeBtn.className = 'btn-ghost'; closeBtn.id = 'modal-close-btn'; closeBtn.textContent = 'Закрыть';
  actions.appendChild(closeBtn);

  if (b.status === 'new') {
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-primary'; confirmBtn.style.width = 'auto';
    confirmBtn.textContent = 'Подтвердить';
    actions.appendChild(confirmBtn);
    confirmBtn.addEventListener('click', async () => {
      try {
        await adminApi(`/bookings/${b.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'confirmed' }) });
        document.getElementById('booking-modal').classList.add('hidden');
        toast('Запись подтверждена');
        loadBookings();
      } catch {}
    });
  }

  document.getElementById('modal-close-btn').addEventListener('click', () =>
    document.getElementById('booking-modal').classList.add('hidden')
  );
  document.getElementById('booking-modal').classList.remove('hidden');
}

/* ══ Schedule Calendar ════════════════════════════ */
let calYear       = new Date().getFullYear();
let calMonth      = new Date().getMonth();
let selectedDate  = null;
let selectedDates = new Set();
let lastClickedDate = null;
let calDragActive = false;
let calDragMode   = 'add';
let blockedSet    = new Set();   // dates that are blocked (have a row in blocked_dates)
let bookedDatesSet = new Set();  // dates that have bookings

document.addEventListener('mouseup', () => { calDragActive = false; });

function padN(n) { return String(n).padStart(2, '0'); }

function getDatesBetween(a, b) {
  const result = [];
  const prefix = `${calYear}-${padN(calMonth + 1)}`;
  let cur = new Date((a < b ? a : b) + 'T00:00');
  const end = new Date((a < b ? b : a) + 'T00:00');
  while (cur <= end) {
    const iso = cur.toISOString().slice(0, 10);
    if (iso.startsWith(prefix)) result.push(iso);
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function updateCalSelection() {
  document.querySelectorAll('#cal-grid .cal-day').forEach(el => {
    if (el.dataset.date) el.classList.toggle('selected', selectedDates.has(el.dataset.date));
  });
}

function updateSidebar() {
  const n       = selectedDates.size;
  const singleEl = document.getElementById('schedule-actions');
  const multiEl  = document.getElementById('multi-date-actions');
  const titleEl  = document.getElementById('selected-date-title');

  if (n === 0) {
    titleEl.textContent = 'Выберите дату';
    singleEl.classList.add('hidden');
    multiEl.classList.add('hidden');
  } else if (n === 1) {
    multiEl.classList.add('hidden');
    showDateSidebar([...selectedDates][0]);
  } else {
    const forms = ['дата', 'даты', 'дат'];
    const rem = n % 10, rem100 = n % 100;
    const form = (rem === 1 && rem100 !== 11) ? forms[0]
               : (rem >= 2 && rem <= 4 && !(rem100 >= 12 && rem100 <= 14)) ? forms[1]
               : forms[2];
    titleEl.textContent = `${n} ${form} выбрано`;
    document.getElementById('multi-date-count').textContent = `${n} дат`;
    singleEl.classList.add('hidden');
    multiEl.classList.remove('hidden');
  }
}

async function renderScheduleCalendar() {
  try {
    const res  = await adminApi(`/calendar?year=${calYear}&month=${calMonth + 1}`);
    const data = await res.json();

    blockedSet    = new Set((data.blocked_dates || []).map(r => r.date));
    bookedDatesSet = new Set((data.booking_counts || []).map(r => r.date));

    document.getElementById('cal-title').textContent = `${MONTHS_RU[calMonth]} ${calYear}`;
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';

    ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(d => {
      const el = document.createElement('div'); el.className = 'cal-day-label'; el.textContent = d; grid.appendChild(el);
    });

    const first = new Date(calYear, calMonth, 1);
    const start = (first.getDay() + 6) % 7;
    for (let i = 0; i < start; i++) { const el = document.createElement('div'); grid.appendChild(el); }

    const days  = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date().toISOString().slice(0, 10);

    for (let d = 1; d <= days; d++) {
      const date = `${calYear}-${padN(calMonth + 1)}-${padN(d)}`;
      const el   = document.createElement('div');
      el.className = 'cal-day';
      el.dataset.date = date;
      el.textContent = d;

      if (date === today)           el.classList.add('today');
      if (selectedDates.has(date))  el.classList.add('selected');
      if (blockedSet.has(date))     el.classList.add('blocked');
      if (bookedDatesSet.has(date)) el.classList.add('has-bookings');

      el.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        if (e.shiftKey) return;
        calDragActive = true;
        calDragMode   = selectedDates.has(date) ? 'remove' : 'add';
        if (calDragMode === 'add') selectedDates.add(date);
        else selectedDates.delete(date);
        lastClickedDate = date;
        updateCalSelection();
        updateSidebar();
      });

      el.addEventListener('mouseenter', () => {
        if (!calDragActive) return;
        if (calDragMode === 'add') selectedDates.add(date);
        else selectedDates.delete(date);
        updateCalSelection();
        updateSidebar();
      });

      el.addEventListener('click', e => {
        if (!e.shiftKey || !lastClickedDate) return;
        getDatesBetween(lastClickedDate, date).forEach(d2 => selectedDates.add(d2));
        lastClickedDate = date;
        updateCalSelection();
        updateSidebar();
      });

      grid.appendChild(el);
    }
  } catch (err) {
    if (err.message !== 'Unauthorized') console.error('Calendar error:', err);
  }
}

async function showDateSidebar(date) {
  selectedDate = date;
  document.getElementById('selected-date-title').textContent =
    new Date(date + 'T00:00').toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('schedule-actions').classList.remove('hidden');

  try {
    const res  = await adminApi(`/bookings?date=${date}&limit=50`);
    const { bookings: dayBookings = [] } = await res.json();

    const isBlocked = blockedSet.has(date);

    // Slot toggles — show available slots based on /api/slots response
    const slotsRes  = await fetch(`/api/slots?date=${date}`);
    const slotsData = await slotsRes.json();
    const allSlots  = slotsData.slots || [];
    const bookedSlotSet = new Set(
      dayBookings.filter(b => b.status !== 'cancelled').map(b => b.time_slot)
    );

    const toggleGrid = document.getElementById('slots-toggle-grid');
    toggleGrid.innerHTML = '';
    allSlots.forEach(s => {
      const isBooked = bookedSlotSet.has(s.start);
      const btn = document.createElement('button');
      btn.className = 'slot-toggle' + (isBooked ? ' booked' : (!s.available ? ' blocked' : ''));
      btn.textContent = `${s.start} – ${s.end}`;
      btn.title = isBooked ? 'Занято' : (!s.available ? 'Недоступно' : 'Свободно');
      toggleGrid.appendChild(btn);
    });

    document.getElementById('block-day-btn').classList.toggle('hidden', isBlocked);
    document.getElementById('unblock-day-btn').classList.toggle('hidden', !isBlocked);

    const list = document.getElementById('date-bookings-list');
    list.innerHTML = '';
    if (!dayBookings.length) {
      const p = document.createElement('p');
      p.style.cssText = 'font-size:.8rem;color:var(--muted);margin-top:.4rem';
      p.textContent = 'Нет записей';
      list.appendChild(p);
    } else {
      dayBookings.forEach(b => {
        const row = document.createElement('div'); row.className = 'day-booking-row';
        const left = document.createElement('span');
        left.textContent = [b.time_slot, b.name, b.phone, b.style].filter(Boolean).join(' · ');
        const badge = document.createElement('span');
        badge.className = `status-badge ${b.status}`;
        badge.textContent = STATUS_RU[b.status];
        row.appendChild(left); row.appendChild(badge);
        list.appendChild(row);
      });
    }
  } catch (err) {
    if (err.message !== 'Unauthorized') console.error('Sidebar error:', err);
  }
}

document.getElementById('cal-prev')?.addEventListener('click', () => {
  calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderScheduleCalendar();
});
document.getElementById('cal-next')?.addEventListener('click', () => {
  calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderScheduleCalendar();
});

document.getElementById('block-day-btn')?.addEventListener('click', async () => {
  if (!selectedDate) return;
  try {
    await adminApi('/blocked-dates', { method: 'POST', body: JSON.stringify({ date: selectedDate }) });
    toast('День закрыт');
    await renderScheduleCalendar();
    showDateSidebar(selectedDate);
  } catch {}
});

document.getElementById('unblock-day-btn')?.addEventListener('click', async () => {
  if (!selectedDate) return;
  try {
    await adminApi(`/blocked-dates/${selectedDate}`, { method: 'DELETE' });
    toast('День открыт');
    await renderScheduleCalendar();
    showDateSidebar(selectedDate);
  } catch {}
});

document.getElementById('batch-block-btn')?.addEventListener('click', async () => {
  if (!selectedDates.size) return;
  try {
    await Promise.all([...selectedDates].map(date =>
      adminApi('/blocked-dates', { method: 'POST', body: JSON.stringify({ date }) })
    ));
    toast(`Закрыто: ${selectedDates.size} дат`);
    await renderScheduleCalendar();
  } catch {}
});

document.getElementById('batch-unblock-btn')?.addEventListener('click', async () => {
  if (!selectedDates.size) return;
  try {
    await Promise.all([...selectedDates].map(date =>
      adminApi(`/blocked-dates/${date}`, { method: 'DELETE' })
    ));
    toast(`Открыто: ${selectedDates.size} дат`);
    await renderScheduleCalendar();
  } catch {}
});

document.getElementById('clear-selection-btn')?.addEventListener('click', () => {
  selectedDates.clear();
  lastClickedDate = null;
  updateCalSelection();
  updateSidebar();
});

/* ══ ANALYTICS ═══════════════════════════════════ */
/* global Chart */
const CHART_DEFAULTS = {
  color: 'rgba(196,168,130,',
  grid: 'rgba(255,255,255,0.06)',
  label: 'rgba(255,255,255,0.45)',
  font: "'Outfit', system-ui, sans-serif",
};

function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: 'rgba(8,8,8,0.9)',
      borderColor: 'rgba(196,168,130,0.3)',
      borderWidth: 1,
      titleColor: '#e8e3dc',
      bodyColor: 'rgba(255,255,255,0.55)',
      titleFont: { family: CHART_DEFAULTS.font, size: 11 },
      bodyFont:  { family: CHART_DEFAULTS.font, size: 11 },
      padding: 10,
    }},
    scales: {
      x: { grid: { color: CHART_DEFAULTS.grid }, ticks: { color: CHART_DEFAULTS.label, font: { family: CHART_DEFAULTS.font, size: 10 } } },
      y: { grid: { color: CHART_DEFAULTS.grid }, ticks: { color: CHART_DEFAULTS.label, font: { family: CHART_DEFAULTS.font, size: 10 } }, beginAtZero: true }
    }
  };
}

let analyticsLoaded = false;
const _charts = {};

async function loadAnalytics() {
  if (analyticsLoaded) return;
  analyticsLoaded = true;

  try {
    const res = await adminApi('/bookings?limit=200');
    const { bookings: all = [] } = await res.json();

    if (!all.length) {
      document.querySelector('#section-analytics .an-kpi-row').innerHTML =
        '<p style="color:var(--muted);font-size:.85rem;grid-column:span 4">Нет данных</p>';
      return;
    }

    const now   = new Date();
    const month = now.toISOString().slice(0, 7);

    const total      = all.length;
    const monthBkgs  = all.filter(b => (b.date || '').startsWith(month));
    const done       = all.filter(b => b.status === 'done');
    const cancelled  = all.filter(b => b.status === 'cancelled');

    setText('an-total-bookings', total);
    setText('an-month-bookings', monthBkgs.length);
    setText('an-conversion',     total ? Math.round(done.length / total * 100) + '%' : '—%');
    setText('an-cancel-rate',    total ? Math.round(cancelled.length / total * 100) + '%' : '—%');

    const days30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - 29 + i);
      return d.toISOString().slice(0, 10);
    });
    const dailyCounts = days30.map(day => all.filter(b => b.date === day).length);
    buildChart('chart-bookings-daily', 'bar', {
      labels: days30.map(d => d.slice(5)),
      datasets: [{ label: 'Записи', data: dailyCounts, backgroundColor: 'rgba(196,168,130,0.25)', borderColor: 'rgba(196,168,130,0.7)', borderWidth: 1 }]
    });

    const statusCounts = ['new','confirmed','done','cancelled'].map(s => all.filter(b => b.status === s).length);
    buildChart('chart-statuses', 'doughnut', {
      labels: ['Новые','Подтверждено','Завершено','Отменено'],
      datasets: [{ data: statusCounts, backgroundColor: ['rgba(196,168,130,0.7)','rgba(111,207,151,0.7)','rgba(100,100,120,0.7)','rgba(192,57,43,0.6)'], borderColor: 'rgba(8,8,8,0.5)', borderWidth: 2 }]
    }, { scales: undefined, plugins: { legend: { display: true, position: 'right', labels: { color: 'rgba(255,255,255,0.5)', font: { family: CHART_DEFAULTS.font, size: 10 }, boxWidth: 10, padding: 10 } }, tooltip: chartDefaults().plugins.tooltip }});

    const weekdayNames  = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
    const weekdayCounts = Array(7).fill(0);
    all.forEach(b => { if (b.date) weekdayCounts[new Date(b.date + 'T12:00').getDay()]++; });
    buildChart('chart-weekdays', 'bar', {
      labels: weekdayNames,
      datasets: [{ label: 'Записи', data: weekdayCounts, backgroundColor: weekdayCounts.map((_, i) => i === 0 || i === 6 ? 'rgba(196,168,130,0.18)' : 'rgba(196,168,130,0.45)'), borderColor: 'rgba(196,168,130,0.6)', borderWidth: 1 }]
    });

    const styleCounts = {};
    all.forEach(b => { if (b.style) styleCounts[b.style] = (styleCounts[b.style] || 0) + 1; });
    const styleEntries = Object.entries(styleCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    buildChart('chart-styles', 'bar', {
      labels: styleEntries.map(([s]) => s),
      datasets: [{ label: 'Записи', data: styleEntries.map(([, n]) => n), backgroundColor: 'rgba(196,168,130,0.35)', borderColor: 'rgba(196,168,130,0.65)', borderWidth: 1 }]
    }, { indexAxis: 'y' });
  } catch (err) {
    if (err.message !== 'Unauthorized') console.error('Analytics error:', err);
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function buildChart(id, type, data, extraOpts = {}) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  if (_charts[id]) { _charts[id].destroy(); }
  const opts = { ...chartDefaults(), ...extraOpts };
  if (extraOpts.scales === undefined && type === 'doughnut') delete opts.scales;
  // eslint-disable-next-line no-undef
  _charts[id] = new window['Chart'](canvas, { type, data, options: opts });
}
