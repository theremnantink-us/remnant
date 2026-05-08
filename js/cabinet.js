// js/cabinet.js
import { supabase } from './supabase-config.js';
import { createOrbital } from './orbital-nav.js';

/* ══ Loyalty tiers (frontend source of truth) ═════ */
const LOYALTY_TIERS = [
  { id: 'novice',   label: 'Новичок', threshold: 0,  benefit: 'Добро пожаловать. Первая консультация бесплатно.' },
  { id: 'bronze',   label: 'Бронза',  threshold: 1,  benefit: 'Персональная карта клиента и доступ к закрытым анонсам.' },
  { id: 'silver',   label: 'Серебро', threshold: 3,  benefit: 'Скидка 5% на следующий сеанс и приоритетная запись.' },
  { id: 'gold',     label: 'Золото',  threshold: 5,  benefit: 'Скидка 10% и поздравительный подарок от студии.' },
  { id: 'platinum', label: 'Платина', threshold: 10, benefit: 'Скидка 15%, бесплатная коррекция в первый год.' },
  { id: 'legend',   label: 'Легенда', threshold: 20, benefit: 'Скидка 20% и персональный эксклюзивный дизайн.' },
];
function computeTier(visits) {
  let cur = LOYALTY_TIERS[0], next = LOYALTY_TIERS[1] || null, idx = 0;
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (visits >= LOYALTY_TIERS[i].threshold) { cur = LOYALTY_TIERS[i]; idx = i; break; }
  }
  next = LOYALTY_TIERS[idx + 1] || null;
  const from = cur.threshold;
  const to = next ? next.threshold : cur.threshold;
  const pct = next ? Math.min(100, Math.round(((visits - from) / (to - from)) * 100)) : 100;
  const remain = next ? Math.max(0, to - visits) : 0;
  return { current: cur, next, idx, pct, remain };
}

/* ══ Tab routing ══════════════════════════════════ */
function showTab(name) {
  document.querySelectorAll('.cab-tab').forEach(t => {
    t.classList.remove('active');
    t.classList.add('hidden');
  });
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const tab = document.getElementById('tab-' + name);
  if (tab) { tab.classList.remove('hidden'); tab.classList.add('active'); }
  const btn = document.querySelector(`.nav-item[data-tab="${name}"]`);
  if (btn) btn.classList.add('active');
  const backBtn = document.getElementById('cab-back');
  if (backBtn) backBtn.classList.toggle('hidden', name === 'home');
}

/* ══ Screen helpers ═══════════════════════════════ */
function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
}
function showAuth() {
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
}
function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}

/* ══ Toast ════════════════════════════════════════ */
function showToast(msg, type = 'ok') {
  let toast = document.getElementById('cab-toast');
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

/* ══ Phone formatter ══════════════════════════════ */
function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('8') && digits.length === 11) return '+7' + digits.slice(1);
  if (digits.startsWith('7') && digits.length === 11) return '+' + digits;
  if (digits.length === 10) return '+7' + digits;
  return '+' + digits;
}

/* ══ Phone mask ══════════════════════════════════ */
function applyPhoneMask(input) {
  if (!input) return;
  input.addEventListener('focus', () => {
    if (!input.value) input.value = '+7 (';
  });
  input.addEventListener('input', () => {
    const raw    = input.value.replace(/\D/g, '');
    let digits   = raw.startsWith('7') ? raw.slice(1) : (raw.startsWith('8') ? raw.slice(1) : raw);
    if (digits.length > 10) digits = digits.slice(0, 10);
    let f = '+7 (';
    if (digits.length > 0) f += digits.slice(0, 3);
    if (digits.length >= 4) f += ') ' + digits.slice(3, 6);
    if (digits.length >= 7) f += '-' + digits.slice(6, 8);
    if (digits.length >= 9) f += '-' + digits.slice(8, 10);
    input.value = f;
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && input.value.length <= 4) {
      e.preventDefault();
      input.value = '+7 (';
    }
  });
  input.addEventListener('blur', () => {
    if (input.value === '+7 (' || input.value === '+7') input.value = '';
  });
}
applyPhoneMask(document.getElementById('reg-phone'));
applyPhoneMask(document.getElementById('p-phone'));

/* ══ Password toggle ═════════════════════════════ */
document.querySelectorAll('.pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.for);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});

/* ══ Auth tab switch ══════════════════════════════ */
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab + '-form').classList.add('active');
    clearErrors();
  });
});

/* ══ Login ════════════════════════════════════════ */
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  clearErrors();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('login-btn');
  btn.disabled   = true;
  btn.textContent = 'Вход...';

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setError('login-error', 'Неверный email или пароль');
    btn.disabled = false;
    btn.textContent = 'Войти';
  }
});

/* ══ Register ═════════════════════════════════════ */
document.getElementById('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  clearErrors();
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const rawPhone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const phone    = rawPhone ? formatPhone(rawPhone) : '';
  const btn      = document.getElementById('reg-btn');

  if (!name)               return setError('reg-error', 'Введите имя');
  if (!email)              return setError('reg-error', 'Введите email');
  if (!rawPhone || rawPhone.replace(/\D/g, '').length < 10)
                           return setError('reg-error', 'Введите телефон');
  if (password.length < 6) return setError('reg-error', 'Пароль минимум 6 символов');

  btn.disabled = true; btn.textContent = 'Создаём...';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });

  if (error) {
    setError('reg-error', error.message === 'User already registered'
      ? 'Этот email уже зарегистрирован'
      : error.message);
    btn.disabled = false; btn.textContent = 'Создать аккаунт';
    return;
  }

  if (data.user) {
    await supabase.from('profiles').upsert({ id: data.user.id, name, phone });
  }
});

/* ══ Nav tab clicks ═══════════════════════════════ */
document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});
document.getElementById('cab-back')?.addEventListener('click', () => showTab('home'));
function signOut() {
  localStorage.removeItem('remnant_avatar_url');
  localStorage.removeItem('remnant_user_name');
  supabase.auth.signOut();
}
document.getElementById('logout-btn').addEventListener('click', signOut);
document.getElementById('signout-btn').addEventListener('click', signOut);

/* ══ Auth state listener ══════════════════════════ */
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    showApp();
    loadDashboard(session.user);
  } else {
    showAuth();
  }
});

supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) { showApp(); loadDashboard(session.user); }
  else showAuth();
});

/* ══ Dashboard loader ═════════════════════════════ */
async function loadDashboard(user) {
  showTab('home');
  await Promise.allSettled([
    loadProfile(user),
    loadBookings(user.id),
    loadNotifications(user.id),
  ]);
  buildCabinetOrbital();
}

/* ══ Orbital navigation ═══════════════════════════ */
let _orbital = null;
const ICONS = {
  bookings:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  newBooking:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  bell:         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  user:         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  medal:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="15" r="6"/><path d="M8 9L5 2h14l-3 7"/><path d="M12 13v4M10 15h4"/></svg>`,
  aftercare:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21l8.84-8.61a5.5 5.5 0 000-7.78z"/></svg>`,
  // admin
  dashboard:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  schedule:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  analytics:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  users:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
};

function buildCabinetOrbital() {
  const mount = document.getElementById('cab-orbital');
  if (!mount) return;

  const profile = window._cabinetProfile || {};
  const name = profile.name || localStorage.getItem('remnant_user_name') || '?';
  const avatarUrl = profile.avatar_url || localStorage.getItem('remnant_avatar_url') || '';
  const visits = profile.visit_count || 0;
  const upcoming = Number(document.getElementById('stat-upcoming')?.textContent || 0) || 0;
  const total = Number(document.getElementById('stat-total')?.textContent || 0) || 0;
  const done = Number(document.getElementById('stat-done')?.textContent || 0) || 0;
  const unreadBadgeEl = document.getElementById('notif-badge');
  const unread = unreadBadgeEl && !unreadBadgeEl.classList.contains('hidden')
    ? Number(unreadBadgeEl.textContent || 0) : 0;

  const tier = computeTier(visits);
  const nextText = tier.next
    ? `До «${tier.next.label}» осталось ${tier.remain} визит${pluralVisit(tier.remain)}`
    : 'Максимальный уровень достигнут';

  // Next booking
  const nbCard = document.getElementById('next-booking-card');
  const nbDate = nbCard?.querySelector('.nb-date')?.textContent?.trim() || '';
  const nbTime = nbCard?.querySelector('.nb-time')?.textContent?.trim() || '';
  const nbStyle = nbCard?.querySelector('.nb-style')?.textContent?.trim() || '';
  const hasNext = !!nbDate;

  const nodes = [
    {
      id: 1,
      title: 'Записи',
      icon: ICONS.bookings,
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
      id: 2,
      title: 'Новая запись',
      icon: ICONS.newBooking,
      status: 'in-progress',
      date: '',
      content: 'Выбрать стиль, дату и время. Минимальная стоимость сеанса — 8 000 ₽.',
      relatedIds: [1],
      ctaLabel: 'Записаться',
      ctaHref: '/booking',
    },
    {
      id: 3,
      title: 'Уведомления',
      icon: ICONS.bell,
      badge: unread ? String(unread) : '',
      status: unread ? 'in-progress' : 'completed',
      date: '',
      content: unread
        ? `У вас ${unread} непрочитанное уведомление. Откройте, чтобы просмотреть статус записей.`
        : 'Все уведомления прочитаны. Сюда приходят подтверждения и напоминания.',
      energy: unread ? 100 : 0,
      energyLabel: 'Непрочитано',
      relatedIds: [1],
      ctaLabel: 'Открыть уведомления',
      onActivate: () => showTab('notifications'),
    },
    {
      id: 4,
      title: 'Медали',
      icon: ICONS.medal,
      status: tier.current.id === 'legend' ? 'completed' : 'in-progress',
      date: tier.current.label,
      content: `${tier.current.benefit} ${nextText}.`,
      energy: tier.pct,
      energyLabel: 'Прогресс до следующего уровня',
      relatedIds: [1, 5],
      ctaLabel: 'Открыть медали',
      onActivate: () => showTab('medals'),
    },
    {
      id: 5,
      title: 'Профиль',
      icon: ICONS.user,
      status: 'completed',
      date: '',
      content: `${name}. ${visits} визит${pluralVisit(visits)} всего · ${done} завершено · ${total} общих записей.`,
      energy: Math.min(100, Math.round((visits / 20) * 100)),
      energyLabel: 'Стаж клиента',
      relatedIds: [4],
      ctaLabel: 'Настройки аккаунта',
      onActivate: () => showTab('profile'),
    },
    {
      id: 6,
      title: 'Уход',
      icon: ICONS.aftercare,
      status: 'pending',
      date: '',
      content: 'Памятка по уходу за новой татуировкой: что делать в первые 24 часа, 2 недели и месяц.',
      relatedIds: [1],
      ctaLabel: 'Читать гайд',
      ctaHref: '/aftercare',
    },
  ];

  const initials = (name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)) || '?';
  const center = avatarUrl
    ? { type: 'image', value: avatarUrl }
    : { type: 'initials', value: initials };

  if (_orbital) _orbital.destroy();
  _orbital = createOrbital(mount, {
    nodes,
    center,
    radius: 200,
    autoRotate: true,
    onHubClick: () => showTab('profile'),
    hint: 'Клик на узел — карточка раздела · Повторный клик — открыть раздел',
  });
}

function pluralVisit(n) {
  const r = n % 10, r100 = n % 100;
  if (r === 1 && r100 !== 11) return '';
  if (r >= 2 && r <= 4 && !(r100 >= 12 && r100 <= 14)) return 'а';
  return 'ов';
}

/* ══ Avatar helpers ═══════════════════════════════ */
function setAvatar(name, avatarUrl) {
  const initials  = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const initialsEl = document.getElementById('acset-avatar-initials');
  const imgEl      = document.getElementById('acset-avatar-img');
  const container  = document.getElementById('acset-avatar');

  if (avatarUrl) {
    if (imgEl)      { imgEl.src = avatarUrl; imgEl.style.display = 'block'; }
    if (initialsEl) initialsEl.style.display = 'none';
    if (container)  container.classList.add('has-photo');
  } else {
    if (imgEl)      imgEl.style.display = 'none';
    if (initialsEl) { initialsEl.textContent = initials; initialsEl.style.display = ''; }
    if (container)  container.classList.remove('has-photo');
  }
}

/* ══ Profile ══════════════════════════════════════ */
async function loadProfile(user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, phone, visit_count, loyalty_tier, avatar_url')
    .eq('id', user.id)
    .single();

  const name = profile?.name || user.email?.split('@')[0] || '?';
  const visits = profile?.visit_count || 0;

  // ── Medals (4-tier: bronze/silver/gold/platinum) ──────────
  const MEDALS = [
    { id: 'bronze',   threshold: 1,  toNext: 'бронзы'  },
    { id: 'silver',   threshold: 3,  toNext: 'серебра' },
    { id: 'gold',     threshold: 5,  toNext: 'золота'  },
    { id: 'platinum', threshold: 10, toNext: null       },
  ];
  function pluralVisit(n) {
    const r = n % 10, r100 = n % 100;
    if (r === 1 && r100 !== 11) return '';
    if (r >= 2 && r <= 4 && !(r100 >= 12 && r100 <= 14)) return 'а';
    return 'ов';
  }
  let tierIdx = -1;
  for (let i = MEDALS.length - 1; i >= 0; i--) {
    if (visits >= MEDALS[i].threshold) { tierIdx = i; break; }
  }
  MEDALS.forEach((medal, i) => {
    const el = document.getElementById('medal-' + medal.id);
    if (!el) return;
    el.classList.remove('earned', 'active', 'locked');
    if (i < tierIdx)      el.classList.add('earned');
    else if (i === tierIdx) el.classList.add('active');
    else                  el.classList.add('locked');
  });
  const nextIdx = tierIdx + 1;
  const from = tierIdx >= 0 ? MEDALS[tierIdx].threshold : 0;
  let medalPct = 0, medalNextText = '';
  if (nextIdx < MEDALS.length) {
    const to = MEDALS[nextIdx].threshold;
    medalPct = Math.min(100, ((visits - from) / (to - from)) * 100);
    const rem = to - visits;
    medalNextText = `До ${MEDALS[nextIdx].toNext}: ${rem} визит${pluralVisit(rem)}`;
  } else {
    medalPct = 100;
    medalNextText = 'Максимальный уровень';
  }
  const visitsEl = document.getElementById('medals-visits-text');
  const nextEl   = document.getElementById('medals-next-text');
  const fillEl   = document.getElementById('medals-fill');
  if (visitsEl) visitsEl.textContent = `${visits} визит${pluralVisit(visits)}`;
  if (nextEl)   nextEl.textContent   = medalNextText;
  if (fillEl)   fillEl.style.width   = medalPct + '%';

  // Avatar
  const avatarUrl = profile?.avatar_url || null;
  setAvatar(name, avatarUrl);

  // Cache for other pages (nav avatar)
  localStorage.setItem('remnant_user_name', name);
  if (avatarUrl) localStorage.setItem('remnant_avatar_url', avatarUrl);
  else localStorage.removeItem('remnant_avatar_url');

  // Profile tab fields
  const nameEl  = document.getElementById('p-name');
  const phoneEl = document.getElementById('p-phone');
  const emailEl = document.getElementById('p-email');
  if (nameEl)  nameEl.value  = name;
  if (phoneEl) phoneEl.value = profile?.phone || '';
  if (emailEl) emailEl.value = user.email || '';

  // Tier badge (uses 6-tier loyalty system)
  const tierInfo = computeTier(visits);
  const tierBadge = document.getElementById('acset-tier-badge');
  if (tierBadge) tierBadge.textContent = tierInfo.current.label;

  const tierHint = document.getElementById('acset-tier-hint');
  if (tierHint) {
    tierHint.textContent = tierInfo.next
      ? `До «${tierInfo.next.label}»: ${tierInfo.remain} визит${pluralVisit(tierInfo.remain)}`
      : 'Максимальный уровень';
  }

  // Stats in profile footer
  const pgcVisits = document.getElementById('pgc-visits');
  if (pgcVisits) pgcVisits.textContent = visits;

  const tierVisits = document.getElementById('acset-tier-visits');
  if (tierVisits) tierVisits.textContent = tierInfo.next ? tierInfo.remain : '∞';

  const nextTierLabel = document.getElementById('acset-next-tier-label');
  if (nextTierLabel) {
    nextTierLabel.textContent = tierInfo.next ? 'До следующего уровня' : 'Визитов всего';
  }

  // Loyalty bar (home tab, if present)
  const loyaltyFill = document.getElementById('loyalty-fill');
  if (loyaltyFill) loyaltyFill.style.width = tierInfo.pct + '%';
  const tierLabelEl = document.getElementById('loyalty-tier-label');
  if (tierLabelEl) tierLabelEl.textContent = tierInfo.current.label;
  const progressEl = document.getElementById('loyalty-progress-label');
  if (progressEl) {
    progressEl.textContent = tierInfo.next
      ? `${visits} / ${tierInfo.next.threshold} визитов`
      : 'Максимальный уровень';
  }

  // Store user for form handlers
  window._cabinetUser = user;
  window._cabinetProfile = profile;
}

/* ══ Name form ════════════════════════════════════ */
document.getElementById('name-form').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('p-name').value.trim();
  if (!name) return;
  const user = window._cabinetUser;
  if (!user) return;

  const { error } = await supabase.from('profiles')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) { showToast('Ошибка сохранения', 'err'); return; }

  setAvatar(name, window._cabinetProfile?.avatar_url || null);
  if (window._cabinetProfile) window._cabinetProfile.name = name;
  showToast('Имя сохранено');
});

/* ══ Phone form ═══════════════════════════════════ */
document.getElementById('phone-form').addEventListener('submit', async e => {
  e.preventDefault();
  const raw = document.getElementById('p-phone').value.trim();
  const phone = raw ? formatPhone(raw) : null;
  const user = window._cabinetUser;
  if (!user) return;

  const { error } = await supabase.from('profiles')
    .update({ phone, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) { showToast('Ошибка сохранения', 'err'); return; }

  if (window._cabinetProfile) window._cabinetProfile.phone = phone;
  showToast('Телефон сохранён');
});

/* ══ Password change ══════════════════════════════ */
document.getElementById('pw-change-form').addEventListener('submit', async e => {
  e.preventDefault();
  const current = document.getElementById('pw-current').value;
  const pw      = document.getElementById('pw-new').value;
  const confirm = document.getElementById('pw-confirm').value;
  const btn     = e.submitter;

  if (!current)          { showToast('Введите текущий пароль', 'err'); return; }
  if (pw.length < 6)     { showToast('Новый пароль — минимум 6 символов', 'err'); return; }
  if (pw !== confirm)    { showToast('Пароли не совпадают', 'err'); return; }
  if (pw === current)    { showToast('Новый пароль совпадает с текущим', 'err'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Проверка...'; }

  // Re-authenticate with current password to verify it
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email;
  const { error: verifyErr } = await supabase.auth.signInWithPassword({ email, password: current });

  if (verifyErr) {
    if (btn) { btn.disabled = false; btn.textContent = 'Обновить пароль'; }
    showToast('Неверный текущий пароль', 'err');
    return;
  }

  const { error } = await supabase.auth.updateUser({ password: pw });
  if (btn) { btn.disabled = false; btn.textContent = 'Обновить пароль'; }
  if (error) { showToast('Ошибка обновления пароля', 'err'); return; }

  document.getElementById('pw-current').value = '';
  document.getElementById('pw-new').value = '';
  document.getElementById('pw-confirm').value = '';
  showToast('Пароль успешно обновлён');
});

/* ══ Avatar upload ════════════════════════════════ */
const avatarWrap  = document.getElementById('acset-avatar-wrap');
const avatarInput = document.getElementById('avatar-file-input');

if (avatarWrap && avatarInput) {
  avatarWrap.addEventListener('click', () => avatarInput.click());

  avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files?.[0];
    if (!file) return;
    const user = window._cabinetUser;
    if (!user) return;

    // Validate
    if (!file.type.startsWith('image/')) { showToast('Только изображения', 'err'); return; }
    if (file.size > 5 * 1024 * 1024)     { showToast('Файл слишком большой (макс 5 МБ)', 'err'); return; }

    // Show immediate preview
    const localUrl = URL.createObjectURL(file);
    setAvatar('', localUrl);

    const ext  = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) {
      showToast('Ошибка загрузки', 'err');
      // Revert
      setAvatar(window._cabinetProfile?.name || '', window._cabinetProfile?.avatar_url || null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    // Store clean URL in DB (no timestamp), use cache-bust only for immediate display
    const displayUrl = publicUrl + '?v=' + Date.now();

    const { error: saveErr } = await supabase.from('profiles')
      .upsert({ id: user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() }, { onConflict: 'id' });

    if (saveErr) {
      showToast('Ошибка сохранения', 'err');
      setAvatar(window._cabinetProfile?.name || '', window._cabinetProfile?.avatar_url || null);
      return;
    }

    if (window._cabinetProfile) window._cabinetProfile.avatar_url = publicUrl;
    localStorage.setItem('remnant_avatar_url', publicUrl);
    setAvatar(window._cabinetProfile?.name || '', displayUrl);
    if (_orbital) _orbital.setCenter({ type: 'image', value: displayUrl });
    // Broadcast to other tabs/pages
    try { window.dispatchEvent(new CustomEvent('remnant:avatar', { detail: { url: publicUrl } })); } catch {}
    showToast('Аватар обновлён');
    avatarInput.value = '';
  });
}

/* ══ Bookings ═════════════════════════════════════ */
function todayLocal() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatCreatedAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' }) +
         ', ' + d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function loadBookings(userId) {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, date, time_slot, style, status, name, phone, reference_url, notes, created_at')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (!bookings) return;

  const now      = todayLocal();
  const upcoming = bookings.filter(b => b.date >= now && b.status !== 'cancelled');
  const done     = bookings.filter(b => b.status === 'done');

  document.getElementById('stat-upcoming').textContent = upcoming.length;
  document.getElementById('stat-total').textContent    = bookings.length;
  document.getElementById('stat-done').textContent     = done.length;

  const pgcUpcoming = document.getElementById('pgc-upcoming-count');
  if (pgcUpcoming) pgcUpcoming.textContent = upcoming.length;

  const next   = upcoming[0];
  const nbCard = document.getElementById('next-booking-card');
  document.getElementById('next-booking-skeleton')?.remove();
  if (next) {
    const d = new Date(next.date + 'T00:00');
    nbCard.innerHTML =
      `<div class="nb-date">${d.toLocaleDateString('ru', { day: 'numeric', month: 'long' })}</div>
       <div class="nb-time">${escapeHtml(next.time_slot || '')}</div>
       <div class="nb-style">${escapeHtml(next.style || '—')}</div>`;
  } else {
    nbCard.innerHTML = '<p class="next-booking-empty">Нет предстоящих записей</p>';
  }

  window._allBookings = bookings;
  renderBookings('upcoming');
}

const STATUS_RU = { new: 'Новая', confirmed: 'Подтверждена', done: 'Завершена', cancelled: 'Отменена' };

function renderBookings(filter) {
  const now      = todayLocal();
  const all      = window._allBookings || [];
  const filtered =
    filter === 'upcoming' ? all.filter(b => b.date >= now && b.status !== 'cancelled') :
    filter === 'past'     ? all.filter(b => b.date < now || b.status === 'done') :
    all;

  const list = document.getElementById('bookings-list');
  list.innerHTML = '';

  if (!filtered.length) {
    list.innerHTML = '<p style="color:var(--muted);font-size:.9rem">Нет записей</p>';
    return;
  }

  filtered.forEach(b => {
    const d    = new Date(b.date + 'T00:00');
    const card = document.createElement('div');
    card.className = 'booking-card';
    const canCancel = b.status === 'new' || b.status === 'confirmed';
    const phoneClean = (b.phone || '').replace(/\s+/g, '');

    const refBlock = b.reference_url
      ? `<img class="booking-card__ref-thumb"
              src="${escapeHtml(b.reference_url)}"
              alt="Референс"
              loading="lazy"
              data-ref="${escapeHtml(b.reference_url)}">`
      : '';

    const notesBlock = b.notes
      ? `<div class="booking-card__notes">${escapeHtml(b.notes)}</div>`
      : '';

    const contactBlock = (b.name || b.phone)
      ? `<div class="booking-card__contact">
           ${b.name ? `<span>${escapeHtml(b.name)}</span>` : ''}
           ${b.phone ? `<a href="tel:${escapeHtml(phoneClean)}">${escapeHtml(b.phone)}</a>` : ''}
         </div>`
      : '';

    const createdBlock = b.created_at
      ? `<div class="booking-card__created">Создана ${escapeHtml(formatCreatedAt(b.created_at))}</div>`
      : '';

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
       ${contactBlock}
       ${notesBlock}
       ${refBlock}
       ${createdBlock}`;
    list.appendChild(card);
  });

  list.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', () => openCancelModal(btn.dataset.id));
  });

  list.querySelectorAll('.booking-card__ref-thumb').forEach(img => {
    img.addEventListener('click', () => openRefLightbox(img.dataset.ref));
  });
}

/* ══ Reference lightbox ═══════════════════════════ */
function openRefLightbox(url) {
  if (!url) return;
  let overlay = document.getElementById('ref-lightbox');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ref-lightbox';
    overlay.className = 'ref-lightbox';
    overlay.innerHTML = `<img alt="Референс"><button class="ref-lightbox__close" aria-label="Закрыть" type="button">×</button>`;
    document.body.appendChild(overlay);
    const close = () => overlay.classList.remove('open');
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.ref-lightbox__close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }
  overlay.querySelector('img').src = url;
  overlay.classList.add('open');
}

document.querySelectorAll('.pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    renderBookings(pill.dataset.filter);
  });
});

/* ══ Notifications ════════════════════════════════ */
async function loadNotifications(userId) {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, date, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  const readKey = 'notif_read_' + userId;
  const read    = new Set(JSON.parse(localStorage.getItem(readKey) || '[]'));
  const list    = document.getElementById('notif-list');
  list.innerHTML = '';
  let unread = 0;

  (bookings || []).forEach(b => {
    const key    = b.id + '-' + b.status;
    const isRead = read.has(key);
    if (!isRead) unread++;
    const msg =
      b.status === 'confirmed' ? `Запись на ${b.date} подтверждена` :
      b.status === 'cancelled' ? `Запись на ${b.date} отменена` :
      `Запись на ${b.date} создана`;
    const item = document.createElement('div');
    item.className = 'notif-item' + (isRead ? '' : ' unread');
    item.innerHTML =
      `<div class="notif-dot ${isRead ? 'read' : ''}"></div>
       <div class="notif-body">
         <div class="notif-text">${msg}</div>
         <div class="notif-time">${new Date(b.created_at).toLocaleDateString('ru')}</div>
       </div>`;
    list.appendChild(item);
  });

  const badge = document.getElementById('notif-badge');
  if (unread > 0) { badge.textContent = unread; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');

  document.getElementById('mark-all-read').onclick = () => {
    const keys = (bookings || []).map(b => b.id + '-' + b.status);
    localStorage.setItem(readKey, JSON.stringify(keys));
    loadNotifications(userId);
  };
}

/* ══ Cancel modal ═════════════════════════════════ */
let cancelBookingId = null;

function openCancelModal(bookingId) {
  cancelBookingId = bookingId;
  document.getElementById('cancel-modal').classList.remove('hidden');
  document.getElementById('cancel-reason').value = '';
}

document.getElementById('cancel-modal-close').addEventListener('click', () => {
  document.getElementById('cancel-modal').classList.add('hidden');
  cancelBookingId = null;
});

document.getElementById('cancel-confirm').addEventListener('click', async () => {
  if (!cancelBookingId) return;
  const reason = document.getElementById('cancel-reason').value.trim();
  await supabase.from('bookings')
    .update({ status: 'cancelled', cancellation_reason: reason || null })
    .eq('id', cancelBookingId);
  document.getElementById('cancel-modal').classList.add('hidden');
  cancelBookingId = null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) loadBookings(session.user.id);
});
