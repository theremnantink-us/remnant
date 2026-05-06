// js/admin.js
import { supabase } from './supabase-config.js';
import { createOrbital } from './orbital-nav.js';

const ADM_ICONS = {
  bookings:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  schedule:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  analytics: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  recent:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 106 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>`,
};

const STATUS_RU = { new: 'Новая', confirmed: 'Подтверждена', done: 'Завершена', cancelled: 'Отменена' };
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

let realtimeChannel = null;

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
  if (name === 'schedule')  renderCalendar();
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
document.getElementById('admin-login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('a-email').value.trim();
  const password = document.getElementById('a-password').value;
  const btn      = document.getElementById('login-btn');
  btn.disabled   = true; btn.textContent = 'Вход...';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    document.getElementById('login-error').textContent = 'Неверный email или пароль';
    btn.disabled = false; btn.textContent = 'Войти';
    return;
  }

  // Check admin role
  const role = data.user.user_metadata?.role;
  if (role !== 'admin') {
    await supabase.auth.signOut();
    document.getElementById('login-error').textContent = 'Нет доступа';
    btn.disabled = false; btn.textContent = 'Войти';
    return;
  }

  openApp(data.user);
});

document.getElementById('adm-logout').addEventListener('click', async () => {
  if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
  await supabase.auth.signOut();
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session) {
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
  }
});

supabase.auth.getSession().then(({ data: { session } }) => {
  if (session && session.user.user_metadata?.role === 'admin') openApp(session.user);
});

function openApp(user) {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  const emailLabel = document.getElementById('adm-email-label');
  if (emailLabel) emailLabel.textContent = user.email;
  showSection('dashboard');
  subscribeRealtime();
}

/* ══ Password toggle ══════════════════════════════ */
document.querySelectorAll('.pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.for);
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
  });
});

/* ══ Dashboard ════════════════════════════════════ */
async function loadDashboard() {
  const now   = new Date();
  const month = now.toISOString().slice(0, 7); // YYYY-MM

  const { data } = await supabase
    .from('bookings')
    .select('id, status, date, time_slot, style, created_at, user_id');

  const bookings = data || [];

  const newCount  = bookings.filter(b => b.status === 'new').length;
  const confCount = bookings.filter(b => b.status === 'confirmed').length;
  const doneMonth = bookings.filter(b => b.status === 'done' && b.date?.startsWith(month)).length;

  document.getElementById('s-new').textContent       = newCount;
  document.getElementById('s-confirmed').textContent = confCount;
  document.getElementById('s-done').textContent      = doneMonth;
  document.getElementById('s-revenue').textContent   = bookings.length;

  // Badge
  const badge = document.getElementById('new-badge');
  if (badge) { badge.textContent = newCount; badge.classList.toggle('hidden', newCount === 0); }

  // Recent 5
  const recent   = [...bookings].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const userIds  = [...new Set(recent.map(b => b.user_id).filter(Boolean))];
  const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', userIds);
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

  const list   = document.getElementById('recent-list');
  list.innerHTML = '';

  recent.forEach(b => {
    const clientName = profileMap[b.user_id]?.name || 'Клиент';

    const row = document.createElement('div');
    row.className = 'recent-booking-row';
    const clientEl = document.createElement('div');
    clientEl.className = 'recent-booking-row__name';
    clientEl.textContent = clientName;
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
      await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', btn.dataset.confirm);
      toast('Запись подтверждена');
      loadDashboard();
    });
  });

  buildAdminOrbital({ newCount, confCount, doneMonth, total: bookings.length, recent });
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
  const { data } = await supabase
    .from('bookings')
    .select('id, date, time_slot, style, status, notes, name, phone, reference_url, user_id, created_at')
    .order('date', { ascending: false });
  allBookings = data || [];
  renderBookingsTable(allBookings);
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

    const tdId = document.createElement('td'); tdId.textContent = b.name || b.user_id?.slice(0,8) || '—';
    const tdDate = document.createElement('td'); tdDate.textContent = b.date;
    const tdTime = document.createElement('td'); tdTime.textContent = b.time_slot || '—';
    const tdStyle = document.createElement('td'); tdStyle.textContent = b.style || '—';
    const tdStatus = document.createElement('td'); tdStatus.appendChild(statusSelect);
    const tdActions = document.createElement('td'); tdActions.appendChild(detailBtn);
    [tdId, tdDate, tdTime, tdStyle, tdStatus, tdActions].forEach(td => tr.appendChild(td));
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
      const { error } = await supabase.from('bookings').update({ status: sel.value }).eq('id', sel.dataset.id);
      if (error) { toast('Ошибка обновления', 'error'); return; }
      sel.closest('tr').classList.add('realtime-flash');
      toast('Статус обновлён');
    });
  });

  // Detail buttons
  document.querySelectorAll('[data-detail]').forEach(btn => {
    btn.addEventListener('click', () => openBookingModal(btn.dataset.detail));
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
  const q   = (document.getElementById('search-input')?.value || '').toLowerCase();
  const st  = document.getElementById('status-filter')?.value || '';
  const filtered = allBookings.filter(b =>
    (!st || b.status === st) &&
    (!q  || (b.name||'').toLowerCase().includes(q)
          || (b.phone||'').includes(q)
          || (b.style||'').toLowerCase().includes(q)
          || (b.notes||'').toLowerCase().includes(q))
  );
  renderBookingsTable(filtered);
}

// CSV export
document.getElementById('export-csv-btn')?.addEventListener('click', () => {
  const header = ['ID','Date','Time','Style','Status','Notes'];
  const rows = allBookings.map(b =>
    [b.id, b.date, b.time_slot, b.style, b.status, b.notes]
      .map(v => `"${String(v || '').replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv    = [header.join(','), ...rows].join('\n');
  const blob   = new Blob([csv], { type: 'text/csv' });
  const a      = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'bookings.csv' });
  a.click();
});

// Modal
async function openBookingModal(bookingId) {
  const b = allBookings.find(x => x.id === bookingId);
  if (!b) return;

  // Name and phone are stored directly on the booking; fall back to profile for logged-in clients
  let clientName  = b.name  || '—';
  let clientPhone = b.phone || '—';
  if (b.user_id && (clientName === '—' || clientPhone === '—')) {
    const { data: profile } = await supabase.from('profiles').select('name, phone').eq('id', b.user_id).maybeSingle();
    if (profile?.name  && clientName  === '—') clientName  = profile.name;
    if (profile?.phone && clientPhone === '—') clientPhone = profile.phone;
  }

  document.getElementById('modal-title').textContent = `Запись ${b.date}`;

  const body = document.getElementById('modal-body');
  body.innerHTML = '';
  const rows = [
    ['Клиент', clientName],
    ['Телефон', clientPhone],
    ['Дата', b.date],
    ['Время', b.time_slot || '—'],
    ['Стиль', b.style || '—'],
  ];
  rows.forEach(([label, value]) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'modal-body-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'modal-body-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.textContent = value;
    rowEl.appendChild(labelEl);
    rowEl.appendChild(valueEl);
    body.appendChild(rowEl);
  });
  // Status row
  const statusRow = document.createElement('div');
  statusRow.className = 'modal-body-row';
  const statusLabel = document.createElement('span');
  statusLabel.className = 'modal-body-label';
  statusLabel.textContent = 'Статус';
  const statusBadge = document.createElement('span');
  statusBadge.className = `status-badge ${b.status}`;
  statusBadge.textContent = STATUS_RU[b.status];
  statusRow.appendChild(statusLabel);
  statusRow.appendChild(statusBadge);
  body.appendChild(statusRow);
  // Notes row
  if (b.notes) {
    const notesRow = document.createElement('div');
    notesRow.className = 'modal-body-row';
    const notesLabel = document.createElement('span');
    notesLabel.className = 'modal-body-label';
    notesLabel.textContent = 'Заметки';
    const notesValue = document.createElement('span');
    notesValue.textContent = b.notes;
    notesRow.appendChild(notesLabel);
    notesRow.appendChild(notesValue);
    body.appendChild(notesRow);
  }
  // Reference photo
  if (b.reference_url) {
    const refRow = document.createElement('div');
    refRow.className = 'modal-body-row';
    refRow.style.flexDirection = 'column';
    refRow.style.alignItems = 'flex-start';
    const refLabel = document.createElement('span');
    refLabel.className = 'modal-body-label';
    refLabel.textContent = 'Референс';
    const refImg = document.createElement('img');
    refImg.src = b.reference_url;
    refImg.alt = 'Референс';
    refImg.style.cssText = 'max-width:100%;max-height:320px;margin-top:.6rem;border:1px solid var(--border);cursor:pointer';
    refImg.addEventListener('click', () => window.open(b.reference_url, '_blank'));
    refRow.appendChild(refLabel);
    refRow.appendChild(refImg);
    body.appendChild(refRow);
  }

  const actions = document.getElementById('modal-actions');
  actions.innerHTML = '';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn-ghost';
  closeBtn.id = 'modal-close-btn';
  closeBtn.textContent = 'Закрыть';
  actions.appendChild(closeBtn);
  if (b.status === 'new') {
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-primary';
    confirmBtn.style.width = 'auto';
    confirmBtn.dataset.confirmModal = b.id;
    confirmBtn.textContent = 'Подтвердить';
    actions.appendChild(confirmBtn);
    confirmBtn.addEventListener('click', async () => {
      await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', b.id);
      document.getElementById('booking-modal').classList.add('hidden');
      toast('Запись подтверждена');
      loadBookings();
    });
  }

  document.getElementById('modal-close-btn').addEventListener('click', () => document.getElementById('booking-modal').classList.add('hidden'));
  document.getElementById('booking-modal').classList.remove('hidden');
}

/* ══ Schedule Calendar ════════════════════════════ */
// DB semantics:
//   no row         → closed by default (all slots blocked)
//   blocked_slots: null  → explicitly closed (whole day)
//   blocked_slots: []    → explicitly open (all slots available)
//   blocked_slots: [..] → partial block

const SLOT_TIMES = ['10:00', '16:00'];
let calYear         = new Date().getFullYear();
let calMonth        = new Date().getMonth();
let selectedDate    = null;
let selectedDates   = new Set();  // multi-select
let lastClickedDate = null;       // shift+click anchor
let calDragActive   = false;
let calDragMoved    = false;      // true once pointer enters a second cell
let calDragMode     = 'add';      // 'add' | 'remove'
let blockedMap      = new Map();

document.addEventListener('mouseup', () => { calDragActive = false; });

async function loadBlockedDates() {
  const { data } = await supabase.from('blocked_dates').select('date, blocked_slots');
  blockedMap = new Map((data || []).map(r => [r.date, r.blocked_slots]));
}

// Returns dates between a and b inclusive (any order), only within current month
function getDatesBetween(a, b) {
  const result = [];
  const prefix = `${calYear}-${String(calMonth + 1).padStart(2,'0')}`;
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
  const n = selectedDates.size;
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

async function renderCalendar() {
  await loadBlockedDates();

  const nextMonthDate = new Date(calYear, calMonth + 1, 1);
  const nextMonthStr  = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2,'0')}-01`;
  const { data: bookings } = await supabase
    .from('bookings').select('date')
    .gte('date', `${calYear}-${String(calMonth + 1).padStart(2,'0')}-01`)
    .lt('date', nextMonthStr);

  const bookedDates = new Set((bookings || []).map(b => b.date));

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
    const date = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const el   = document.createElement('div');
    el.className = 'cal-day';
    el.dataset.date = date;
    el.textContent = d;

    if (date === today) el.classList.add('today');
    if (selectedDates.has(date)) el.classList.add('selected');

    // Determine open/closed/partial state
    if (blockedMap.has(date)) {
      const val = blockedMap.get(date);
      if (val === null) {
        el.classList.add('blocked');               // explicitly closed
      } else if (Array.isArray(val) && val.length > 0) {
        el.classList.add('partial');               // partial block
      }
      // val === [] (empty array) → explicitly open, no extra class
    } else {
      el.classList.add('blocked');                 // no row = closed by default
    }

    if (bookedDates.has(date)) el.classList.add('has-bookings');

    // mousedown: start drag OR single-click toggle (not shift)
    el.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.preventDefault(); // prevent text selection during drag
      if (e.shiftKey) return; // shift+click handled in 'click'
      calDragActive = true;
      calDragMoved  = false;
      calDragMode   = selectedDates.has(date) ? 'remove' : 'add';
      if (calDragMode === 'add') selectedDates.add(date);
      else selectedDates.delete(date);
      lastClickedDate = date;
      updateCalSelection();
      updateSidebar();
    });

    // mouseenter: extend drag selection to this cell
    el.addEventListener('mouseenter', () => {
      if (!calDragActive) return;
      calDragMoved = true;
      if (calDragMode === 'add') selectedDates.add(date);
      else selectedDates.delete(date);
      updateCalSelection();
      updateSidebar();
    });

    // click: only handles shift+click range (normal click handled in mousedown)
    el.addEventListener('click', e => {
      if (!e.shiftKey || !lastClickedDate) return;
      getDatesBetween(lastClickedDate, date).forEach(d2 => selectedDates.add(d2));
      lastClickedDate = date;
      updateCalSelection();
      updateSidebar();
    });

    grid.appendChild(el);
  }
}

async function showDateSidebar(date) {
  selectedDate = date;
  document.getElementById('selected-date-title').textContent =
    new Date(date + 'T00:00').toLocaleDateString('ru', { day:'numeric', month:'long', year:'numeric' });
  document.getElementById('schedule-actions').classList.remove('hidden');

  const [{ data: blockedRow }, { data: dayBookings }] = await Promise.all([
    supabase.from('blocked_dates').select('blocked_slots').eq('date', date).maybeSingle(),
    supabase.from('bookings').select('id, time_slot, style, status, name, phone').eq('date', date),
  ]);

  // Determine state
  const isFullyClosed = !blockedRow || blockedRow.blocked_slots === null;
  const isFullyOpen   = blockedRow && Array.isArray(blockedRow.blocked_slots) && blockedRow.blocked_slots.length === 0;
  const blockedSlots  = isFullyClosed
    ? new Set(SLOT_TIMES)
    : isFullyOpen
    ? new Set()
    : new Set(blockedRow.blocked_slots);
  const bookedSlots = new Set((dayBookings || []).map(b => b.time_slot));

  // Render slot toggles
  const toggleGrid = document.getElementById('slots-toggle-grid');
  toggleGrid.innerHTML = '';
  SLOT_TIMES.forEach(slot => {
    const isBlocked = blockedSlots.has(slot);
    const isBooked  = bookedSlots.has(slot);
    const btn = document.createElement('button');
    btn.className = 'slot-toggle' + (isBlocked ? ' blocked' : '') + (isBooked ? ' booked' : '');
    btn.textContent = slot;
    btn.title = isBooked ? 'Занято' : (isBlocked ? 'Заблокировано — нажми чтобы открыть' : 'Свободно — нажми чтобы закрыть');
    if (!isBooked) btn.addEventListener('click', () => toggleSlot(date, slot, isBlocked));
    toggleGrid.appendChild(btn);
  });

  // "Закрыть" hidden when already fully closed; "Открыть" hidden when already fully open
  document.getElementById('block-day-btn').classList.toggle('hidden', isFullyClosed);
  document.getElementById('unblock-day-btn').classList.toggle('hidden', isFullyOpen);

  // Bookings list
  const list = document.getElementById('date-bookings-list');
  list.innerHTML = '';
  if (!dayBookings?.length) {
    const p = document.createElement('p');
    p.style.cssText = 'font-size:.8rem;color:var(--muted);margin-top:.4rem';
    p.textContent = 'Нет записей';
    list.appendChild(p);
  } else {
    dayBookings.forEach(b => {
      const row = document.createElement('div');
      row.className = 'day-booking-row';
      const left = document.createElement('span');
      left.textContent = [b.time_slot, b.name, b.phone, b.style].filter(Boolean).join(' · ');
      const badge = document.createElement('span');
      badge.className = `status-badge ${b.status}`;
      badge.textContent = STATUS_RU[b.status];
      row.appendChild(left); row.appendChild(badge);
      list.appendChild(row);
    });
  }
}

async function toggleSlot(date, slot, currentlyBlocked) {
  const { data: row } = await supabase.from('blocked_dates').select('blocked_slots').eq('date', date).maybeSingle();

  if (currentlyBlocked) {
    // OPENING this slot
    let newBlocked;
    if (!row || row.blocked_slots === null) {
      // No row or explicit full-close — open just this one
      newBlocked = SLOT_TIMES.filter(s => s !== slot);
    } else {
      newBlocked = row.blocked_slots.filter(s => s !== slot);
    }
    const payload = newBlocked.length === 0 ? [] : newBlocked;
    const { error } = await supabase.from('blocked_dates').upsert({ date, blocked_slots: payload }, { onConflict: 'date' });
    if (error) { toast('Ошибка', 'error'); return; }
    toast(`${slot} — открыто`);
  } else {
    // CLOSING this slot
    const current    = (row && Array.isArray(row.blocked_slots)) ? row.blocked_slots : [];
    const newBlocked = [...new Set([...current, slot])];
    const allBlocked = SLOT_TIMES.every(s => newBlocked.includes(s));
    const { error }  = await supabase.from('blocked_dates').upsert(
      { date, blocked_slots: allBlocked ? null : newBlocked },
      { onConflict: 'date' }
    );
    if (error) { toast('Ошибка', 'error'); return; }
    toast(`${slot} — заблокировано`);
  }
  await loadBlockedDates();
  showDateSidebar(date);
}

document.getElementById('cal-prev')?.addEventListener('click', () => {
  calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar();
});
document.getElementById('cal-next')?.addEventListener('click', () => {
  calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar();
});

document.getElementById('block-day-btn')?.addEventListener('click', async () => {
  if (!selectedDate) return;
  const { error } = await supabase.from('blocked_dates').upsert({ date: selectedDate, blocked_slots: null }, { onConflict: 'date' });
  if (error) { toast('Ошибка', 'error'); return; }
  toast('День закрыт');
  await loadBlockedDates(); renderCalendar(); showDateSidebar(selectedDate);
});

document.getElementById('unblock-day-btn')?.addEventListener('click', async () => {
  if (!selectedDate) return;
  const { error } = await supabase.from('blocked_dates').upsert({ date: selectedDate, blocked_slots: [] }, { onConflict: 'date' });
  if (error) { toast('Ошибка', 'error'); return; }
  toast('День открыт');
  await loadBlockedDates(); renderCalendar(); showDateSidebar(selectedDate);
});

document.getElementById('batch-block-btn')?.addEventListener('click', async () => {
  if (!selectedDates.size) return;
  const rows = [...selectedDates].map(date => ({ date, blocked_slots: null }));
  const { error } = await supabase.from('blocked_dates').upsert(rows, { onConflict: 'date' });
  if (error) { toast('Ошибка', 'error'); return; }
  toast(`Закрыто: ${selectedDates.size} дат`);
  await loadBlockedDates(); renderCalendar();
});

document.getElementById('batch-unblock-btn')?.addEventListener('click', async () => {
  if (!selectedDates.size) return;
  const rows = [...selectedDates].map(date => ({ date, blocked_slots: [] }));
  const { error } = await supabase.from('blocked_dates').upsert(rows, { onConflict: 'date' });
  if (error) { toast('Ошибка', 'error'); return; }
  toast(`Открыто: ${selectedDates.size} дат`);
  await loadBlockedDates(); renderCalendar();
});

document.getElementById('clear-selection-btn')?.addEventListener('click', () => {
  selectedDates.clear();
  lastClickedDate = null;
  updateCalSelection();
  updateSidebar();
});

/* ══ Realtime ═════════════════════════════════════ */
function subscribeRealtime() {
  realtimeChannel = supabase.channel('bookings-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, payload => {
      toast(`Новая заявка: ${payload.new.date} · ${payload.new.style || '—'}`, 'success');
      const badge = document.getElementById('new-badge');
      if (badge) {
        const n = parseInt(badge.textContent || '0') + 1;
        badge.textContent = n;
        badge.classList.remove('hidden');
      }
      loadBookings();
    })
    .subscribe();
}

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
      x: {
        grid: { color: CHART_DEFAULTS.grid },
        ticks: { color: CHART_DEFAULTS.label, font: { family: CHART_DEFAULTS.font, size: 10 } },
      },
      y: {
        grid: { color: CHART_DEFAULTS.grid },
        ticks: { color: CHART_DEFAULTS.label, font: { family: CHART_DEFAULTS.font, size: 10 } },
        beginAtZero: true,
      }
    }
  };
}

let analyticsLoaded = false;
const _charts = {};

async function loadAnalytics() {
  if (analyticsLoaded) return;
  analyticsLoaded = true;

  const { data: all } = await supabase
    .from('bookings')
    .select('id, date, status, style, created_at');

  if (!all || !all.length) {
    document.querySelector('#section-analytics .an-kpi-row').innerHTML =
      '<p style="color:var(--muted);font-size:.85rem;grid-column:span 4">Нет данных</p>';
    return;
  }

  const now   = new Date();
  const month = now.toISOString().slice(0, 7); // YYYY-MM

  const total       = all.length;
  const monthBkgs   = all.filter(b => (b.date || '').startsWith(month));
  const done        = all.filter(b => b.status === 'done');
  const cancelled   = all.filter(b => b.status === 'cancelled');

  setText('an-total-bookings', total);
  setText('an-month-bookings', monthBkgs.length);
  setText('an-conversion',     total ? Math.round(done.length / total * 100) + '%' : '—%');
  setText('an-cancel-rate',    total ? Math.round(cancelled.length / total * 100) + '%' : '—%');

  // ── Chart 1: daily bookings last 30 days ─────────────
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - 29 + i);
    return d.toISOString().slice(0, 10);
  });
  const dailyCounts = days30.map(day => all.filter(b => b.date === day).length);
  buildChart('chart-bookings-daily', 'bar', {
    labels: days30.map(d => d.slice(5)), // MM-DD
    datasets: [{
      label: 'Записи',
      data: dailyCounts,
      backgroundColor: 'rgba(196,168,130,0.25)',
      borderColor:     'rgba(196,168,130,0.7)',
      borderWidth: 1,
    }]
  });

  // ── Chart 2: status donut ────────────────────────────
  const statusCounts = ['new','confirmed','done','cancelled'].map(s => all.filter(b => b.status === s).length);
  buildChart('chart-statuses', 'doughnut', {
    labels: ['Новые','Подтверждено','Завершено','Отменено'],
    datasets: [{
      data: statusCounts,
      backgroundColor: ['rgba(196,168,130,0.7)','rgba(111,207,151,0.7)','rgba(100,100,120,0.7)','rgba(192,57,43,0.6)'],
      borderColor: 'rgba(8,8,8,0.5)',
      borderWidth: 2,
    }]
  }, { scales: undefined, plugins: { legend: {
    display: true,
    position: 'right',
    labels: { color: 'rgba(255,255,255,0.5)', font: { family: CHART_DEFAULTS.font, size: 10 }, boxWidth: 10, padding: 10 }
  }, tooltip: chartDefaults().plugins.tooltip }});

  // ── Chart 3: bookings by weekday ─────────────────────
  const weekdayNames = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const weekdayCounts = Array(7).fill(0);
  all.forEach(b => { if (b.date) weekdayCounts[new Date(b.date + 'T12:00').getDay()]++; });
  buildChart('chart-weekdays', 'bar', {
    labels: weekdayNames,
    datasets: [{
      label: 'Записи',
      data: weekdayCounts,
      backgroundColor: weekdayCounts.map((_, i) =>
        i === 0 || i === 6 ? 'rgba(196,168,130,0.18)' : 'rgba(196,168,130,0.45)'),
      borderColor: 'rgba(196,168,130,0.6)',
      borderWidth: 1,
    }]
  });

  // ── Chart 4: styles bar ─────────────────────────────
  const styleCounts = {};
  all.forEach(b => { if (b.style) styleCounts[b.style] = (styleCounts[b.style] || 0) + 1; });
  const styleEntries = Object.entries(styleCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  buildChart('chart-styles', 'bar', {
    labels: styleEntries.map(([s]) => s),
    datasets: [{
      label: 'Записи',
      data: styleEntries.map(([, n]) => n),
      backgroundColor: 'rgba(196,168,130,0.35)',
      borderColor: 'rgba(196,168,130,0.65)',
      borderWidth: 1,
    }]
  }, { indexAxis: 'y' });
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
