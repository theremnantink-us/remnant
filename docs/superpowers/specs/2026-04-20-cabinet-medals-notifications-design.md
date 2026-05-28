# REMNANT — Cabinet: Medals Tab, Enriched Notifications, Empty States (Project C, 2026-04-20)

Три связанные UX-правки внутри клиентского кабинета: выделенный раздел с медалями и анимациями, раскрываемые карточки уведомлений с переходом на запись, осмысленные empty-state на табе «Записи».

## Goals

- Дать клиенту отдельный раздел «Медали» с визуализацией 4 уровней, прогресс-шкалой до следующего и анимациями на уровне «премиум-минимализм + wow».
- Показывать toast при получении нового уровня (один раз за апгрейд).
- Раскрывать уведомление inline с деталями записи и быстрым переходом в таб «Записи» с подсветкой нужной карточки.
- Заменить нынешнюю одностроковую «Нет записей» осмысленными empty-state с CTA на `/booking` там, где это уместно.

## Non-goals

- Отдельный HTML `medals.html` (обсуждалось, отклонено — делаем таб в кабинете).
- Миграции БД. Используем только существующие `profiles.visit_count` и `bookings`.
- Серверные notifications через таблицу `client_notifications` (она в Express/MySQL, фронт её не использует — см. session log от 2026-04-19).
- Админ-флоу для выставления «medal earned date» вручную.
- Обновление логики подсчёта `visit_count` (считается уже где-то — мы только читаем).

## Context

- Кабинет — single-page SPA внутри `cabinet.html` с табами (`home/bookings/notifications/profile`). Переключение через `showTab(name)` в `js/cabinet.js`.
- Данные медалей считаются в `loadProfile` (`js/cabinet.js:417`): массив `MEDALS` с порогами 1/3/5/10, `tierIdx` = текущий уровень, `medalPct` = прогресс до следующего.
- Массив `MEDALS` сейчас содержит только `{ id, threshold, toNext }`. В рамках этого спека **расширяется** до `{ id, threshold, toNext, name, benefit, svg }`, где `name` = «Бронза/Серебро/Золото/Платина», `benefit` = короткое описание (см. таблицу в Section 1.1), `svg` = строка SVG-иконки. Таблица benefits в HTML и тело toast тянут данные из одного источника — `MEDALS`.
- Скрытые якоря `#medal-bronze/silver/gold/platinum`, `#medals-visits-text`, `#medals-next-text`, `#medals-fill` в `cabinet.html:94-104` — наследие прошлой версии, использовать можно, но проще сделать новый таб и не трогать скрытые.
- Узел «Медали» в орбите (`cabinet.js:326-338`) сейчас ведёт на `showTab('profile')`. Перенаправим на `showTab('medals')`.
- Уведомления (`loadNotifications`, `cabinet.js:813`) агрегируются из `bookings` клиентом, `localStorage.notif_read_<userId>` хранит ключи `${id}-${status}` прочитанных.
- Empty state в `renderBookings` (`cabinet.js:722-725`) — одна строка `'Нет записей'` без CTA.

---

## Section 1 — Таб «Медали»

### 1.1 HTML (`cabinet.html`)

Новая секция после `#tab-notifications`:

```html
<section class="cab-tab hidden" id="tab-medals">
  <header class="medals-head">
    <h2>Медали</h2>
    <p class="medals-sub" id="medals-current-desc"></p>
  </header>

  <div class="medals-progress">
    <div class="medals-progress__labels">
      <span id="medals-visits-label"></span>
      <span id="medals-next-label"></span>
    </div>
    <div class="medals-progress__track">
      <div class="medals-progress__fill" id="medals-progress-fill"></div>
    </div>
  </div>

  <div class="medals-grid" id="medals-grid">
    <!-- 4 карточки генерируются JS-ом -->
  </div>

  <section class="medals-benefits">
    <h3>Как получить</h3>
    <table class="medals-benefits__table">
      <thead><tr><th>Уровень</th><th>Визитов</th><th>Бонус</th></tr></thead>
      <tbody>
        <tr><td>Бронза</td><td>1</td><td>Доступ к кабинету · напоминания</td></tr>
        <tr><td>Серебро</td><td>3</td><td>Приоритет брони в high-season</td></tr>
        <tr><td>Золото</td><td>5</td><td>Скидка 10% · расширенное окно записи</td></tr>
        <tr><td>Платина</td><td>10</td><td>Скидка 15% · приватные слоты</td></tr>
      </tbody>
    </table>
  </section>
</section>
```

Скрытые якоря из `cabinet.html:93-105` можно удалить — их цель была именно эту секцию когда-нибудь нарисовать.

### 1.2 Orbital nav (`js/cabinet.js`)

Узел «Медали» в `buildOrbitNodes` (`cabinet.js:326-338`): `onActivate: () => showTab('medals')` вместо `showTab('profile')`.

### 1.3 Карточка медали (структура)

Каждая карточка — flip-контейнер:

```html
<article class="medal-card medal-card--${state}" data-tier="${id}" aria-label="${name}">
  <div class="medal-card__inner">
    <div class="medal-card__front">
      <div class="medal-card__icon">${svg}</div>
      <div class="medal-card__name">${name}</div>
      <div class="medal-card__req">${threshold} визит${plural}</div>
    </div>
    <div class="medal-card__back">
      <div class="medal-card__date-label">${state === 'earned' || state === 'active' ? 'Получена' : 'Заблокировано'}</div>
      <div class="medal-card__date">${earnedDate || `осталось ${remaining}`}</div>
    </div>
  </div>
</article>
```

`state` ∈ `{earned, active, locked}`. SVG-иконки — простые медальки разных цветов в стиле существующих `ICONS.medal`.

### 1.4 Рендер функция `renderMedals(profile, doneDates)`

В `js/cabinet.js`, вызывается из `loadProfile` после вычисления `tierIdx`:

```js
async function renderMedals(profile, doneDates) {
  const visits = profile.visit_count || 0;
  // tierIdx, medalPct, medalNextText вычисляются как сейчас
  // doneDates[i] = ISO date of i-th completed booking

  document.getElementById('medals-visits-label').textContent = `${visits} визит${plural(visits)}`;
  document.getElementById('medals-next-label').textContent   = medalNextText;

  const grid = document.getElementById('medals-grid');
  grid.innerHTML = '';
  MEDALS.forEach((medal, i) => {
    const state = i < tierIdx ? 'earned'
                : i === tierIdx ? 'active'
                : 'locked';
    const earnedDate = doneDates[medal.threshold - 1] || null;
    const remaining  = medal.threshold - visits;
    grid.appendChild(buildMedalCard({ medal, state, earnedDate, remaining }));
  });

  animateMedalsIntro(grid);
  animateProgressFill(medalPct);
}

async function medalEarnedDates(userId) {
  const { data } = await supabase
    .from('bookings')
    .select('date')
    .eq('user_id', userId)
    .eq('status', 'done')
    .order('date', { ascending: true });
  return (data || []).map(b => b.date);
}
```

Вызов в `loadProfile`:
```js
const doneDates = await medalEarnedDates(user.id);
renderMedals(profile, doneDates);
```

### 1.5 Анимации

**`animateMedalsIntro(grid)`** — staggered reveal через GSAP (уже в проекте):

```js
gsap.fromTo('.medal-card',
  { opacity: 0, scale: 0.8, y: 20 },
  { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.15 }
);
```

Запускается только при первом открытии таба за сессию (флаг в модуле).

**`animateProgressFill(pct)`** — GSAP tween `width` от 0 до `pct%` за 900ms, `cubic-bezier(.25, .46, .45, .94)`.

**CSS-анимации (в `css/cabinet.css`):**

```css
/* Shimmer на прогрессе */
@keyframes medals-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.medals-progress__fill {
  background: linear-gradient(90deg,
    var(--accent) 0%,
    rgba(255,220,150,1) 50%,
    var(--accent) 100%);
  background-size: 200% 100%;
  animation: medals-shimmer 2.4s linear infinite;
}

/* Breathing glow на active */
@keyframes medal-breathe {
  0%, 100% { box-shadow: 0 0 0 rgba(196,168,130, 0); }
  50%     { box-shadow: 0 0 24px rgba(196,168,130, 0.45); }
}
.medal-card--active .medal-card__inner {
  animation: medal-breathe 3s ease-in-out infinite;
}

/* Locked — cross-hatch + grayscale */
.medal-card--locked {
  filter: grayscale(0.6) brightness(0.85);
}
.medal-card--locked::after {
  content: '';
  position: absolute; inset: 0;
  background-image: repeating-linear-gradient(45deg,
    transparent 0 6px,
    rgba(255,255,255,0.04) 6px 7px);
  pointer-events: none;
}

/* Earned — subtle hover lift */
.medal-card--earned:hover .medal-card__inner {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(196,168,130, 0.25);
}
```

### 1.6 3D flip при клике

```css
.medal-card__inner {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(.25,.46,.45,.94);
}
.medal-card--flipped .medal-card__inner { transform: rotateY(180deg); }
.medal-card__front, .medal-card__back {
  position: absolute; inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.medal-card__back { transform: rotateY(180deg); }
```

JS:
```js
grid.addEventListener('click', e => {
  const card = e.target.closest('.medal-card');
  if (!card) return;
  card.classList.toggle('medal-card--flipped');
  if ('vibrate' in navigator) navigator.vibrate(50);
});
```

**Safari iOS nuance:** `preserve-3d` в элементе, у которого предок имеет `display:none`, иногда ломается при первом показе. Mitigation: `showTab` для медалей использует `.cab-tab.hidden { visibility: hidden; position: absolute; opacity: 0; pointer-events: none; }` вместо `display:none`. Остальные табы оставляем с текущим поведением (если не ломаются).

### 1.7 Particle burst

Запускается **один раз** при открытии таба, если есть хоть одна earned медаль, которой нет в `localStorage.medals_burst_seen_<userId>`:

```js
function particleBurst(canvas, opts = {}) {
  const ctx = canvas.getContext('2d');
  const N = opts.count || 30;
  const particles = Array.from({ length: N }, () => ({
    x: canvas.width / 2, y: canvas.height / 2,
    vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8 - 2,
    life: 1, size: 2 + Math.random() * 3,
  }));
  let frame = 0;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.15; // gravity
      p.life -= 0.018;
      if (p.life <= 0) return;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = '#c4a882';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    frame++;
    if (frame < 90) requestAnimationFrame(tick);
    else canvas.remove();
  }
  tick();
}
```

Canvas 200×200px накладывается `position: absolute` поверх новой медали, после анимации удаляется.

Haptic: `navigator.vibrate?.([30, 20, 60])` при запуске.

### 1.8 Reduced motion

В начало `css/cabinet.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .medal-card__inner,
  .medals-progress__fill,
  .medal-card--active .medal-card__inner {
    animation: none !important;
    transition: none !important;
  }
}
```

В JS — пропуск GSAP tween'ов и particle burst, если `matchMedia('(prefers-reduced-motion: reduce)').matches`.

Доп. gate для particles: пропустить также если `navigator.deviceMemory && navigator.deviceMemory < 4`.

---

## Section 2 — Toast о новой медали

### 2.1 Триггер

В `loadProfile`, после `renderMedals`:

```js
const seenKey = `medals_seen_${user.id}`;
const seen    = JSON.parse(localStorage.getItem(seenKey) || '[]');
const earned  = MEDALS.slice(0, tierIdx + 1).map(m => m.id);
const fresh   = earned.filter(id => !seen.includes(id));
if (fresh.length) {
  const topNew = MEDALS.find(m => m.id === fresh[fresh.length - 1]);
  showMedalToast(topNew);
  localStorage.setItem(seenKey, JSON.stringify(earned));
}
```

### 2.2 Toast UI

HTML (инжектится в `<body>` из JS):

```html
<div class="medal-toast" role="status" aria-live="polite">
  <div class="medal-toast__icon">${svg}</div>
  <div class="medal-toast__body">
    <div class="medal-toast__title">Получен уровень «${name}»</div>
    <div class="medal-toast__sub">${benefit}</div>
  </div>
  <button class="medal-toast__cta" type="button">Посмотреть</button>
  <button class="medal-toast__close" aria-label="Закрыть">×</button>
</div>
```

CSS: `position: fixed; top: 24px; right: 24px; z-index: 1000; transform: translateX(120%); transition: transform 0.4s cubic-bezier(.25,.46,.45,.94);`. `.medal-toast--visible { transform: translateX(0); }`.

Auto-dismiss через 5 секунд. Кнопка «Посмотреть» → `showTab('medals')` + dismiss. Клик на `×` = dismiss.

На мобилке — top: 16px, left/right: 16px, width: auto.

---

## Section 3 — Inline expand на уведомлениях

### 3.1 Изменения в `loadNotifications` (`js/cabinet.js:813`)

Расширить select:

```js
.select('id, date, time_slot, style, status, notes, reference_url, created_at')
```

Передавать весь объект `b` в рендер карточки (не только дата/статус).

### 3.2 Новая структура `.notif-item`

```html
<div class="notif-item ${isRead ? '' : 'unread'}" data-id="${b.id}">
  <div class="notif-item__summary">
    <div class="notif-dot ${isRead ? 'read' : ''}"></div>
    <div class="notif-body">
      <div class="notif-text">${msg}</div>
      <div class="notif-time">${timeStr}</div>
    </div>
    <button class="notif-expand" aria-label="Раскрыть" aria-expanded="false">▾</button>
  </div>
  <div class="notif-item__detail" hidden>
    <div class="notif-detail__row">
      <span class="notif-detail__label">Дата</span>
      <span class="notif-detail__value">${dateLong} · ${time_slot}</span>
    </div>
    <div class="notif-detail__row">
      <span class="notif-detail__label">Стиль</span>
      <span class="notif-detail__value">${style || '—'}</span>
    </div>
    <div class="notif-detail__row">
      <span class="notif-detail__label">Статус</span>
      <span class="status-badge ${status}">${STATUS_RU[status]}</span>
    </div>
    ${notes ? `<div class="notif-detail__notes">${escapeHtml(notes)}</div>` : ''}
    ${reference_url ? `<img class="notif-detail__ref" src="..." data-ref="..." loading="lazy">` : ''}
    <div class="notif-detail__actions">
      <button class="btn-ghost notif-detail__goto" data-id="${b.id}">Открыть в Записях</button>
    </div>
  </div>
</div>
```

### 3.3 Expand/collapse

Делегирование на `#notif-list`:

```js
list.addEventListener('click', e => {
  const item = e.target.closest('.notif-item');
  if (!item) return;
  if (e.target.closest('.notif-detail__ref')) return; // лайтбокс, не expand
  if (e.target.closest('.notif-detail__goto')) return; // кнопка, отдельный handler

  // Закрыть все остальные
  list.querySelectorAll('.notif-item.expanded').forEach(el => {
    if (el !== item) {
      el.classList.remove('expanded');
      el.querySelector('.notif-expand').setAttribute('aria-expanded', 'false');
      el.querySelector('.notif-item__detail').hidden = true;
    }
  });

  // Toggle текущего
  const expanded = item.classList.toggle('expanded');
  item.querySelector('.notif-expand').setAttribute('aria-expanded', String(expanded));
  item.querySelector('.notif-item__detail').hidden = !expanded;

  // Mark as read при первом раскрытии
  if (expanded && item.classList.contains('unread')) markNotifRead(userId, item.dataset.id);
});

list.querySelectorAll('.notif-detail__ref').forEach(img => {
  img.addEventListener('click', e => {
    e.stopPropagation();
    openRefLightbox(img.dataset.ref);
  });
});

list.querySelectorAll('.notif-detail__goto').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    jumpToBookingCard(btn.dataset.id);
  });
});
```

CSS: `.notif-item__detail` с `max-height: 0; overflow: hidden; transition: max-height 300ms ease, opacity 200ms` + `.notif-item.expanded .notif-item__detail { max-height: 500px; opacity: 1; }`. Атрибут `hidden` — для a11y (скринридеры).

### 3.4 `jumpToBookingCard(id)`

Новая функция в `cabinet.js`:

```js
function jumpToBookingCard(bookingId) {
  const booking = (window._allBookings || []).find(b => b.id == bookingId);
  if (!booking) { showTab('bookings'); return; }

  const today       = todayLocal();
  const targetPill  = booking.date >= today && booking.status !== 'cancelled' ? 'upcoming'
                    : 'past';

  // Активируем правильный pill
  document.querySelectorAll('.pill').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === targetPill);
  });
  renderBookings(targetPill);

  showTab('bookings');

  // Скролл + pulse
  setTimeout(() => {
    const card = document.querySelector(`.booking-card[data-id="${bookingId}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('booking-card--pulse');
    setTimeout(() => card.classList.remove('booking-card--pulse'), 1500);
  }, 250);
}
```

Для этого в `renderBookings` добавить `card.setAttribute('data-id', b.id)`.

### 3.5 `.booking-card--pulse`

```css
@keyframes booking-pulse {
  0%, 100% { box-shadow: 0 0 0 rgba(196,168,130, 0); }
  30%      { box-shadow: 0 0 0 4px rgba(196,168,130, 0.45); }
}
.booking-card--pulse {
  animation: booking-pulse 1.5s ease-in-out;
}
```

### 3.6 Mark-as-read при раскрытии

```js
function markNotifRead(userId, bookingId) {
  const readKey = 'notif_read_' + userId;
  const read = new Set(JSON.parse(localStorage.getItem(readKey) || '[]'));
  // ключ = `${id}-${status}`, но у нас только id — находим текущий статус
  const booking = (window._allBookings || []).find(b => b.id == bookingId);
  if (!booking) return;
  read.add(`${bookingId}-${booking.status}`);
  localStorage.setItem(readKey, JSON.stringify([...read]));

  const dot = document.querySelector(`.notif-item[data-id="${bookingId}"] .notif-dot`);
  if (dot) dot.classList.add('read');
  const item = document.querySelector(`.notif-item[data-id="${bookingId}"]`);
  if (item) item.classList.remove('unread');

  // Пересчёт unread badge
  updateNotifBadge();
}
```

---

## Section 4 — Empty states на `tab-bookings`

В `renderBookings` заменить блок (`cabinet.js:722-725`):

```js
if (!filtered.length) {
  list.innerHTML = renderEmptyState(filter);
  return;
}
```

Новая функция:

```js
function renderEmptyState(filter) {
  const variants = {
    upcoming: {
      icon: ICONS.calendar,
      title: 'Нет предстоящих записей',
      text:  'Выберите дату, время и стиль — мы свяжемся для подтверждения.',
      cta:   { label: 'Записаться', href: '/booking' },
    },
    past: {
      icon: ICONS.hourglass,
      title: 'Вы ещё не были в студии',
      text:  'После первого визита здесь появится история сеансов.',
      cta:   null,
    },
    all: {
      icon: ICONS.sparkle,
      title: 'У вас пока нет записей',
      text:  'Давайте это исправим.',
      cta:   { label: 'Записаться', href: '/booking' },
    },
  };
  const v = variants[filter] || variants.all;
  return `
    <div class="bookings-empty bookings-empty--${filter}">
      <div class="bookings-empty__icon">${v.icon}</div>
      <h3 class="bookings-empty__title">${v.title}</h3>
      <p class="bookings-empty__text">${v.text}</p>
      ${v.cta ? `<a href="${v.cta.href}" class="btn-primary bookings-empty__cta">${v.cta.label}</a>` : ''}
    </div>
  `;
}
```

Иконки `ICONS.calendar`, `ICONS.hourglass`, `ICONS.sparkle` — добавить в `ICONS` (`cabinet.js:240`).

CSS (`css/cabinet.css`):

```css
.bookings-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 48px 24px; min-height: 240px;
  text-align: center;
}
.bookings-empty__icon {
  width: 48px; height: 48px; margin-bottom: 16px;
  color: var(--accent);
  opacity: 0.7;
}
.bookings-empty__title {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  font-weight: 400;
  margin: 0 0 8px;
}
.bookings-empty__text {
  color: var(--muted);
  font-size: 0.9rem;
  max-width: 320px;
  margin: 0 0 24px;
}
.bookings-empty__cta {
  padding: 12px 28px;
  background: var(--accent);
  color: var(--bg);
  text-decoration: none;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 0.82rem;
}
```

---

## Section 5 — Тесты и самопроверка

После реализации вручную:

1. **Медали таб** — открыть cabinet, кликнуть узел «Медали» в орбите → открывается `#tab-medals`, прогресс-бар анимируется от 0 до текущего %, 4 карточки появляются с stagger.
2. **Flip** — клик на любую карточку: 3D flip, back показывает дату получения (для earned/active) или «осталось N визитов» (locked). Повторный клик возвращает.
3. **Particle burst** — при первом заходе на таб под сессии (очистить localStorage.medals_burst_seen → reload) — над первой earned-картинкой частицы летят 1.5s.
4. **Toast** — изменить `profiles.visit_count` через Supabase Studio до следующего порога → reload кабинета → toast slide-in справа сверху, 5s, кнопка «Посмотреть» открывает таб.
5. **Inline expand** — клик на уведомление раскрывает детали записи, ref-thumb открывает лайтбокс, кнопка «Открыть в Записях» переключает таб + скрол + 1.5s pulse.
6. **Mark-as-read** — при раскрытии dot становится читаным, badge в топбаре декрементится.
7. **Empty state** — зафильтровать пользователя без предстоящих записей (отменить все или удалить) → карточка с CTA «Записаться». Past empty — без CTA. All empty — с CTA.
8. **Reduced motion** — macOS → Settings → Accessibility → Reduce motion on → reload: без stagger, без shimmer, без flip-animation (instant swap), без particle burst.
9. **iOS Safari smoke** — открыть кабинет на iPhone/iPad, проверить flip (не glitches при первом открытии таба), haptic работает на flip и burst.
10. **Тема тёмная** — все новые элементы в палитре `--bg / --surface / --accent / --text / --muted`, не выбиваются.

---

## Risks / open questions

- **3D flip в Safari iOS** — риск glitches, если таб переключается через `display:none`. Mitigation в Section 1.6: `.cab-tab.hidden` для tab-medals использует `visibility+opacity+absolute` вместо `display:none`. Если это ломает остальные табы (которые сейчас `display:none`-based) — ограничим модификатор только для `#tab-medals`.
- **Particles tanking слабого GPU** — gate по `prefers-reduced-motion` и `navigator.deviceMemory < 4`. Приемлемо.
- **Деривация earned-date из `bookings`** — дата определяется по отсортированному по `date` списку `status='done'`. Если админ подтвердил запись вне хронологического порядка (редко) — дата может быть «из будущего» относительно фактического момента подтверждения. В контексте UX («Получена DD MMM YYYY») это приемлемо.
- **LocalStorage `medals_seen_*` и `medals_burst_seen_*`** — clear cache → toast сработает снова и particle burst повторится. Не корраптит данные, но потенциально раздражает. Лечится только server-side флагом — out of scope.
- **Конфликт с existing скрытыми якорями** `#medals-fill, #medals-visits-text, #medals-next-text, #medal-bronze..platinum` в `cabinet.html:94-105` — удаляем их. Старый код в `loadProfile` (`cabinet.js:454-459`), который их обновлял, тоже выпиливаем и переносим в `renderMedals`.
- **Notification ключ прочитанности** сейчас `${id}-${status}` — при смене статуса админом старый read-flag не сохраняется (новое уведомление появляется как unread). Это корректное поведение, не баг. Mark-as-read логика в Section 3.6 сохраняет тот же паттерн.

---

## Files touched

| Файл | Что |
|---|---|
| `cabinet.html` | Новый `<section id="tab-medals">`; удалить скрытые якоря `#medal-*`, `#medals-*` из `tab-home` |
| `js/cabinet.js` | `ICONS.calendar/hourglass/sparkle`; `renderMedals`; `buildMedalCard`; `animateMedalsIntro`; `animateProgressFill`; `particleBurst`; `medalEarnedDates`; `showMedalToast`; обновить orbital node 4 onActivate → `showTab('medals')`; расширить select в `loadNotifications` и переписать рендер карточки с expand/collapse; `markNotifRead`; `updateNotifBadge`; `jumpToBookingCard`; `renderEmptyState`; в `renderBookings` добавить `data-id`; подключить CSS pulse при переходе |
| `css/cabinet.css` | `.medals-*` (head, progress, grid, card front/back, flip, shimmer, breathe, locked hatch); `.medal-toast*`; `.notif-item--expanded` detail block; `.booking-card--pulse`; `.bookings-empty*`; `@media (prefers-reduced-motion)` |

Ничего в `server/`, ничего в Supabase, ничего в `vite.config.js` — проект C полностью фронтовой.

---

## Dependencies

- GSAP уже в проекте (использует `home.js`, `cabinet.js` через CDN) — дополнительная лицензия не нужна.
- Supabase SDK — уже подключён в `supabase-config.js`.
- Нет новых npm-пакетов.
