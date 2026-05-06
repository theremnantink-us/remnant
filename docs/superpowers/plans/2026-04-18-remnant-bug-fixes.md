# REMNANT Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Применить 8 правок UI/навигации/данных согласно [spec 2026-04-18](../specs/2026-04-18-remnant-bug-fixes-design.md): орбита-parity, back-кнопка, gold-лого, анимация орбиты, обогащённая карточка записи, «Уход», унификация шапок, починка `/contacts`.

**Architecture:** Правки точечные, без изменения backend. Фронт — vanilla HTML/CSS/JS (ES-modules). Авто-тестов в проекте нет — верификация через ручной smoke-test в браузере (MAMP или Express :3000). Коммиты частые, по одному заданию.

**Tech Stack:** Vanilla JS ES-modules, Supabase client (data), `js/orbital-nav.js` (компонент орбиты), MAMP (:8888) + Express (:3000) + Vite (:5173).

**Spec ref:** `docs/superpowers/specs/2026-04-18-remnant-bug-fixes-design.md`

---

## Preparation

### Task 0: Baseline and branch

**Files:** —

- [ ] **Step 1: Verify clean git state**

Run:
```bash
git status
```
Expected: видимые модифицированные файлы `admin.html`, `booking.html`, `css/admin.css`, `js/admin.js`, `js/booking.js`, `style.css` — это ожидаемые незакоммиченные изменения на master. Работаем поверх них.

- [ ] **Step 2: Ensure MAMP + Express + (optionally) Vite running locally**

Проверь: `curl -I http://localhost:3000/` → `200 OK`. Если нет — запусти `npm run server` в корне.

Для Supabase: открой `js/supabase-config.js`, убедись что `SUPABASE_URL` и `SUPABASE_ANON_KEY` валидны. Ничего не правим — только проверка.

---

## Section 1 — Orbit parity (cabinet ↔ admin)

### Task 1: Align cabinet orbit radius and hint

**Files:**
- Modify: `js/cabinet.js` (внутри `createOrbital(...)` вызова, ~строки 368-375)

- [ ] **Step 1: Edit cabinet orbital options**

В `js/cabinet.js` найди вызов `createOrbital(mount, { ... })` в функции `buildCabinetOrbital`. Замени:

```js
  _orbital = createOrbital(mount, {
    nodes,
    center,
    radius: 220,
    autoRotate: true,
    onHubClick: () => showTab('profile'),
    hint: 'Клик на узел — открыть карточку · Повторный клик — раскрыть раздел',
  });
```

на:

```js
  _orbital = createOrbital(mount, {
    nodes,
    center,
    radius: 200,
    autoRotate: true,
    onHubClick: () => showTab('profile'),
    hint: 'Клик на узел — карточка раздела · Повторный клик — открыть раздел',
  });
```

- [ ] **Step 2: Smoke test**

Открой `http://localhost:3000/cabinet.html`, залогинься тестовым клиентом, открой админку в другой вкладке (`/admin.html`, root/root), визуально сравни: радиус и текст хинта одинаковые. Центры остаются разными (аватар vs «R»).

- [ ] **Step 3: Commit**

```bash
git add js/cabinet.js
git commit -m "fix(cabinet): align orbit radius and hint with admin"
```

---

## Section 2 — Back-to-orbit button (admin + cabinet)

### Task 2: Add back button to admin topbar

**Files:**
- Modify: `admin.html` (блок `<header class="adm-topbar">`)
- Modify: `js/admin.js` (функция `showSection`)
- Modify: `css/admin.css` (новое правило `.adm-topbar__back`, добавить gold на `.adm-topbar__logo`)

- [ ] **Step 1: Insert back-button into admin.html**

В `admin.html` найди блок:

```html
  <header class="adm-topbar" id="adm-topbar">
    <a href="/" class="adm-topbar__logo">REMNANT</a>
```

Вставь кнопку ДО `.adm-topbar__logo`:

```html
  <header class="adm-topbar" id="adm-topbar">
    <button class="adm-topbar__back hidden" id="adm-back" aria-label="Назад к орбите" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
    </button>
    <a href="/" class="adm-topbar__logo">REMNANT</a>
```

- [ ] **Step 2: Wire handler and toggle in js/admin.js**

В `js/admin.js` в конце функции `showSection(name)` (после строки `if (name === 'analytics') loadAnalytics();`) добавь:

```js
  const backBtn = document.getElementById('adm-back');
  if (backBtn) backBtn.classList.toggle('hidden', name === 'dashboard');
```

Затем ниже блока `document.querySelectorAll('[data-section]').forEach(...)` добавь:

```js
document.getElementById('adm-back')?.addEventListener('click', () => showSection('dashboard'));
```

- [ ] **Step 3: Add CSS rule**

В `css/admin.css` в секции топбара (рядом с `.adm-topbar__logo { ... }` ~ строка 155) замени правило логотипа на:

```css
.adm-topbar__logo {
  font-family: var(--font-serif); font-size: 1.15rem;
  letter-spacing: .22em; color: var(--accent);
  text-decoration: none;
}
```

И добавь ПОСЛЕ правила `.adm-topbar__logo` (до следующего селектора):

```css
.adm-topbar__back {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px;
  margin-right: .5rem;
  background: transparent;
  border: none;
  color: var(--text);
  cursor: pointer;
  border-radius: 8px;
  transition: color .2s ease, background .2s ease;
}
.adm-topbar__back svg { width: 18px; height: 18px; }
.adm-topbar__back:hover { color: var(--accent); background: rgba(255,255,255,0.04); }
@media (max-width: 767px) {
  .adm-topbar__back { width: 32px; height: 32px; }
  .adm-topbar__back svg { width: 16px; height: 16px; }
}
```

- [ ] **Step 4: Smoke test**

Открой `/admin.html`, залогинься (`root` / `root`). На dashboard кнопки «назад» НЕТ. Клик по «Записи» в орбите → открывается таб bookings, слева от лого появляется стрелка. Клик по стрелке → возврат на dashboard, стрелка снова скрыта.

- [ ] **Step 5: Commit**

```bash
git add admin.html js/admin.js css/admin.css
git commit -m "feat(admin): back-to-orbit button in topbar + gold logo"
```

### Task 3: Add back button to cabinet topbar

**Files:**
- Modify: `cabinet.html` (блок `<header class="cab-topbar">`)
- Modify: `js/cabinet.js` (функция `showTab`)
- Modify: `css/cabinet.css` (правило `.cab-topbar__back`)

- [ ] **Step 1: Insert back-button into cabinet.html**

В `cabinet.html` найди блок:

```html
  <header class="cab-topbar" id="cab-topbar">
    <a href="/" class="cab-topbar__logo">REMNANT</a>
```

Вставь кнопку ДО `.cab-topbar__logo`:

```html
  <header class="cab-topbar" id="cab-topbar">
    <button class="cab-topbar__back hidden" id="cab-back" aria-label="Назад к орбите" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
    </button>
    <a href="/" class="cab-topbar__logo">REMNANT</a>
```

- [ ] **Step 2: Wire handler in js/cabinet.js**

В `js/cabinet.js` в начале функции `showTab(name)` (смотри строку ~28) ПОСЛЕ строк переключения секций добавь:

```js
  const backBtn = document.getElementById('cab-back');
  if (backBtn) backBtn.classList.toggle('hidden', name === 'home');
```

(Если не уверен куда — вставь перед закрывающей `}` функции `showTab`.)

После блока `document.querySelectorAll('[data-tab]').forEach(...)` (~строка 200) добавь:

```js
document.getElementById('cab-back')?.addEventListener('click', () => showTab('home'));
```

- [ ] **Step 3: Add CSS rule in css/cabinet.css**

В `css/cabinet.css` рядом с `.cab-topbar__logo` (~строка 221) добавь:

```css
.cab-topbar__back {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px;
  margin-right: .5rem;
  background: transparent;
  border: none;
  color: var(--text);
  cursor: pointer;
  border-radius: 8px;
  transition: color .2s ease, background .2s ease;
}
.cab-topbar__back svg { width: 18px; height: 18px; }
.cab-topbar__back:hover { color: var(--accent); background: rgba(255,255,255,0.04); }
@media (max-width: 767px) {
  .cab-topbar__back { width: 32px; height: 32px; }
  .cab-topbar__back svg { width: 16px; height: 16px; }
}
```

- [ ] **Step 4: Smoke test**

Открой `/cabinet.html`, залогинься. На табе «Орбита» (home) кнопки нет. Клик «Записи» → стрелка появляется. Клик по стрелке → возврат на home.

- [ ] **Step 5: Commit**

```bash
git add cabinet.html js/cabinet.js css/cabinet.css
git commit -m "feat(cabinet): back-to-orbit button in topbar"
```

---

## Section 3 — Gold logo everywhere

### Task 4: Gold color on all logo elements

**Files:**
- Modify: `style.css` (`.footer-logo`, ~строка 1273)
- Modify: `css/cabinet.css` (`.cab-topbar__logo` ~строка 221, `.auth-logo` ~строка 49)

(Note: `.adm-topbar__logo` уже получил `color: var(--accent)` в Task 2.)

- [ ] **Step 1: Edit style.css footer-logo**

Замени правило `.footer-logo` (~строка 1273):

```css
.footer-logo {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 400;
  letter-spacing: .18em;
  text-transform: uppercase;
  margin-bottom: 1.2rem;
  display: block;
  color: var(--accent);
}
```

- [ ] **Step 2: Edit css/cabinet.css cab-topbar__logo**

Найди `.cab-topbar__logo { font-family: var(--font-serif); font-size: 1.1rem; letter-spacing: .22em; color: var(--text); ... }` и замени `color: var(--text);` на `color: var(--accent);`.

- [ ] **Step 3: Edit css/cabinet.css auth-logo**

Найди правило `.auth-logo` (~строка 49). Если имеет `color: ...` — замени на `color: var(--accent);`. Если цвета нет — добавь строку `color: var(--accent);` в блок.

- [ ] **Step 4: Smoke test**

Открой `/` (футер золотой `REMNANT`), `/cabinet.html` (auth-экран лого золотое, после логина топбар REMNANT золотой), `/admin.html` (уже покрыто в Task 2).

- [ ] **Step 5: Commit**

```bash
git add style.css css/cabinet.css
git commit -m "style: gold color for all logo variants"
```

---

## Section 4 — Orbit appearance animation (rotational)

### Task 5: Add appearance animation to orbital-nav

**Files:**
- Modify: `js/orbital-nav.js`
- Modify: `css/orbital-nav.css`

- [ ] **Step 1: Extend CSS with keyframes and initial states**

В `css/orbital-nav.css` в КОНЕЦ файла (после `@media (max-width: 420px)`) добавь:

```css
/* ──── Appearance animation ──────────────────── */
@keyframes orbital-appear {
  from { opacity: 0; transform: scale(0.8); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes orbital-node-in {
  from { opacity: 0; transform: translate(var(--tx, 0), var(--ty, 0)) scale(0.5); }
  to   { opacity: var(--final-opacity, 1); transform: translate(var(--tx, 0), var(--ty, 0)) scale(1); }
}

.orbital--initializing .orbital__hub,
.orbital--initializing .orbital__ring {
  animation: orbital-appear 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.orbital--initializing .orbital__ring--outer { animation-delay: 80ms; }
.orbital--initializing .orbital__hub         { animation-delay: 160ms; }

.orbital--initializing .orbital__node {
  animation: orbital-node-in 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(240ms + var(--node-index, 0) * 60ms);
}
```

- [ ] **Step 2: Modify orbital-nav.js positionNodes to expose CSS vars**

В `js/orbital-nav.js` найди функцию `positionNodes` (~строка 139). Замени её целиком на:

```js
  function positionNodes() {
    const total = state.nodes.length;
    state.nodes.forEach((n, i) => {
      const el = nodeEls.get(n.id);
      if (!el) return;
      const angle = ((i / total) * 360 + state.rotation) % 360;
      const rad = (angle * Math.PI) / 180;
      const x = Math.cos(rad) * state.radius;
      const y = Math.sin(rad) * state.radius;
      const z = Math.round(100 + 50 * Math.cos(rad));
      const opacity = Math.max(0.5, 0.5 + 0.5 * ((1 + Math.sin(rad)) / 2));
      const expanded = state.expandedId === n.id;
      el.style.setProperty('--tx', `${x}px`);
      el.style.setProperty('--ty', `${y}px`);
      el.style.setProperty('--final-opacity', expanded ? 1 : opacity);
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.zIndex = expanded ? 400 : z;
      el.style.opacity = expanded ? 1 : opacity;
    });
  }
```

- [ ] **Step 3: Set --node-index on each node element**

В `js/orbital-nav.js` найди блок создания узлов (`nodes.forEach((n) => { ... })` ~строка 111). Внутри `forEach` ДО `field.appendChild(el);` добавь строку:

```js
    el.style.setProperty('--node-index', String(nodes.indexOf(n)));
```

- [ ] **Step 4: Add initializing class + rotation ramp-up**

В `js/orbital-nav.js` найди секцию `// ── Auto-rotate ──` (~строка 157). Замени функцию `startTimer` и непосредственно следующий вызов `startTimer();` (~строка 169) на:

```js
  function startTimer() {
    if (state.timer) return;
    const RAMP_MS = 1200;
    const TARGET_SPEED = 0.25;
    const start = performance.now();
    state.timer = setInterval(() => {
      if (!state.auto) return;
      const elapsed = performance.now() - start;
      const speed = elapsed < RAMP_MS
        ? TARGET_SPEED * (elapsed / RAMP_MS)
        : TARGET_SPEED;
      state.rotation = (state.rotation + speed) % 360;
      positionNodes();
    }, 50);
  }
  function stopTimer() {
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
  }

  // Mark initializing for one-shot CSS animation
  container.classList.add('orbital--initializing');
  setTimeout(() => container.classList.remove('orbital--initializing'), 1400);

  startTimer();
```

(Удали старый `function stopTimer() { ... }` и старый `startTimer()` вызов, которые были на этих местах, чтобы не было дублирования.)

- [ ] **Step 5: Smoke test**

Обнови `/cabinet.html` и `/admin.html` с hard-refresh (`Cmd+Shift+R`). На обоих: при входе видно как кольца и хаб плавно проявляются за ~600ms, узлы последовательно «выплывают» (stagger 60ms каждый), автовращение стартует плавно из статики. После первого появления повторные клики по табам не анимируют орбиту заново (только при её полном построении).

- [ ] **Step 6: Commit**

```bash
git add js/orbital-nav.js css/orbital-nav.css
git commit -m "feat(orbital): rotational appearance animation on init"
```

---

## Section 5 — Cabinet bookings fix + enriched card

### Task 6: Extend bookings select and fix local-date filter

**Files:**
- Modify: `js/cabinet.js` (функции `loadBookings`, `renderBookings`)

- [ ] **Step 1: Extend the select clause**

В `js/cabinet.js` функция `loadBookings` (строка 649). Замени:

```js
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, date, time_slot, style, status')
    .eq('user_id', userId)
    .order('date', { ascending: true });
```

на:

```js
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, date, time_slot, style, status, name, phone, reference_url, notes, created_at')
    .eq('user_id', userId)
    .order('date', { ascending: true });
```

- [ ] **Step 2: Add local-date helper**

В `js/cabinet.js` ПЕРЕД функцией `loadBookings` (строка 648 в исходнике) добавь:

```js
function todayLocal() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
```

- [ ] **Step 3: Replace UTC date usage in loadBookings**

Внутри `loadBookings`, замени:

```js
  const now      = new Date().toISOString().slice(0, 10);
```

на:

```js
  const now      = todayLocal();
```

- [ ] **Step 4: Same replacement in renderBookings**

Внутри `renderBookings(filter)` замени первую строку `const now = new Date().toISOString().slice(0, 10);` на `const now = todayLocal();`.

- [ ] **Step 5: Smoke test**

Залогинься в кабинет. Убедись: если есть запись на «сегодня» — она в табе «Предстоящие». Никаких визуальных изменений карточки пока — только данные.

- [ ] **Step 6: Commit**

```bash
git add js/cabinet.js
git commit -m "fix(cabinet): extend booking select + local-date filter"
```

### Task 7: Enriched booking card rendering

**Files:**
- Modify: `js/cabinet.js` (функция `renderBookings`, формат карточки)
- Modify: `css/cabinet.css` (новые правила `.booking-card__*`)

- [ ] **Step 1: Add formatter helpers**

В `js/cabinet.js` после функции `todayLocal` (добавленной в Task 6) добавь:

```js
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
```

- [ ] **Step 2: Replace the card innerHTML**

В `js/cabinet.js` внутри `renderBookings(filter)` замени блок формирования карточки (~строки 704-720) на:

```js
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
```

- [ ] **Step 3: Add simple lightbox function**

В конце `js/cabinet.js` (после блока `.pill` click listener) добавь:

```js
/* ══ Reference lightbox ═══════════════════════════ */
function openRefLightbox(url) {
  if (!url) return;
  let overlay = document.getElementById('ref-lightbox');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ref-lightbox';
    overlay.className = 'ref-lightbox';
    overlay.innerHTML = `<img alt="Референс"><button class="ref-lightbox__close" aria-label="Закрыть">×</button>`;
    document.body.appendChild(overlay);
    const close = () => overlay.classList.remove('open');
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.ref-lightbox__close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }
  overlay.querySelector('img').src = url;
  overlay.classList.add('open');
}
```

- [ ] **Step 4: Add CSS for card and lightbox**

В `css/cabinet.css` в конце файла добавь:

```css
/* ──── Booking card enriched ─────────────────────── */
.booking-card__header {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 1rem;
}
.booking-card__contact {
  display: flex; flex-wrap: wrap; gap: 1rem;
  font-size: .82rem; color: var(--muted);
  margin-top: .6rem;
}
.booking-card__contact a {
  color: var(--accent); text-decoration: none;
}
.booking-card__contact a:hover { text-decoration: underline; }
.booking-card__notes {
  font-size: .82rem; color: var(--text);
  margin-top: .5rem; padding: .55rem .7rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 6px;
  line-height: 1.5;
  white-space: pre-wrap;
}
.booking-card__ref-thumb {
  display: block;
  width: 96px; height: 96px;
  object-fit: cover;
  border-radius: 8px;
  cursor: zoom-in;
  margin-top: .6rem;
  border: 1px solid rgba(255,255,255,0.08);
  transition: transform .2s ease, border-color .2s ease;
}
.booking-card__ref-thumb:hover {
  transform: scale(1.04);
  border-color: rgba(196, 168, 130, 0.4);
}
.booking-card__created {
  font-size: .68rem; color: var(--muted);
  margin-top: .6rem;
  letter-spacing: .08em;
  text-transform: uppercase;
}

/* ──── Reference lightbox ────────────────────────── */
.ref-lightbox {
  position: fixed; inset: 0;
  display: none;
  align-items: center; justify-content: center;
  background: rgba(0,0,0,0.92);
  z-index: 9999;
  padding: 2rem;
}
.ref-lightbox.open { display: flex; }
.ref-lightbox img {
  max-width: 100%; max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
}
.ref-lightbox__close {
  position: absolute; top: 1.2rem; right: 1.2rem;
  width: 44px; height: 44px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.16);
  color: var(--text);
  font-size: 1.8rem; line-height: 1;
  border-radius: 50%;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.ref-lightbox__close:hover {
  background: rgba(255,255,255,0.14);
  color: var(--accent);
}
```

- [ ] **Step 5: Smoke test**

Залогинься в кабинет. В табе «Записи» карточка содержит: дата·время·стиль, статус+кнопка, имя·телефон (кликабельный `tel:`), заметки (если есть), thumbnail-референс (если есть), дату создания. Клик по thumbnail открывает overlay во весь экран. Закрытие: клик по бэкдропу / по крестику / клавиша `Esc`.

- [ ] **Step 6: Commit**

```bash
git add js/cabinet.js css/cabinet.css
git commit -m "feat(cabinet): enriched booking cards with contact/notes/reference/created"
```

---

## Section 6 — «Афтеркеа» → «Уход»

### Task 8: Rename orbit node label

**Files:**
- Modify: `js/cabinet.js` (~строка 351)

- [ ] **Step 1: Edit label**

В `js/cabinet.js` найди узел с id:6 (внутри `buildCabinetOrbital` → `nodes` array). Замени:

```js
      title: 'Афтеркеа',
```

на:

```js
      title: 'Уход',
```

- [ ] **Step 2: Smoke test**

Обнови кабинет, орбита — подпись узла с сердечком теперь «Уход».

- [ ] **Step 3: Commit**

```bash
git add js/cabinet.js
git commit -m "fix(cabinet): rename orbit node Афтеркеа to Уход"
```

---

## Section 7 — Header unification + `/contacts` fix

### Task 9: Rename studio.html → contacts.html

**Files:**
- Rename: `studio.html` → `contacts.html`
- Modify: `contacts.html` (title, h1 если есть)
- Modify: `vite.config.js`

- [ ] **Step 1: Git mv the file**

Run:
```bash
git mv studio.html contacts.html
```

- [ ] **Step 2: Update title and h1 inside contacts.html**

Открой `contacts.html`. Замени:

```html
<title>Студия | REMNANT Tattoo Studio</title>
```

на:

```html
<title>Контакты | REMNANT Tattoo Studio</title>
```

Затем найди `<h1>` в теле страницы (если содержит «Студия» / «STUDIO») — замени текст на «Контакты». Если h1 отсутствует или имеет другое содержание — пропусти.

- [ ] **Step 3: Update vite.config.js entry**

В `vite.config.js` строка 25 — замени:

```js
        studio: resolve(__dirname, 'studio.html'),
```

на:

```js
        contacts: resolve(__dirname, 'contacts.html'),
```

- [ ] **Step 4: Smoke test /contacts**

С Express: `curl -I http://localhost:3000/contacts` → `200 OK` (не 404). Открой в браузере — страница грузится, в `<title>` «Контакты».

Если запущен Vite (`npm run dev`): `http://localhost:5173/contacts.html` открывается.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: rename studio.html to contacts.html + vite entry"
```

### Task 10: Unify nav + mobile-menu across public pages

**Files:**
- Modify: `faq.html`, `master.html`, `contacts.html`, `booking.html`, `aftercare.html`

Эталон — `index.html`, блоки `<nav class="nav">` (строки ~135-152) и `<div class="mobile-menu">` (строки ~156-173).

- [ ] **Step 1: Copy exact nav block from index.html**

Эталонный desktop-nav блок (из `index.html` строки 135-152 — используй в последующих шагах):

```html
<nav class="nav" id="nav" role="navigation" aria-label="Основная навигация">
  <a href="/" class="nav-logo">Remnant</a>
  <div class="nav-links">
    <a href="/faq">FAQ</a>
    <a href="/master">Мастер</a>
    <a href="/contacts">Контакты</a>
    <a href="/aftercare">Уход</a>
    <a href="/booking" class="nav-cta">Записаться</a>
    <a href="/cabinet" class="nav-cabinet-btn" id="nav-cabinet-link">
      <div class="nav-avatar" id="nav-avatar"><img id="nav-avatar-img" src="" alt=""><span id="nav-avatar-initials"></span></div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" id="nav-cabinet-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span id="nav-cabinet-text">Кабинет</span>
    </a>
  </div>
  <button class="nav-burger" id="burger" aria-label="Меню" aria-expanded="false" aria-controls="mobile-menu">
    <span></span><span></span><span></span>
  </button>
</nav>
```

Эталонный mobile-menu блок (из `index.html` строки 156-173):

```html
<!-- Mobile menu -->
<div class="mobile-menu" id="mobile-menu">
  <a href="/cabinet" onclick="closeMobileMenu()" class="mob-cabinet-icon" aria-label="Личный кабинет">
    <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  </a>
  <a href="/faq" onclick="closeMobileMenu()">FAQ</a>
  <a href="/master" onclick="closeMobileMenu()">Мастер</a>
  <a href="/contacts" onclick="closeMobileMenu()">Контакты</a>
  <a href="/aftercare" onclick="closeMobileMenu()">Уход</a>
  <a href="/booking" onclick="closeMobileMenu()">Записаться</a>
  <div class="mobile-menu-socials">
    <a href="#" class="social-icon" aria-label="Instagram">
      <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
    </a>
    <a href="#" class="social-icon" aria-label="Telegram">
      <svg viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
    </a>
  </div>
</div>
```

- [ ] **Step 2: Replace nav + mobile-menu in faq.html**

Открой `faq.html`. Найди существующий блок `<nav class="nav" id="nav">...</nav>` — замени на эталонный desktop-nav из Step 1. Затем найди `<div class="mobile-menu" id="mobile-menu">...</div>` — замени на эталонный mobile-menu из Step 1.

- [ ] **Step 3: Same replacement in master.html**

Повтори Step 2 для `master.html`.

- [ ] **Step 4: Same replacement in contacts.html**

Повтори для `contacts.html` (бывший studio.html).

- [ ] **Step 5: Same replacement in booking.html**

Повтори для `booking.html`.

- [ ] **Step 6: Same replacement in aftercare.html**

Повтори для `aftercare.html`. Заметь: в `aftercare.html` мобильное меню сейчас БЕЗ блока соцсетей — эталон его добавляет.

- [ ] **Step 7: Fix footer links /studio → /contacts**

В каждом из `faq.html`, `master.html`, `contacts.html`, `booking.html`, `aftercare.html`, `index.html` найди в футере `<a href="/studio">` и замени на `<a href="/contacts">`. (В `index.html` уже `/contacts` — проверь и пропусти если так.)

Быстрая проверка: `grep -n '/studio' *.html` — должно не находить в публичных страницах (может найти в `monolithstudio.com/` — это другой проект, НЕ ТРОГАТЬ).

- [ ] **Step 8: Smoke test all pages**

На десктопе открой по очереди: `/`, `/faq`, `/master`, `/contacts`, `/aftercare`, `/booking` — шапка идентична: порядок FAQ/Мастер/Контакты/Уход/Записаться/Кабинет, слева лого «Remnant» золотом, бургер справа.

На мобильной ширине (DevTools) открой бургер на каждой странице: сверху иконка-кабинет, затем FAQ/Мастер/Контакты/Уход/Записаться, внизу соцсети.

Проверь что `/contacts` отдаётся и страница с заголовком «Контакты» открывается.

- [ ] **Step 9: Commit**

```bash
git add faq.html master.html contacts.html booking.html aftercare.html index.html
git commit -m "fix: unify header/mobile-menu across public pages + contacts links"
```

---

## Final verification

### Task 11: Full smoke test pass

- [ ] **Step 1: Clean build**

Run:
```bash
npm run build
```
Expected: билд успешен, в stdout нет ошибок. В `dist/` создан `contacts.html` (не `studio.html`).

- [ ] **Step 2: Manual pass through all bugs**

| # | Проверка | Ожидание |
|---|---|---|
| 1 | Орбита admin vs cabinet | одинаковый радиус/hint, центры разные |
| 2 | Внутри таба — кнопка «←» | показывается, возвращает на dashboard/home |
| 3 | Лого «REMNANT» | gold везде: топбары, футер, auth-экран |
| 4 | Вход в dashboard | плавное появление орбиты, разгон вращения |
| 5 | Кабинет → Записи | карточка содержит имя, телефон-ссылка, заметки, thumb-референс, дату создания. Клик по thumb → lightbox. |
| 6 | Орбита кабинета | узел «Уход» (не «Афтеркеа») |
| 7 | Шапки + бургер | идентичны на всех публичных страницах |
| + | `/contacts` | открывается (200), не «Cannot GET» |

- [ ] **Step 3: Final push (не выполнять без запроса пользователя)**

Не выполнять `git push` автоматически. Сообщи пользователю: «Все правки применены, N коммитов на master. Сделать push?»

---

## Rollback notes

Если что-то пошло не так на любой задаче: `git log --oneline` покажет цепочку. Каждая задача — один коммит, легко откатить `git revert <sha>` одного конкретного куска.

Особое внимание:
- **Task 9** (rename studio → contacts): если билд ломается в Task 11 — проверь что в `vite.config.js` нет другой ссылки на `studio`, и что `dist/` был пересобран.
- **Task 5** (orbital animation): если на мобилке лагает — в `css/orbital-nav.css` можно временно добавить `@media (prefers-reduced-motion: reduce) { .orbital--initializing * { animation: none !important; } }`.
