// js/cabinet.js — REMNANT client cabinet (MySQL/Express backend)
import { createOrbital } from './orbital-nav.js';

const API = '/api/client';
const TOKEN_KEY = 'remnant_client_token';
const NAME_KEY  = 'remnant_user_name';

/* ══ Loyalty tiers (must match backend) ═══════════ */
const LOYALTY_TIERS = [
  { id: 'novice',   label: 'Новичок', threshold: 0,  benefit: 'Добро пожаловать. Первая консультация бесплатно.' },
  { id: 'bronze',   label: 'Бронза',  threshold: 1,  benefit: 'Персональная карта клиента и доступ к закрытым анонсам.' },
  { id: 'silver',   label: 'Серебро', threshold: 3,  benefit: 'Скидка 5% на следующий сеанс и приоритетная запись.' },
  { id: 'gold',     label: 'Золото',  threshold: 5,  benefit: 'Скидка 10% и поздравительный подарок от студии.' },
  { id: 'platinum', label: 'Платина', threshold: 10, benefit: 'Скидка 15%, бесплатная коррекция в первый год.' },
  { id: 'legend',   label: 'Легенда', threshold: 20, benefit: 'Скидка 20% и персональный эксклюзивный дизайн.' },
];

function tierFor(visits) {
  let cur = LOYALTY_TIERS[0], idx = 0;
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (visits >= LOYALTY_TIERS[i].threshold) { cur = LOYALTY_TIERS[i]; idx = i; break; }
  }
  const next = LOYALTY_TIERS[idx + 1] || null;
  const from = cur.threshold;
  const to = next ? next.threshold : cur.threshold;
  const pct = next ? Math.min(100, Math.round(((visits - from) / (to - from)) * 100)) : 100;
  const remain = next ? Math.max(0, to - visits) : 0;
  return { current: cur, next, idx, pct, remain };
}

function pluralVisit(n) {
  const r = n % 10, r100 = n % 100;
  if (r === 1 && r100 !== 11) return '';
  if (r >= 2 && r <= 4 && !(r100 >= 12 && r100 <= 14)) return 'а';
  return 'ов';
}

/* ══ HTTP helpers ════════════════════════════════ */
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
}

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) {
    clearToken();
    showAuth();
    throw new Error('Сессия истекла. Войдите заново.');
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.error || 'Ошибка запроса');
  return data;
}

/* ══ DOM helpers ═════════════════════════════════ */
function $(id) { return document.getElementById(id); }

function showApp() {
  $('auth-screen').classList.add('hidden');
  $('app-screen').classList.remove('hidden');
}
function showAuth() {
  $('app-screen').classList.add('hidden');
  $('auth-screen').classList.remove('hidden');
  showAuthForm('login');
}
function showAuthForm(name) {
  document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach((f) => f.classList.remove('active'));
  const tab = document.querySelector(`.auth-tab[data-tab="${name}"]`);
  if (tab) tab.classList.add('active');
  const form = $(name + '-form');
  if (form) form.classList.add('active');
  clearErrors();
}
function setError(id, msg) { const el = $(id); if (el) el.textContent = msg || ''; }
function clearErrors() { document.querySelectorAll('.field-error').forEach((el) => el.textContent = ''); }

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ══ Toast ═══════════════════════════════════════ */
function showToast(msg, type = 'ok') {
  let toast = $('cab-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cab-toast';
    toast.style.cssText = `
      position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(2rem);
      background:rgba(20,20,20,.92);backdrop-filter:blur(14px);
      color:#e8e3dc;padding:.65rem 1.4rem;font-size:.85rem;letter-spacing:.02em;
      border:1px solid rgba(255,255,255,.1);border-radius:0;
      opacity:0;transition:opacity .3s,transform .3s;z-index:9999;white-space:nowrap;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.borderColor = type === 'err' ? 'rgba(192,57,43,.5)' : 'rgba(255,255,255,.1)';
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(2rem)';
  }, 2400);
}

/* ══ Phone helpers ═══════════════════════════════ */
function formatPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('8') && digits.length === 11) return '+7' + digits.slice(1);
  if (digits.startsWith('7') && digits.length === 11) return '+' + digits;
  if (digits.length === 10) return '+7' + digits;
  return '+' + digits;
}
function applyPhoneMask(input) {
  if (!input) return;
  input.addEventListener('focus', () => { if (!input.value) input.value = '+7 ('; });
  input.addEventListener('input', () => {
    const raw = input.value.replace(/\D/g, '');
    let digits = raw.startsWith('7') ? raw.slice(1) : (raw.startsWith('8') ? raw.slice(1) : raw);
    if (digits.length > 10) digits = digits.slice(0, 10);
    let f = '+7 (';
    if (digits.length > 0) f += digits.slice(0, 3);
    if (digits.length >= 4) f += ') ' + digits.slice(3, 6);
    if (digits.length >= 7) f += '-' + digits.slice(6, 8);
    if (digits.length >= 9) f += '-' + digits.slice(8, 10);
    input.value = f;
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && input.value.length <= 4) {
      e.preventDefault();
      input.value = '+7 (';
    }
  });
  input.addEventListener('blur', () => {
    if (input.value === '+7 (' || input.value === '+7') input.value = '';
  });
}
applyPhoneMask($('login-phone'));
applyPhoneMask($('reg-phone'));
applyPhoneMask($('p-phone'));

/* ══ Password toggles ════════════════════════════ */
document.querySelectorAll('.pw-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = $(btn.dataset.for);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});

/* ══ Auth tab switching ══════════════════════════ */
document.querySelectorAll('.auth-tab').forEach((tab) => {
  tab.addEventListener('click', () => showAuthForm(tab.dataset.tab));
});

/* ══ Login ═══════════════════════════════════════ */
$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  const phone = formatPhone($('login-phone').value.trim());
  const password = $('login-password').value;
  const btn = $('login-btn');
  if (!phone) return setError('login-error', 'Введите телефон');
  if (!password) return setError('login-error', 'Введите пароль');
  btn.disabled = true;
  btn.textContent = 'Вход...';
  try {
    const data = await api('/login', { method: 'POST', body: JSON.stringify({ phone, password }) });
    setToken(data.token);
    if (data.name) localStorage.setItem(NAME_KEY, data.name);
    showApp();
    await loadDashboard();
    setupPushSubscription();
  } catch (err) {
    setError('login-error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Войти';
  }
});

/* ══ Register — step 1 (request code) ════════════ */
let pendingPhone = null;
$('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  const name = $('reg-name').value.trim();
  const email = $('reg-email').value.trim();
  const rawPhone = $('reg-phone').value.trim();
  const password = $('reg-password').value;
  const phone = rawPhone ? formatPhone(rawPhone) : '';

  if (!name || name.length < 2) return setError('reg-error', 'Введите имя (минимум 2 символа)');
  if (!phone) return setError('reg-error', 'Введите телефон');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return setError('reg-error', 'Некорректный email');
  if (password.length < 8) return setError('reg-error', 'Пароль минимум 8 символов');
  if (!/[A-Za-zА-Яа-я]/.test(password) || !/\d/.test(password)) {
    return setError('reg-error', 'Пароль должен содержать буквы и цифры');
  }

  const btn = $('reg-btn');
  btn.disabled = true;
  btn.textContent = 'Отправка кода...';
  try {
    const data = await api('/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password }),
    });
    pendingPhone = phone;
    $('confirm-phone-label').textContent = phone;
    showAuthForm('confirm');
    if (data.devCode) {
      // Dev convenience — show the code in a toast so reviewers can complete the flow without SMS
      showToast(`DEV: код = ${data.devCode}`);
    } else {
      showToast('Код отправлен');
    }
  } catch (err) {
    setError('reg-error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Получить код подтверждения';
  }
});

/* ══ Register — step 2 (confirm code) ════════════ */
$('confirm-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  const code = $('confirm-code').value.trim();
  if (!/^\d{6}$/.test(code)) return setError('confirm-error', 'Введите 6-значный код');
  if (!pendingPhone) return setError('confirm-error', 'Сессия истекла, начните регистрацию заново');

  const btn = $('confirm-btn');
  btn.disabled = true;
  btn.textContent = 'Проверка...';
  try {
    const data = await api('/register/confirm', {
      method: 'POST',
      body: JSON.stringify({ phone: pendingPhone, code }),
    });
    setToken(data.token);
    if (data.name) localStorage.setItem(NAME_KEY, data.name);
    pendingPhone = null;
    showApp();
    await loadDashboard();
    setupPushSubscription();
  } catch (err) {
    setError('confirm-error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Подтвердить';
  }
});

$('confirm-back')?.addEventListener('click', () => showAuthForm('register'));

/* ══ Tab routing ═════════════════════════════════ */
function showTab(name) {
  document.querySelectorAll('.cab-tab').forEach((t) => {
    t.classList.remove('active');
    t.classList.add('hidden');
  });
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
  const tab = $('tab-' + name);
  if (tab) { tab.classList.remove('hidden'); tab.classList.add('active'); }
  const btn = document.querySelector(`.nav-item[data-tab="${name}"]`);
  if (btn) btn.classList.add('active');
  const backBtn = $('cab-back');
  if (backBtn) backBtn.classList.toggle('hidden', name === 'home');
  if (name === 'notifications') markNotificationsAsRead();
}
document.querySelectorAll('[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});
$('cab-back')?.addEventListener('click', () => showTab('home'));

/* ══ Logout ══════════════════════════════════════ */
function signOut() {
  unregisterPushSubscription().finally(() => {
    clearToken();
    location.reload();
  });
}
$('logout-btn').addEventListener('click', signOut);
$('signout-btn')?.addEventListener('click', signOut);

/* ══ Dashboard loader ════════════════════════════ */
async function loadDashboard() {
  showTab('home');
  await Promise.allSettled([loadProfile(), loadBookings(), loadNotifications()]);
  buildCabinetOrbital();
}

/* ══ Orbital nav config ══════════════════════════ */
let _orbital = null;
const ICONS = {
  bookings:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  newBooking: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  bell:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  user:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  medal:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="15" r="6"/><path d="M8 9L5 2h14l-3 7"/><path d="M12 13v4M10 15h4"/></svg>`,
  aftercare:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21l8.84-8.61a5.5 5.5 0 000-7.78z"/></svg>`,
};

function buildCabinetOrbital() {
  const mount = $('cab-orbital');
  if (!mount) return;

  const profile = window._cabinetProfile || {};
  const name = profile.name || localStorage.getItem(NAME_KEY) || '?';
  const visits = profile.visit_count || 0;
  const upcoming = Number($('stat-upcoming')?.textContent || 0) || 0;
  const total = Number($('stat-total')?.textContent || 0) || 0;
  const done = Number($('stat-done')?.textContent || 0) || 0;
  const unreadBadgeEl = $('notif-badge');
  const unread = unreadBadgeEl && !unreadBadgeEl.classList.contains('hidden')
    ? Number(unreadBadgeEl.textContent || 0) : 0;

  const tier = tierFor(visits);
  const nextText = tier.next
    ? `До «${tier.next.label}» осталось ${tier.remain} визит${pluralVisit(tier.remain)}`
    : 'Максимальный уровень достигнут';

  const nbCard = $('next-booking-card');
  const nbDate = nbCard?.querySelector('.nb-date')?.textContent?.trim() || '';
  const nbTime = nbCard?.querySelector('.nb-time')?.textContent?.trim() || '';
  const nbStyle = nbCard?.querySelector('.nb-style')?.textContent?.trim() || '';
  const hasNext = !!nbDate;

  const nodes = [
    {
      id: 1, title: 'Записи', icon: ICONS.bookings,
      badge: upcoming ? String(upcoming) : '',
      status: upcoming ? 'in-progress' : 'pending',
      date: hasNext ? nbDate : '',
      content: hasNext
        ? `Ближайшая запись: ${nbDate}${nbTime ? ' · ' + nbTime : ''}${nbStyle && nbStyle !== '—' ? ' · ' + nbStyle : ''}.`
        : 'Предстоящих записей пока нет. Самое время запланировать следующий визит.',
      energy: Math.min(100, Math.round((upcoming / 3) * 100) || 0),
      energyLabel: 'Загрузка календаря',
      relatedIds: [2, 6],
      ctaLabel: 'Открыть записи',
      onActivate: () => showTab('bookings'),
    },
    {
      id: 2, title: 'Новая запись', icon: ICONS.newBooking,
      status: 'in-progress',
      content: 'Выбрать стиль, дату и время. Минимальная стоимость сеанса — 8 000 ₽.',
      relatedIds: [1], ctaLabel: 'Записаться', ctaHref: '/booking',
    },
    {
      id: 3, title: 'Уведомления', icon: ICONS.bell,
      badge: unread ? String(unread) : '',
      status: unread ? 'in-progress' : 'completed',
      content: unread
        ? `У вас ${unread} непрочитанное уведомление.`
        : 'Все уведомления прочитаны. Сюда приходят подтверждения и напоминания.',
      energy: unread ? 100 : 0,
      energyLabel: 'Непрочитано',
      relatedIds: [1], ctaLabel: 'Открыть уведомления',
      onActivate: () => showTab('notifications'),
    },
    {
      id: 4, title: 'Медали', icon: ICONS.medal,
      status: tier.current.id === 'legend' ? 'completed' : 'in-progress',
      date: tier.current.label,
      content: `${tier.current.benefit} ${nextText}.`,
      energy: tier.pct, energyLabel: 'Прогресс до следующего уровня',
      relatedIds: [1, 5], ctaLabel: 'Открыть профиль',
      onActivate: () => showTab('profile'),
    },
    {
      id: 5, title: 'Профиль', icon: ICONS.user, status: 'completed',
      content: `${name}. ${visits} визит${pluralVisit(visits)} всего · ${done} завершено · ${total} общих записей.`,
      energy: Math.min(100, Math.round((visits / 20) * 100)),
      energyLabel: 'Стаж клиента',
      relatedIds: [4], ctaLabel: 'Настройки аккаунта',
      onActivate: () => showTab('profile'),
    },
    {
      id: 6, title: 'Уход', icon: ICONS.aftercare, status: 'pending',
      content: 'Памятка по уходу за новой татуировкой: что делать в первые 24 часа, 2 недели и месяц.',
      relatedIds: [1], ctaLabel: 'Читать гайд', ctaHref: '/aftercare',
    },
  ];

  const initials = (name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)) || '?';
  const center = { type: 'initials', value: initials };

  if (_orbital) _orbital.destroy();
  _orbital = createOrbital(mount, {
    nodes, center, radius: 200, autoRotate: true,
    onHubClick: () => showTab('profile'),
    hint: 'Клик на узел — карточка раздела · Повторный клик — открыть раздел',
  });
}

/* ══ Profile + Loyalty + Medals ══════════════════ */
function setAvatar(name) {
  const initials = (name || '').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const initialsEl = $('acset-avatar-initials');
  const imgEl = $('acset-avatar-img');
  const container = $('acset-avatar');
  if (imgEl) imgEl.style.display = 'none';
  if (initialsEl) { initialsEl.textContent = initials; initialsEl.style.display = ''; }
  if (container) container.classList.remove('has-photo');
}

const MEDAL_LABELS = {
  first_visit:    'Первый визит',
  three_visits:   'Три визита',
  five_visits:    'Пять визитов',
  ten_visits:     'Десять визитов',
  twenty_visits:  'Двадцать визитов',
};

async function loadProfile() {
  const profile = await api('/profile');
  window._cabinetProfile = profile;
  localStorage.setItem(NAME_KEY, profile.name);

  const visits = profile.visit_count || 0;
  setAvatar(profile.name);

  if ($('p-name'))  $('p-name').value  = profile.name;
  if ($('p-phone')) $('p-phone').value = profile.phone || '';
  if ($('p-email')) $('p-email').value = profile.email || '';

  // Loyalty + Medals
  const tierInfo = tierFor(visits);
  const tierBadge = $('acset-tier-badge');
  if (tierBadge) tierBadge.textContent = tierInfo.current.label;

  const tierHint = $('acset-tier-hint');
  if (tierHint) {
    tierHint.textContent = tierInfo.next
      ? `До «${tierInfo.next.label}»: ${tierInfo.remain} визит${pluralVisit(tierInfo.remain)}`
      : 'Максимальный уровень';
  }

  const pgcVisits = $('pgc-visits');
  if (pgcVisits) pgcVisits.textContent = visits;

  const tierVisits = $('acset-tier-visits');
  if (tierVisits) tierVisits.textContent = tierInfo.next ? tierInfo.remain : '∞';

  const nextTierLabel = $('acset-next-tier-label');
  if (nextTierLabel) nextTierLabel.textContent = tierInfo.next ? 'До следующего уровня' : 'Визитов всего';

  const loyaltyFill = $('loyalty-fill');
  if (loyaltyFill) loyaltyFill.style.width = tierInfo.pct + '%';
  const tierLabelEl = $('loyalty-tier-label');
  if (tierLabelEl) tierLabelEl.textContent = tierInfo.current.label;
  const progressEl = $('loyalty-progress-label');
  if (progressEl) {
    progressEl.textContent = tierInfo.next
      ? `${visits} / ${tierInfo.next.threshold} визитов`
      : 'Максимальный уровень';
  }

  // Medals (4-tier visualization)
  const earnedSet = new Set(profile.loyalty?.medals || []);
  const MEDAL_VIZ = [
    { id: 'first_visit',  domId: 'medal-bronze' },
    { id: 'three_visits', domId: 'medal-silver' },
    { id: 'five_visits',  domId: 'medal-gold' },
    { id: 'ten_visits',   domId: 'medal-platinum' },
  ];
  let activeFound = false;
  MEDAL_VIZ.forEach((m) => {
    const el = $(m.domId);
    if (!el) return;
    el.classList.remove('earned', 'active', 'locked');
    if (earnedSet.has(m.id)) { el.classList.add('earned'); }
    else if (!activeFound) { el.classList.add('active'); activeFound = true; }
    else { el.classList.add('locked'); }
  });
  const visitsEl = $('medals-visits-text');
  const nextEl = $('medals-next-text');
  const fillEl = $('medals-fill');
  if (visitsEl) visitsEl.textContent = `${visits} визит${pluralVisit(visits)}`;
  if (nextEl) nextEl.textContent = tierInfo.next
    ? `До «${tierInfo.next.label}»: ${tierInfo.remain} визит${pluralVisit(tierInfo.remain)}`
    : 'Максимальный уровень';
  if (fillEl) fillEl.style.width = tierInfo.pct + '%';
}

/* ══ Profile forms ═══════════════════════════════ */
$('name-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('p-name').value.trim();
  if (!name) return;
  try {
    await api('/profile', { method: 'PATCH', body: JSON.stringify({ name }) });
    if (window._cabinetProfile) window._cabinetProfile.name = name;
    localStorage.setItem(NAME_KEY, name);
    setAvatar(name);
    showToast('Имя сохранено');
  } catch (err) { showToast(err.message, 'err'); }
});

$('phone-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const raw = $('p-phone').value.trim();
  const phone = raw ? formatPhone(raw) : '';
  if (!phone) return showToast('Введите телефон', 'err');
  try {
    await api('/profile', { method: 'PATCH', body: JSON.stringify({ phone }) });
    if (window._cabinetProfile) window._cabinetProfile.phone = phone;
    showToast('Телефон сохранён');
  } catch (err) { showToast(err.message, 'err'); }
});

$('pw-change-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const current = $('pw-current').value;
  const pw = $('pw-new').value;
  const confirm = $('pw-confirm').value;
  const btn = e.submitter;
  if (!current) return showToast('Введите текущий пароль', 'err');
  if (pw.length < 8) return showToast('Новый пароль — минимум 8 символов', 'err');
  if (!/[A-Za-zА-Яа-я]/.test(pw) || !/\d/.test(pw)) return showToast('Пароль должен содержать буквы и цифры', 'err');
  if (pw !== confirm) return showToast('Пароли не совпадают', 'err');
  if (pw === current) return showToast('Новый пароль совпадает с текущим', 'err');

  if (btn) { btn.disabled = true; btn.textContent = 'Проверка...'; }
  try {
    await api('/profile', {
      method: 'PATCH',
      body: JSON.stringify({ password: current, newPassword: pw }),
    });
    $('pw-current').value = '';
    $('pw-new').value = '';
    $('pw-confirm').value = '';
    showToast('Пароль успешно обновлён');
  } catch (err) {
    showToast(err.message, 'err');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Обновить пароль'; }
  }
});

/* ══ Bookings ════════════════════════════════════ */
function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatCreatedAt(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_RU = { new: 'Новая', confirmed: 'Подтверждена', done: 'Завершена', cancelled: 'Отменена' };

async function loadBookings() {
  let data;
  try { data = await api('/bookings'); } catch { return; }
  const bookings = data.bookings || [];
  window._allBookings = bookings;

  const now = todayLocal();
  const upcoming = bookings.filter((b) => b.date >= now && b.status !== 'cancelled');
  const done = bookings.filter((b) => b.status === 'done');

  if ($('stat-upcoming')) $('stat-upcoming').textContent = upcoming.length;
  if ($('stat-total'))    $('stat-total').textContent    = bookings.length;
  if ($('stat-done'))     $('stat-done').textContent     = done.length;

  const pgcUpcoming = $('pgc-upcoming-count');
  if (pgcUpcoming) pgcUpcoming.textContent = upcoming.length;

  const next = upcoming[upcoming.length - 1] || upcoming[0];
  const nbCard = $('next-booking-card');
  $('next-booking-skeleton')?.remove();
  if (nbCard) {
    if (next) {
      const d = new Date(next.date + 'T00:00');
      nbCard.innerHTML = '';
      const dateEl = document.createElement('div');
      dateEl.className = 'nb-date';
      dateEl.textContent = d.toLocaleDateString('ru', { day: 'numeric', month: 'long' });
      const timeEl = document.createElement('div');
      timeEl.className = 'nb-time';
      timeEl.textContent = next.time_slot || '';
      const styleEl = document.createElement('div');
      styleEl.className = 'nb-style';
      styleEl.textContent = next.style || '—';
      nbCard.appendChild(dateEl);
      nbCard.appendChild(timeEl);
      nbCard.appendChild(styleEl);
    } else {
      nbCard.innerHTML = '<p class="next-booking-empty">Нет предстоящих записей</p>';
    }
  }

  renderBookings('upcoming');
}

function renderBookings(filter) {
  const now = todayLocal();
  const all = window._allBookings || [];
  const filtered =
    filter === 'upcoming' ? all.filter((b) => b.date >= now && b.status !== 'cancelled') :
    filter === 'past'     ? all.filter((b) => b.date < now || b.status === 'done') :
    all;

  const list = $('bookings-list');
  if (!list) return;
  list.innerHTML = '';
  if (!filtered.length) {
    list.innerHTML = '<p style="color:var(--muted);font-size:.9rem">Нет записей</p>';
    return;
  }

  filtered.forEach((b) => {
    const d = new Date(b.date + 'T00:00');
    const card = document.createElement('div');
    card.className = 'booking-card';
    const canCancel = b.status === 'new' || b.status === 'confirmed';
    const phoneClean = (b.phone || '').replace(/\s+/g, '');
    const desc = b.description || '';
    const created = b.created_at;

    card.innerHTML =
      `<div class="booking-card__header">
         <div class="booking-card__left">
           <div class="booking-card__date">${d.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
           <div class="booking-card__time">${escapeHtml(b.time_slot || '')}</div>
           <div class="booking-card__style">${escapeHtml(b.style || '—')}</div>
         </div>
         <div class="booking-card__actions">
           <span class="status-badge ${escapeHtml(b.status)}">${STATUS_RU[b.status] || escapeHtml(b.status)}</span>
           ${canCancel ? `<button class="btn-cancel" data-id="${escapeHtml(b.id)}">Отменить</button>` : ''}
         </div>
       </div>
       ${(b.name || b.phone)
        ? `<div class="booking-card__contact">
             ${b.name ? `<span>${escapeHtml(b.name)}</span>` : ''}
             ${b.phone ? `<a href="tel:${escapeHtml(phoneClean)}">${escapeHtml(b.phone)}</a>` : ''}
           </div>` : ''}
       ${desc ? `<div class="booking-card__notes">${escapeHtml(desc)}</div>` : ''}
       ${created ? `<div class="booking-card__created">Создана ${escapeHtml(formatCreatedAt(created))}</div>` : ''}`;

    list.appendChild(card);
  });

  list.querySelectorAll('.btn-cancel').forEach((btn) => {
    btn.addEventListener('click', () => openCancelModal(btn.dataset.id));
  });
}

document.querySelectorAll('.pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    renderBookings(pill.dataset.filter);
  });
});

/* ══ Cancel booking modal ════════════════════════ */
let cancelBookingId = null;
function openCancelModal(id) {
  cancelBookingId = id;
  $('cancel-modal').classList.remove('hidden');
  const reason = $('cancel-reason'); if (reason) reason.value = '';
}
$('cancel-modal-close').addEventListener('click', () => {
  $('cancel-modal').classList.add('hidden');
  cancelBookingId = null;
});
$('cancel-confirm').addEventListener('click', async () => {
  if (!cancelBookingId) return;
  try {
    await api(`/bookings/${encodeURIComponent(cancelBookingId)}/cancel`, { method: 'POST' });
    $('cancel-modal').classList.add('hidden');
    cancelBookingId = null;
    showToast('Запись отменена');
    await loadBookings();
    buildCabinetOrbital();
  } catch (err) { showToast(err.message, 'err'); }
});

/* ══ Notifications ═══════════════════════════════ */
async function loadNotifications() {
  let data;
  try { data = await api('/notifications'); } catch { return; }
  const items = data.notifications || [];
  const list = $('notif-list');
  if (!list) return;
  list.innerHTML = '';

  if (!items.length) {
    list.innerHTML = '<p style="color:var(--muted);font-size:.9rem;padding:1rem 0">Уведомлений пока нет</p>';
  }
  items.forEach((n) => {
    const item = document.createElement('div');
    item.className = 'notif-item' + (n.is_read ? '' : ' unread');
    item.innerHTML =
      `<div class="notif-dot ${n.is_read ? 'read' : ''}"></div>
       <div class="notif-body">
         <div class="notif-text">${escapeHtml(n.message)}</div>
         <div class="notif-time">${escapeHtml(formatCreatedAt(n.created_at))}</div>
       </div>`;
    list.appendChild(item);
  });

  const badge = $('notif-badge');
  const unread = data.unread || 0;
  if (badge) {
    if (unread > 0) { badge.textContent = unread; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  }

  const markBtn = $('mark-all-read');
  if (markBtn) markBtn.onclick = markNotificationsAsRead;
}

async function markNotificationsAsRead() {
  try {
    await api('/notifications/read', { method: 'POST' });
    await loadNotifications();
    buildCabinetOrbital();
  } catch {}
}

/* ══ Push notifications subscription ═════════════ */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

async function setupPushSubscription() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!getToken()) return;

    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const { publicKey } = await api('/push/vapid-key');
    if (!publicKey) return;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    await api('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(sub.toJSON()),
    });
  } catch (e) {
    console.warn('[push] subscription setup failed:', e?.message);
  }
}

async function unregisterPushSubscription() {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api('/push/unsubscribe', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
      await sub.unsubscribe();
    }
  } catch {}
}

/* ══ Notification polling (every 20s) ════════════ */
let _notifTimer = null;
function startNotifPolling() {
  if (_notifTimer) return;
  _notifTimer = setInterval(() => {
    if (!getToken()) return;
    loadNotifications().catch(() => {});
  }, 20000);
}

/* ══ Bootstrap ═══════════════════════════════════ */
(async function init() {
  if (getToken()) {
    showApp();
    try {
      await loadDashboard();
      setupPushSubscription();
      startNotifPolling();
    } catch (err) {
      console.error('Dashboard error:', err);
      showAuth();
    }
  } else {
    showAuth();
  }
})();
