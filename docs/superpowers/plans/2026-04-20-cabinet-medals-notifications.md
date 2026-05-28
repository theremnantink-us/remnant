# Cabinet Medals + Notifications + Empty States — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a dedicated medals tab with 3D flip + particle burst animations, inline-expandable notification cards with jump-to-booking, and three tailored empty-state variants on the bookings tab.

**Architecture:** All changes are front-end only, inside the existing SPA cabinet (`cabinet.html` + `js/cabinet.js` + `css/cabinet.css`). No DB migrations, no server changes, no Supabase schema work. Medal progression is read from `profiles.visit_count`; earned dates are derived from `bookings` rows with `status='done'`. Animations use GSAP (already in the project via CDN) for JS-driven motion and CSS keyframes for ambient effects.

**Tech Stack:** Vanilla JS ES modules, Supabase JS SDK (already wired), GSAP (CDN), Canvas 2D (particle burst), CSS3 (3D flip, keyframes).

**Reference spec:** `docs/superpowers/specs/2026-04-20-cabinet-medals-notifications-design.md`

---

## File Map

| File | Role | Change type |
|---|---|---|
| `cabinet.html` | DOM skeleton of cabinet SPA | Add `<section id="tab-medals">`, remove legacy hidden medal anchors |
| `js/cabinet.js` | Client logic (auth, orbit, tabs, profile, bookings, notifications) | Large additions: MEDALS struct, ICONS, renderMedals + helpers, showMedalToast, notification expand/markRead, jumpToBookingCard, renderEmptyState |
| `css/cabinet.css` | Cabinet styles | Add ~250 lines: medals grid + flip + shimmer + glow + hatch, toast, notif expand, booking pulse, bookings-empty, reduced-motion guards |
| `docs/superpowers/SESSION_LOG.md` | Session journal | Append entry at the end |

No other files are touched. Everything is additive except removing the 7 legacy hidden medal anchors in `cabinet.html:94-104`.

---

## Testing Approach

This project has no automated test harness. Each task ends with a **manual smoke check**: open the running app, perform a specific interaction, confirm an observable outcome. If the dev server is not up, start it per CLAUDE.md:

```bash
# Terminal 1 — API server
node --watch server/index.js

# Terminal 2 — Vite dev
npm run dev   # localhost:5173, proxies /api → :3000
```

Alternatively use MAMP static at `http://localhost:8888/REMNANT/cabinet.html` (no API proxying).

To log in for tests: use an existing Supabase user or register fresh. Populate at least one `profiles` row with `visit_count` and at least one `bookings` row with `status='done'` and `user_id` matching that profile. Without those, medal/notification UI has no data to show.

---

## Task 1 — Extend MEDALS data + add ICONS

**Why first:** everything downstream (renderMedals, toast, benefits table) reads from a unified `MEDALS` array. Lock the shape before building against it.

**Files:**
- Modify: `js/cabinet.js:418-423` (existing `MEDALS` const inside `loadProfile`) — move to module scope and extend
- Modify: `js/cabinet.js:240` (existing `ICONS` map) — add 7 new icons

- [ ] **Step 1.1 — Promote `MEDALS` to module scope**

Currently `MEDALS` lives inside `loadProfile`. Cut it out to the top of `js/cabinet.js`, just after `ICONS` definition. Extend each entry with `name`, `benefit`, `svg`:

```js
const MEDALS = [
  {
    id: 'bronze',
    threshold: 1,
    toNext: 'бронзы',
    name: 'Бронза',
    benefit: 'Доступ к кабинету · напоминания',
    svg: `<svg viewBox="0 0 64 64" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="32" cy="38" r="18" fill="#cd7f32" fill-opacity=".25"/><circle cx="32" cy="38" r="18"/><path d="M20 24L14 6h36L44 24"/><circle cx="32" cy="38" r="10" stroke-opacity=".5"/></svg>`,
  },
  {
    id: 'silver',
    threshold: 3,
    toNext: 'серебра',
    name: 'Серебро',
    benefit: 'Приоритет брони в high-season',
    svg: `<svg viewBox="0 0 64 64" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="32" cy="38" r="18" fill="#c0c0c0" fill-opacity=".25"/><circle cx="32" cy="38" r="18"/><path d="M20 24L14 6h36L44 24"/><circle cx="32" cy="38" r="10" stroke-opacity=".5"/></svg>`,
  },
  {
    id: 'gold',
    threshold: 5,
    toNext: 'золота',
    name: 'Золото',
    benefit: 'Скидка 10% · расширенное окно записи',
    svg: `<svg viewBox="0 0 64 64" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="32" cy="38" r="18" fill="#c4a882" fill-opacity=".35"/><circle cx="32" cy="38" r="18"/><path d="M20 24L14 6h36L44 24"/><circle cx="32" cy="38" r="10" stroke-opacity=".5"/></svg>`,
  },
  {
    id: 'platinum',
    threshold: 10,
    toNext: null,
    name: 'Платина',
    benefit: 'Скидка 15% · приватные слоты',
    svg: `<svg viewBox="0 0 64 64" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="32" cy="38" r="18" fill="#e5e4e2" fill-opacity=".4"/><circle cx="32" cy="38" r="18"/><path d="M20 24L14 6h36L44 24"/><circle cx="32" cy="38" r="10" stroke-opacity=".5"/><path d="M26 38l4 4 8-8" stroke-width="2"/></svg>`,
  },
];
```

Inside `loadProfile`, remove the local `const MEDALS = [...]` block (lines `js/cabinet.js:418-423`) — callers now reference the module-scoped const.

- [ ] **Step 1.2 — Add 3 ICONS for empty states + header decorations**

Find `const ICONS = {` in `js/cabinet.js` (around line 240). Append three entries before the closing brace:

```js
  calendar:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  hourglass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12v4l-4 6 4 6v4H6v-4l4-6-4-6z"/><path d="M8 22h8"/></svg>`,
  sparkle:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/></svg>`,
```

- [ ] **Step 1.3 — Verify file parses**

Run:
```bash
node --check js/cabinet.js
```
Expected: no output (clean parse). If it errors, fix the syntax before continuing.

- [ ] **Step 1.4 — Commit**

```bash
git add js/cabinet.js
git commit -m "refactor(cabinet): promote MEDALS to module scope, extend with name/benefit/svg + add 3 empty-state icons"
```

---

## Task 2 — Add `#tab-medals` HTML skeleton

**Files:**
- Modify: `cabinet.html:89-106` (the `#tab-home` section with hidden anchors) — remove hidden anchor block
- Modify: `cabinet.html` — insert new `<section id="tab-medals">` after `#tab-notifications` (around line 127)

- [ ] **Step 2.1 — Remove legacy hidden anchors**

Open `cabinet.html`. Find the `<!-- hidden legacy anchors -->` block (lines 93-105). Delete all 14 lines from `<!-- hidden legacy anchors` through `</div>` immediately before `</section>` of `#tab-home`.

Leaves `#tab-home` as:
```html
<section class="cab-tab active" id="tab-home">
  <div class="orbital-wrap">
    <div id="cab-orbital"></div>
  </div>
</section>
```

- [ ] **Step 2.2 — Insert `#tab-medals` section**

Find `</section>` that closes `#tab-notifications` (around line 126). Immediately after it, before `<section class="cab-tab hidden" id="tab-profile">`, insert:

```html
<section class="cab-tab hidden" id="tab-medals">
  <header class="medals-head">
    <h2>Медали</h2>
    <p class="medals-sub" id="medals-current-desc">Прогресс клиента REMNANT</p>
  </header>

  <div class="medals-progress">
    <div class="medals-progress__labels">
      <span id="medals-visits-label">—</span>
      <span id="medals-next-label">—</span>
    </div>
    <div class="medals-progress__track">
      <div class="medals-progress__fill" id="medals-progress-fill"></div>
    </div>
  </div>

  <div class="medals-grid" id="medals-grid"></div>

  <section class="medals-benefits">
    <h3>Как получить</h3>
    <table class="medals-benefits__table">
      <thead><tr><th>Уровень</th><th>Визитов</th><th>Бонус</th></tr></thead>
      <tbody id="medals-benefits-body"></tbody>
    </table>
  </section>
</section>
```

- [ ] **Step 2.3 — Smoke check**

Start the app (see Testing Approach). Open cabinet, log in. Open DevTools Console and run:
```js
document.getElementById('tab-medals')
```
Expected: returns the `<section>` element (not null), and it's `.hidden` (CSS `display:none` or equivalent).

- [ ] **Step 2.4 — Commit**

```bash
git add cabinet.html
git commit -m "feat(cabinet): add #tab-medals skeleton, remove legacy hidden medal anchors"
```

---

## Task 3 — `renderMedals` + `medalEarnedDates` + static rendering

**Why:** render the section with real data before any animation. If it doesn't look right static, animations won't save it.

**Files:**
- Modify: `js/cabinet.js` — add 3 functions; hook up `renderMedals` in `loadProfile`; retarget orbital node 4
- Modify: `css/cabinet.css` — minimum CSS to see cards rendered (no animations yet)

- [ ] **Step 3.1 — Add `medalEarnedDates` helper**

Inside `js/cabinet.js`, near other supabase-query helpers (after `loadNotifications`, near line 856), add:

```js
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

- [ ] **Step 3.2 — Add `buildMedalCard` helper**

Append in `js/cabinet.js` (near orbital-nav helpers):

```js
function buildMedalCard({ medal, state, earnedDate, remaining }) {
  const card = document.createElement('article');
  card.className = `medal-card medal-card--${state}`;
  card.dataset.tier = medal.id;
  card.setAttribute('aria-label', medal.name);

  const backLabel = state === 'earned' || state === 'active' ? 'Получена' : 'Заблокировано';
  const backValue = earnedDate
    ? new Date(earnedDate + 'T00:00').toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })
    : `осталось ${remaining} визит${pluralVisit(remaining)}`;

  card.innerHTML = `
    <div class="medal-card__inner">
      <div class="medal-card__front">
        <div class="medal-card__icon">${medal.svg}</div>
        <div class="medal-card__name">${escapeHtml(medal.name)}</div>
        <div class="medal-card__req">${medal.threshold} визит${pluralVisit(medal.threshold)}</div>
      </div>
      <div class="medal-card__back">
        <div class="medal-card__date-label">${backLabel}</div>
        <div class="medal-card__date">${escapeHtml(backValue)}</div>
      </div>
    </div>
  `;
  return card;
}
```

`escapeHtml` and `pluralVisit` already exist in `cabinet.js` — confirm with:
```bash
grep -n "function escapeHtml\|function pluralVisit" js/cabinet.js
```
If either is missing, copy from a similar util file or write a 3-line implementation. (As of session 2026-04-19 both exist.)

- [ ] **Step 3.3 — Add `renderMedals` main function**

Add to `js/cabinet.js`:

```js
function renderMedals({ visits, tierIdx, doneDates }) {
  // Progress labels
  const nextIdx = tierIdx + 1;
  const from    = tierIdx >= 0 ? MEDALS[tierIdx].threshold : 0;
  let medalPct = 0;
  let medalNextText = 'Максимальный уровень';
  if (nextIdx < MEDALS.length) {
    const to = MEDALS[nextIdx].threshold;
    medalPct = Math.min(100, ((visits - from) / (to - from)) * 100);
    const rem = to - visits;
    medalNextText = `До ${MEDALS[nextIdx].toNext}: ${rem} визит${pluralVisit(rem)}`;
  } else {
    medalPct = 100;
  }

  document.getElementById('medals-visits-label').textContent = `${visits} визит${pluralVisit(visits)}`;
  document.getElementById('medals-next-label').textContent   = medalNextText;
  document.getElementById('medals-progress-fill').style.width = `${medalPct}%`;

  const currentDesc = document.getElementById('medals-current-desc');
  if (currentDesc && tierIdx >= 0) currentDesc.textContent = `${MEDALS[tierIdx].benefit}`;
  else if (currentDesc) currentDesc.textContent = 'Первая медаль — после первого визита в студию';

  // Cards
  const grid = document.getElementById('medals-grid');
  grid.innerHTML = '';
  MEDALS.forEach((medal, i) => {
    const state = i < tierIdx ? 'earned' : i === tierIdx ? 'active' : 'locked';
    const earnedDate = doneDates[medal.threshold - 1] || null;
    const remaining  = Math.max(0, medal.threshold - visits);
    grid.appendChild(buildMedalCard({ medal, state, earnedDate, remaining }));
  });

  // Benefits table
  const tbody = document.getElementById('medals-benefits-body');
  if (tbody) {
    tbody.innerHTML = MEDALS.map(m =>
      `<tr><td>${escapeHtml(m.name)}</td><td>${m.threshold}</td><td>${escapeHtml(m.benefit)}</td></tr>`
    ).join('');
  }
}
```

- [ ] **Step 3.4 — Call `renderMedals` from `loadProfile`**

In `js/cabinet.js`, inside `loadProfile` (around line 407), after `tierIdx` is computed (was at ~line 432) and **before** the section that sets `#medals-fill.style.width` (which we'll remove), add:

```js
const doneDates = await medalEarnedDates(user.id);
renderMedals({ visits, tierIdx, doneDates });
```

Then **remove** the now-redundant legacy lines:
- The inner duplicate `function pluralVisit(n) { ... }` inside `loadProfile` (`cabinet.js:424-429`) — the module-scope version at line 381 is identical.
- The `MEDALS.forEach` loop that wrote classes to `#medal-bronze/silver/gold/platinum` (`cabinet.js:434-441`).
- The `visitsEl/nextEl/fillEl` lookup+assign block writing to `#medals-visits-text`, `#medals-next-text`, `#medals-fill` (`cabinet.js:454-459`).

Also remove: the `nextIdx/from/medalPct/medalNextText` computation inside `loadProfile` (`cabinet.js:442-453`) — it's now owned by `renderMedals`.

`renderMedals` takes over all of the above.

- [ ] **Step 3.5 — Retarget orbital node 4 to `#tab-medals`**

In `js/cabinet.js` around line 337, find the node with `title: 'Медали'`. Change:
```js
onActivate: () => showTab('profile'),
```
to:
```js
onActivate: () => showTab('medals'),
```

Also update `ctaLabel` to `'Открыть медали'`.

- [ ] **Step 3.6 — Add minimum CSS for cards**

In `css/cabinet.css` append:

```css
/* ══ Medals tab ═══════════════════════════════════ */
#tab-medals { padding: 32px 24px; max-width: 960px; margin: 0 auto; }
.medals-head { text-align: center; margin-bottom: 32px; }
.medals-head h2 {
  font-family: var(--font-serif);
  font-size: 2rem;
  font-weight: 400;
  margin: 0 0 8px;
  letter-spacing: 0.05em;
}
.medals-sub { color: var(--muted); margin: 0; font-size: 0.95rem; }

.medals-progress { margin-bottom: 40px; }
.medals-progress__labels {
  display: flex; justify-content: space-between;
  font-size: 0.82rem; color: var(--muted);
  margin-bottom: 8px;
}
.medals-progress__track {
  height: 6px;
  background: rgba(255,255,255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}
.medals-progress__fill {
  height: 100%;
  background: var(--accent);
  width: 0;
  transition: width 0.6s ease;
}

.medals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 48px;
}

.medal-card {
  position: relative;
  aspect-ratio: 3 / 4;
  cursor: pointer;
  perspective: 1000px;
}
.medal-card__inner {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 16px;
  background: var(--surface);
  border: 1px solid rgba(255,255,255, 0.08);
  border-radius: 12px;
  text-align: center;
}
.medal-card__icon { color: var(--accent); margin-bottom: 12px; }
.medal-card__name {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}
.medal-card__req { color: var(--muted); font-size: 0.78rem; }

.medal-card__back { display: none; } /* hidden until flip task */

.medals-benefits { margin-top: 32px; }
.medals-benefits h3 {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  font-weight: 400;
  margin: 0 0 16px;
}
.medals-benefits__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.medals-benefits__table th,
.medals-benefits__table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255, 0.06);
}
.medals-benefits__table th {
  color: var(--muted);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
}
```

- [ ] **Step 3.7 — Smoke check**

Reload cabinet. Click «Медали» узел в орбите (или вручную в консоли: `showTab('medals')`).

Expected:
- Таб «Медали» открывается.
- Видно прогресс-шкалу с текстом вида `5 визитов` слева, `До платины: 5 визитов` справа (или подходящее для твоих данных).
- 4 карточки в сетке, иконки видны, имена «Бронза/Серебро/Золото/Платина», требования.
- Таблица «Как получить» внизу с 4 строками.
- Назад-кнопка возвращает в орбиту.

Если пусто — проверить DevTools Network: вызов к Supabase `bookings` прошёл успешно, `profiles` вернул `visit_count`.

- [ ] **Step 3.8 — Commit**

```bash
git add js/cabinet.js css/cabinet.css
git commit -m "feat(cabinet): render static medals tab from visit_count + done bookings"
```

---

## Task 4 — Animated progress fill

**Files:**
- Modify: `js/cabinet.js` — add `animateProgressFill`, use instead of static width
- Modify: `css/cabinet.css` — remove CSS `transition: width`, let JS drive it

- [ ] **Step 4.1 — Add `animateProgressFill` helper**

In `js/cabinet.js`, near `renderMedals`:

```js
function animateProgressFill(targetPct) {
  const el = document.getElementById('medals-progress-fill');
  if (!el) return;
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(el, { width: '0%' }, {
      width: `${targetPct}%`,
      duration: 0.9,
      ease: 'cubic-bezier(.25,.46,.45,.94)',
    });
  } else {
    el.style.width = `${targetPct}%`;
  }
}
```

- [ ] **Step 4.2 — Replace static width setter**

In `renderMedals` (added Task 3), find:
```js
document.getElementById('medals-progress-fill').style.width = `${medalPct}%`;
```
Replace with:
```js
animateProgressFill(medalPct);
```

- [ ] **Step 4.3 — Remove CSS transition**

In `css/cabinet.css`, in `.medals-progress__fill` rule, delete:
```css
transition: width 0.6s ease;
```
(GSAP drives the tween now; leaving CSS transition would double-animate.)

- [ ] **Step 4.4 — Smoke check**

Reload cabinet, switch to medals tab. Progress bar animates from 0 to target % visibly (~0.9s).

- [ ] **Step 4.5 — Commit**

```bash
git add js/cabinet.js css/cabinet.css
git commit -m "feat(cabinet): animate medals progress bar via GSAP"
```

---

## Task 5 — Staggered intro animation

**Files:**
- Modify: `js/cabinet.js` — `animateMedalsIntro`, session flag

- [ ] **Step 5.1 — Add session flag and animation function**

In `js/cabinet.js`, at module scope near MEDALS:

```js
let _medalsIntroPlayed = false;
```

Add function near `renderMedals`:

```js
function animateMedalsIntro() {
  if (_medalsIntroPlayed) return;
  if (typeof gsap === 'undefined') return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  _medalsIntroPlayed = true;
  gsap.fromTo('.medal-card',
    { opacity: 0, scale: 0.8, y: 20 },
    { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.15 }
  );
}
```

- [ ] **Step 5.2 — Call on tab open, not on render**

Find `showTab` function in `js/cabinet.js`. After the body that shows the target tab, add:

```js
if (name === 'medals') animateMedalsIntro();
```

- [ ] **Step 5.3 — Set initial hidden state via CSS (so first paint doesn't flash)**

In `css/cabinet.css`, add:
```css
#tab-medals .medal-card {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}
/* When GSAP has run, cards have inline styles that override.
   When reduced-motion is on, we reset to visible immediately: */
@media (prefers-reduced-motion: reduce) {
  #tab-medals .medal-card {
    opacity: 1;
    transform: none;
  }
}
```

- [ ] **Step 5.4 — Smoke check**

Reload cabinet. Switch to medals tab. Cards appear left-to-right with 150ms stagger, scaling from 0.8 to 1.

Switch away and back — no re-animation (session flag).

Enable macOS → Accessibility → Reduce motion → reload → switch to medals → cards visible immediately, no animation.

- [ ] **Step 5.5 — Commit**

```bash
git add js/cabinet.js css/cabinet.css
git commit -m "feat(cabinet): staggered intro animation for medal cards on first tab open"
```

---

## Task 6 — Shimmer + breathing glow + locked hatch

**Files:**
- Modify: `css/cabinet.css` — 4 keyframes + state rules

- [ ] **Step 6.1 — Add all 4 ambient animation rules**

Append to `css/cabinet.css`:

```css
/* Shimmer on active progress */
@keyframes medals-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.medals-progress__fill {
  background: linear-gradient(90deg,
    var(--accent) 0%,
    rgba(255, 220, 150, 1) 50%,
    var(--accent) 100%);
  background-size: 200% 100%;
  animation: medals-shimmer 2.4s linear infinite;
}

/* Breathing glow on active medal */
@keyframes medal-breathe {
  0%, 100% { box-shadow: 0 0 0 rgba(196, 168, 130, 0); }
  50%      { box-shadow: 0 0 24px rgba(196, 168, 130, 0.45); }
}
.medal-card--active .medal-card__inner {
  animation: medal-breathe 3s ease-in-out infinite;
  border-color: rgba(196, 168, 130, 0.4);
}

/* Earned hover lift */
.medal-card--earned .medal-card__inner {
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.medal-card--earned:hover .medal-card__inner {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(196, 168, 130, 0.25);
}

/* Locked — grayscale + cross-hatch */
.medal-card--locked .medal-card__inner {
  filter: grayscale(0.6) brightness(0.85);
}
.medal-card--locked .medal-card__inner::after {
  content: '';
  position: absolute; inset: 0;
  background-image: repeating-linear-gradient(45deg,
    transparent 0 6px,
    rgba(255, 255, 255, 0.04) 6px 7px);
  pointer-events: none;
  border-radius: inherit;
}
```

- [ ] **Step 6.2 — Smoke check**

Reload cabinet → medals tab. Observe:
- Active medal's inner card has a soft gold pulse (3s loop).
- Progress fill has a moving shimmer gradient.
- Locked medals look muted grey with diagonal hatch pattern.
- Hover on earned medal → card lifts 4px.

- [ ] **Step 6.3 — Commit**

```bash
git add css/cabinet.css
git commit -m "style(cabinet): shimmer on progress, breathing glow on active medal, hatch on locked"
```

---

## Task 7 — 3D flip + haptic

**Files:**
- Modify: `css/cabinet.css` — flip rules, override `.medal-card__back { display: none }` from Task 3
- Modify: `js/cabinet.js` — click delegation on `#medals-grid`
- Modify: CSS — special `#tab-medals.hidden` rule to keep 3D context stable

- [ ] **Step 7.1 — Add flip CSS**

In `css/cabinet.css`, **remove** the stub `.medal-card__back { display: none; }` rule from Task 3. Then append:

```css
/* 3D flip */
.medal-card__inner {
  position: absolute; inset: 0;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(.25, .46, .45, .94);
}
.medal-card--flipped .medal-card__inner { transform: rotateY(180deg); }

.medal-card__front,
.medal-card__back {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 16px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: inherit;
}
.medal-card__back { transform: rotateY(180deg); }

.medal-card__date-label {
  color: var(--muted);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.medal-card__date {
  font-family: var(--font-serif);
  font-size: 1rem;
  line-height: 1.3;
  max-width: 100%;
}
```

- [ ] **Step 7.2 — Fix Safari iOS tab-switching (visibility mode)**

Find the existing rule for `.cab-tab.hidden` in `css/cabinet.css` (or add if not present). To avoid `preserve-3d` glitches when the medals tab is first shown, add a more-specific override:

```css
#tab-medals.hidden {
  display: block !important;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  left: -9999px;
}
#tab-medals:not(.hidden) {
  position: relative;
  left: auto;
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
}
```

(This keeps the DOM laid out off-screen so 3D transforms are ready on first show.)

- [ ] **Step 7.3 — Add click handler**

In `js/cabinet.js`, inside `renderMedals` at the end, after cards are appended:

```js
const grid = document.getElementById('medals-grid');
grid.onclick = (e) => {
  const card = e.target.closest('.medal-card');
  if (!card) return;
  card.classList.toggle('medal-card--flipped');
  if ('vibrate' in navigator) navigator.vibrate(50);
};
```

(Using `onclick` — not `addEventListener` — because `renderMedals` may re-run on reloads; assigning a property replaces rather than accumulates.)

- [ ] **Step 7.4 — Smoke check**

Reload cabinet → medals tab. Click any card → 3D flip (0.6s), back shows «Получена DD MMM YYYY» for earned/active or «осталось N визитов» for locked. Click again → flips back.

On iPhone: open Safari, login, go to medals. Flip works without flashing white or ghosting. Taptic feedback (subtle single vibrate) on flip.

If Safari shows glitch on first open: reload with Web Inspector, confirm `#tab-medals` has non-`display:none` initial state (per Step 7.2). If still glitching, the fallback is to remove `preserve-3d` and use a crossfade instead — but try first.

- [ ] **Step 7.5 — Commit**

```bash
git add js/cabinet.js css/cabinet.css
git commit -m "feat(cabinet): 3D flip on medal cards with haptic feedback; visibility-based tab hide for iOS Safari"
```

---

## Task 8 — Particle burst on new medal

**Files:**
- Modify: `js/cabinet.js` — `particleBurst` function + trigger

- [ ] **Step 8.1 — Add `particleBurst` function**

In `js/cabinet.js`, near other canvas/animation helpers:

```js
function particleBurst(target, opts = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (navigator.deviceMemory && navigator.deviceMemory < 4) return;

  const rect = target.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = 200; canvas.height = 200;
  canvas.style.cssText = `
    position: fixed;
    left: ${rect.left + rect.width / 2 - 100}px;
    top: ${rect.top + rect.height / 2 - 100}px;
    width: 200px; height: 200px;
    pointer-events: none;
    z-index: 999;
  `;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const N = opts.count || 30;
  const particles = Array.from({ length: N }, () => ({
    x: 100, y: 100,
    vx: (Math.random() - 0.5) * 8,
    vy: (Math.random() - 0.5) * 8 - 2,
    life: 1,
    size: 2 + Math.random() * 3,
  }));

  let frame = 0;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= 0.018;
      if (p.life <= 0) return;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = '#c4a882';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    frame++;
    if (frame < 90) requestAnimationFrame(tick);
    else canvas.remove();
  }
  tick();

  if ('vibrate' in navigator) navigator.vibrate([30, 20, 60]);
}
```

- [ ] **Step 8.2 — Trigger burst on first view of newly-earned medal**

In `js/cabinet.js`, modify `showTab('medals')` / `animateMedalsIntro` entry. Add helper near `animateMedalsIntro`:

```js
function triggerBurstForNewMedals(userId, tierIdx) {
  if (tierIdx < 0) return;
  const burstKey = `medals_burst_seen_${userId}`;
  const burstSeen = new Set(JSON.parse(localStorage.getItem(burstKey) || '[]'));
  const currentId = MEDALS[tierIdx].id;
  if (burstSeen.has(currentId)) return;

  const card = document.querySelector(`.medal-card[data-tier="${currentId}"]`);
  if (!card) return;

  // Delay to let intro stagger finish
  setTimeout(() => particleBurst(card), 150 * (tierIdx + 1) + 400);

  burstSeen.add(currentId);
  localStorage.setItem(burstKey, JSON.stringify([...burstSeen]));
}
```

Store userId at module scope when loadProfile runs. Add near top of `js/cabinet.js`:
```js
let _currentUserId = null;
```
In `loadProfile`, at the start: `_currentUserId = user.id;`

Update the `showTab('medals')` branch to also call:
```js
if (name === 'medals') {
  animateMedalsIntro();
  // tierIdx is computed inside loadProfile; expose it via a module var
  if (_currentUserId != null && _currentTierIdx != null) {
    triggerBurstForNewMedals(_currentUserId, _currentTierIdx);
  }
}
```

Add `let _currentTierIdx = null;` at module scope. In `loadProfile`, after computing `tierIdx`, add `_currentTierIdx = tierIdx;`.

- [ ] **Step 8.3 — Smoke check**

Clear burst tracking:
```js
localStorage.removeItem(`medals_burst_seen_${_currentUserId}`);
```
(Replace `_currentUserId` with the actual user UUID from DevTools.)

Reload cabinet → open medals tab. Over the active medal card, ~30 gold dots explode outward with gravity, fade over 1.5s. Haptic pattern on mobile.

Switch away and back — no burst second time (key stored).

- [ ] **Step 8.4 — Commit**

```bash
git add js/cabinet.js
git commit -m "feat(cabinet): particle burst over active medal on first-ever view per level"
```

---

## Task 9 — Reduced-motion and low-memory guards

**Files:**
- Modify: `css/cabinet.css` — single reduced-motion block

- [ ] **Step 9.1 — Append reduced-motion media query**

At the end of `css/cabinet.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .medal-card__inner,
  .medals-progress__fill,
  .medal-card--active .medal-card__inner,
  .medal-card--earned .medal-card__inner {
    animation: none !important;
    transition: none !important;
  }
  .medal-card--flipped .medal-card__inner {
    transform: rotateY(180deg); /* instant, no tween */
  }
  .medal-card--earned:hover .medal-card__inner {
    transform: none;
    box-shadow: none;
  }
}
```

(JS-side guards for GSAP and particles are already in Tasks 5 and 8.)

- [ ] **Step 9.2 — Smoke check**

macOS → System Settings → Accessibility → Reduce motion → ON. Reload cabinet → medals tab.

Expected:
- No stagger on cards.
- Progress bar fills instantly.
- No shimmer.
- No breathing glow.
- Flip still works but instant.
- Hover no-op.
- No particle burst.

- [ ] **Step 9.3 — Commit**

```bash
git add css/cabinet.css
git commit -m "a11y(cabinet): respect prefers-reduced-motion on medals tab"
```

---

## Task 10 — Medal toast on upgrade

**Files:**
- Modify: `js/cabinet.js` — `showMedalToast` + trigger in `loadProfile`
- Modify: `css/cabinet.css` — toast styles

- [ ] **Step 10.1 — Add `showMedalToast` function**

In `js/cabinet.js`, near other UI helpers:

```js
function showMedalToast(medal) {
  document.querySelectorAll('.medal-toast').forEach(n => n.remove());

  const toast = document.createElement('div');
  toast.className = 'medal-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <div class="medal-toast__icon">${medal.svg}</div>
    <div class="medal-toast__body">
      <div class="medal-toast__title">Получен уровень «${escapeHtml(medal.name)}»</div>
      <div class="medal-toast__sub">${escapeHtml(medal.benefit)}</div>
    </div>
    <button class="medal-toast__cta" type="button">Посмотреть</button>
    <button class="medal-toast__close" aria-label="Закрыть" type="button">×</button>
  `;
  document.body.appendChild(toast);

  // Trigger slide-in after DOM insert
  requestAnimationFrame(() => toast.classList.add('medal-toast--visible'));

  const dismiss = () => {
    toast.classList.remove('medal-toast--visible');
    setTimeout(() => toast.remove(), 400);
  };

  toast.querySelector('.medal-toast__cta').addEventListener('click', () => {
    dismiss();
    showTab('medals');
  });
  toast.querySelector('.medal-toast__close').addEventListener('click', dismiss);
  setTimeout(dismiss, 5000);
}
```

- [ ] **Step 10.2 — Trigger from `loadProfile`**

In `loadProfile`, **after** `renderMedals(...)`, add:

```js
const seenKey = `medals_seen_${user.id}`;
const seen    = JSON.parse(localStorage.getItem(seenKey) || '[]');
const earnedIds = MEDALS.slice(0, tierIdx + 1).map(m => m.id);
const freshIds  = earnedIds.filter(id => !seen.includes(id));
if (freshIds.length) {
  const topNew = MEDALS.find(m => m.id === freshIds[freshIds.length - 1]);
  if (topNew) showMedalToast(topNew);
  localStorage.setItem(seenKey, JSON.stringify(earnedIds));
}
```

- [ ] **Step 10.3 — Toast CSS**

Append to `css/cabinet.css`:

```css
.medal-toast {
  position: fixed;
  top: 24px; right: 24px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  min-width: 320px;
  max-width: 400px;
  background: var(--surface);
  border: 1px solid rgba(196, 168, 130, 0.35);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
  transform: translateX(120%);
  transition: transform 0.4s cubic-bezier(.25, .46, .45, .94);
}
.medal-toast--visible { transform: translateX(0); }
.medal-toast__icon { color: var(--accent); flex: 0 0 40px; }
.medal-toast__body { flex: 1; min-width: 0; }
.medal-toast__title {
  font-family: var(--font-serif);
  font-size: 1rem;
  margin-bottom: 2px;
}
.medal-toast__sub {
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.3;
}
.medal-toast__cta {
  background: var(--accent);
  color: var(--bg);
  border: none;
  padding: 6px 12px;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 4px;
  cursor: pointer;
}
.medal-toast__close {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}
.medal-toast__close:hover { color: var(--text); }

@media (max-width: 560px) {
  .medal-toast {
    top: 16px; left: 16px; right: 16px;
    min-width: 0; max-width: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .medal-toast { transition: none; transform: translateX(0); }
}
```

- [ ] **Step 10.4 — Smoke check**

In DevTools Console:
```js
localStorage.removeItem(`medals_seen_${_currentUserId}`);
```
Reload cabinet. Toast slides in from right within ~500ms of profile load, shows current top medal, auto-dismisses after 5s. Click «Посмотреть» → opens medals tab + dismisses toast. Click × → dismisses.

Open medals tab directly (no reload) → toast does NOT re-show (key written). On mobile viewport — toast full-width at top.

- [ ] **Step 10.5 — Commit**

```bash
git add js/cabinet.js css/cabinet.css
git commit -m "feat(cabinet): slide-in toast on medal upgrade with CTA to medals tab"
```

---

## Task 11 — Notifications: extended select + expand/collapse markup

**Files:**
- Modify: `js/cabinet.js` — `loadNotifications` (expand select, rebuild markup), add delegate click handler
- Modify: `css/cabinet.css` — expand styles

- [ ] **Step 11.1 — Widen Supabase select in `loadNotifications`**

Find `loadNotifications` in `js/cabinet.js` (around line 813). Change the `.select(...)` call:

```js
.select('id, date, time_slot, style, status, notes, reference_url, created_at')
```

- [ ] **Step 11.2 — Rebuild notif-item markup**

Inside `loadNotifications`, replace the current `item.innerHTML = ...` block with:

```js
const d = new Date(b.date + 'T00:00');
const dateLong = d.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });
const notesBlock = b.notes
  ? `<div class="notif-detail__notes">${escapeHtml(b.notes)}</div>`
  : '';
const refBlock = b.reference_url
  ? `<img class="notif-detail__ref" src="${escapeHtml(b.reference_url)}" alt="Референс" loading="lazy" data-ref="${escapeHtml(b.reference_url)}">`
  : '';

item.dataset.id = b.id;
item.innerHTML = `
  <div class="notif-item__summary">
    <div class="notif-dot ${isRead ? 'read' : ''}"></div>
    <div class="notif-body">
      <div class="notif-text">${msg}</div>
      <div class="notif-time">${new Date(b.created_at).toLocaleDateString('ru')}</div>
    </div>
    <button class="notif-expand" aria-label="Раскрыть" aria-expanded="false" type="button">▾</button>
  </div>
  <div class="notif-item__detail" hidden>
    <div class="notif-detail__row">
      <span class="notif-detail__label">Дата</span>
      <span class="notif-detail__value">${dateLong}${b.time_slot ? ' · ' + escapeHtml(b.time_slot) : ''}</span>
    </div>
    <div class="notif-detail__row">
      <span class="notif-detail__label">Стиль</span>
      <span class="notif-detail__value">${escapeHtml(b.style || '—')}</span>
    </div>
    <div class="notif-detail__row">
      <span class="notif-detail__label">Статус</span>
      <span class="status-badge ${escapeHtml(b.status)}">${STATUS_RU[b.status] || escapeHtml(b.status)}</span>
    </div>
    ${notesBlock}
    ${refBlock}
    <div class="notif-detail__actions">
      <button class="btn-ghost notif-detail__goto" data-id="${escapeHtml(String(b.id))}" type="button">Открыть в Записях</button>
    </div>
  </div>
`;
```

- [ ] **Step 11.3 — Add delegated click handler**

In `loadNotifications`, after list is populated, add:

```js
list.onclick = (e) => {
  const item = e.target.closest('.notif-item');
  if (!item) return;
  if (e.target.closest('.notif-detail__ref')) {
    openRefLightbox(e.target.dataset.ref);
    e.stopPropagation();
    return;
  }
  if (e.target.closest('.notif-detail__goto')) {
    jumpToBookingCard(e.target.dataset.id);
    return;
  }

  // Close other expanded items
  list.querySelectorAll('.notif-item.expanded').forEach(el => {
    if (el !== item) {
      el.classList.remove('expanded');
      const btn = el.querySelector('.notif-expand');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      const det = el.querySelector('.notif-item__detail');
      if (det) det.hidden = true;
    }
  });

  // Toggle current
  const isExpanded = item.classList.toggle('expanded');
  const btn = item.querySelector('.notif-expand');
  if (btn) btn.setAttribute('aria-expanded', String(isExpanded));
  const det = item.querySelector('.notif-item__detail');
  if (det) det.hidden = !isExpanded;

  // Mark as read on first open
  if (isExpanded && item.classList.contains('unread')) {
    markNotifRead(userId, item.dataset.id, bookings);
  }
};
```

`markNotifRead` and `jumpToBookingCard` are defined in Tasks 12 and 13 — they are referenced here but must land before or together with this task. Leave stubs now to avoid runtime errors when testing Task 11 alone:

```js
function markNotifRead(_userId, _id, _bookings) {}
function jumpToBookingCard(_id) { showTab('bookings'); }
```

(They'll be fleshed out in Tasks 12 and 13.)

- [ ] **Step 11.4 — Expand CSS**

Append to `css/cabinet.css`:

```css
.notif-item {
  cursor: pointer;
  transition: background 0.2s ease;
}
.notif-item:hover { background: rgba(255, 255, 255, 0.02); }
.notif-item__summary { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.notif-expand {
  background: none; border: none;
  color: var(--muted);
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.25s ease, color 0.2s ease;
  padding: 4px 8px;
}
.notif-item.expanded .notif-expand { transform: rotate(180deg); color: var(--accent); }

.notif-item__detail {
  padding: 0 16px 16px 40px;
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height 0.3s ease, opacity 0.25s ease, padding 0.25s ease;
}
.notif-item__detail[hidden] { display: none; } /* a11y fallback */
.notif-item.expanded .notif-item__detail {
  max-height: 600px;
  opacity: 1;
}
.notif-detail__row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 0.84rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.notif-detail__label { color: var(--muted); letter-spacing: 0.06em; text-transform: uppercase; font-size: 0.7rem; }
.notif-detail__value { color: var(--text); text-align: right; }
.notif-detail__notes {
  margin-top: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  font-size: 0.84rem;
  color: var(--text);
  line-height: 1.45;
}
.notif-detail__ref {
  display: block;
  margin-top: 12px;
  max-width: 140px;
  height: auto;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: zoom-in;
}
.notif-detail__actions { margin-top: 14px; }
.notif-detail__goto {
  padding: 8px 14px;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (prefers-reduced-motion: reduce) {
  .notif-expand, .notif-item__detail { transition: none !important; }
}
```

- [ ] **Step 11.5 — Smoke check**

Reload cabinet → notifications tab. Each item has a caret `▾` on the right. Click anywhere in item → caret rotates, detail block slides down showing date/time/style/status/notes/ref.

Click another item → previous collapses, new expands.

Click ref-thumb in detail → opens existing lightbox (Esc closes).

Click «Открыть в Записях» → switches to bookings tab (stub behavior for now — full jump lands in Task 13).

- [ ] **Step 11.6 — Commit**

```bash
git add js/cabinet.js css/cabinet.css
git commit -m "feat(cabinet): inline-expandable notification cards with full booking details"
```

---

## Task 12 — `markNotifRead` + `updateNotifBadge`

**Files:**
- Modify: `js/cabinet.js` — replace stubs with real implementations

- [ ] **Step 12.1 — Replace `markNotifRead` stub**

Find the stub `function markNotifRead(_userId, _id, _bookings) {}` from Task 11 and replace with:

```js
function markNotifRead(userId, bookingId, bookings) {
  const booking = (bookings || []).find(b => String(b.id) === String(bookingId));
  if (!booking) return;
  const readKey = 'notif_read_' + userId;
  const read = new Set(JSON.parse(localStorage.getItem(readKey) || '[]'));
  read.add(`${bookingId}-${booking.status}`);
  localStorage.setItem(readKey, JSON.stringify([...read]));

  const item = document.querySelector(`.notif-item[data-id="${CSS.escape(String(bookingId))}"]`);
  if (item) {
    item.classList.remove('unread');
    const dot = item.querySelector('.notif-dot');
    if (dot) dot.classList.add('read');
  }

  updateNotifBadge();
}
```

- [ ] **Step 12.2 — Add `updateNotifBadge`**

```js
function updateNotifBadge() {
  const unread = document.querySelectorAll('.notif-item.unread').length;
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  if (unread > 0) {
    badge.textContent = unread;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}
```

- [ ] **Step 12.3 — Smoke check**

Reload cabinet. Notifications tab: click an unread item (grey dot becomes read-colored, text bold removed if any, badge in topbar decrements by 1).

Click «Прочитать все» — all items become read, badge hides.

- [ ] **Step 12.4 — Commit**

```bash
git add js/cabinet.js
git commit -m "feat(cabinet): mark notifications read on first expand with live badge update"
```

---

## Task 13 — `jumpToBookingCard` with pulse

**Files:**
- Modify: `js/cabinet.js` — replace stub; add `data-id` in `renderBookings`
- Modify: `css/cabinet.css` — pulse keyframe

- [ ] **Step 13.1 — Add `data-id` attribute in `renderBookings`**

Find `renderBookings` in `js/cabinet.js` (around line 711). Inside the `filtered.forEach(b => { ... })` loop, after `card.className = 'booking-card';`, add:

```js
card.dataset.id = b.id;
```

- [ ] **Step 13.2 — Replace `jumpToBookingCard` stub**

Replace the stub from Task 11:

```js
function jumpToBookingCard(bookingId) {
  const booking = (window._allBookings || []).find(b => String(b.id) === String(bookingId));
  if (!booking) { showTab('bookings'); return; }

  const today      = todayLocal();
  const targetPill = (booking.date >= today && booking.status !== 'cancelled')
    ? 'upcoming'
    : 'past';

  document.querySelectorAll('.pill').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === targetPill);
  });
  renderBookings(targetPill);

  showTab('bookings');

  setTimeout(() => {
    const card = document.querySelector(`.booking-card[data-id="${CSS.escape(String(bookingId))}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('booking-card--pulse');
    setTimeout(() => card.classList.remove('booking-card--pulse'), 1500);
  }, 250);
}
```

- [ ] **Step 13.3 — Add pulse CSS**

Append to `css/cabinet.css`:

```css
@keyframes booking-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(196, 168, 130, 0); }
  30%      { box-shadow: 0 0 0 4px rgba(196, 168, 130, 0.45); }
}
.booking-card--pulse {
  animation: booking-pulse 1.5s ease-in-out;
}
@media (prefers-reduced-motion: reduce) {
  .booking-card--pulse { animation: none; outline: 2px solid var(--accent); }
}
```

- [ ] **Step 13.4 — Smoke check**

Reload. Notifications tab: expand any item → click «Открыть в Записях».

Expected:
- Tab switches to Bookings.
- Correct pill (upcoming/past) is active.
- Page scrolls to the specific card.
- Card glows with a 1.5s gold pulse and returns to normal.

On reduced-motion: instead of pulse, card gets a 2px gold outline.

- [ ] **Step 13.5 — Commit**

```bash
git add js/cabinet.js css/cabinet.css
git commit -m "feat(cabinet): jump from notification to matching booking card with pulse highlight"
```

---

## Task 14 — Empty states on bookings tab

**Files:**
- Modify: `js/cabinet.js` — `renderEmptyState`, hook in `renderBookings`
- Modify: `css/cabinet.css` — empty state styles

- [ ] **Step 14.1 — Add `renderEmptyState` helper**

In `js/cabinet.js`, near `renderBookings`:

```js
function renderEmptyState(filter) {
  const variants = {
    upcoming: {
      icon:  ICONS.calendar,
      title: 'Нет предстоящих записей',
      text:  'Выберите дату, время и стиль — мы свяжемся для подтверждения.',
      cta:   { label: 'Записаться', href: '/booking' },
    },
    past: {
      icon:  ICONS.hourglass,
      title: 'Вы ещё не были в студии',
      text:  'После первого визита здесь появится история сеансов.',
      cta:   null,
    },
    all: {
      icon:  ICONS.sparkle,
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
      ${v.cta ? `<a href="${v.cta.href}" class="bookings-empty__cta">${v.cta.label}</a>` : ''}
    </div>
  `;
}
```

- [ ] **Step 14.2 — Use in `renderBookings`**

In `renderBookings`, replace the current empty-state block (`cabinet.js:722-725`):
```js
if (!filtered.length) {
  list.innerHTML = '<p style="color:var(--muted);font-size:.9rem">Нет записей</p>';
  return;
}
```
with:
```js
if (!filtered.length) {
  list.innerHTML = renderEmptyState(filter);
  return;
}
```

- [ ] **Step 14.3 — Add empty-state CSS**

Append to `css/cabinet.css`:

```css
.bookings-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  min-height: 240px;
  text-align: center;
}
.bookings-empty__icon {
  width: 48px; height: 48px;
  margin-bottom: 16px;
  color: var(--accent);
  opacity: 0.7;
}
.bookings-empty__icon svg { width: 100%; height: 100%; }
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
  line-height: 1.45;
}
.bookings-empty__cta {
  padding: 12px 28px;
  background: var(--accent);
  color: var(--bg);
  text-decoration: none;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 0.82rem;
  border-radius: 4px;
  transition: opacity 0.2s ease;
}
.bookings-empty__cta:hover { opacity: 0.85; }
```

- [ ] **Step 14.4 — Smoke check**

Data setup — to hit each filter's empty case, use a test account or temporarily:
- For `upcoming` empty: cancel all upcoming bookings in Supabase Studio → `status='cancelled'` for future rows, or set their dates to past.
- For `past` empty: delete or set dates to future on a fresh account without done bookings.
- For `all` empty: new account with zero bookings.

Expected in each case:
- Centered icon + serif heading + muted paragraph.
- CTA button «Записаться» on upcoming and all, absent on past.
- Click button → navigates to `/booking`.

- [ ] **Step 14.5 — Commit**

```bash
git add js/cabinet.js css/cabinet.css
git commit -m "feat(cabinet): three tailored empty states on bookings tab with CTA to /booking"
```

---

## Task 15 — Full pass + session log

**Files:**
- Modify: `docs/superpowers/SESSION_LOG.md` — append entry

- [ ] **Step 15.1 — Full end-to-end smoke**

Go through every item in the Testing Approach section of the spec (Section 5), in order. For each item, mark ✓ when passing. If any fails, fix and re-verify. Specifically:

1. Medals tab opens via orbital click, progress animates, cards staggered in.
2. Flip works on all 4 cards with correct back content.
3. Particle burst fires once per session per new-level, triggers haptic.
4. Toast on visit_count bump — manually increment `profiles.visit_count` via Supabase Studio past next threshold, clear `medals_seen_*` in localStorage, reload.
5. Notif expand, ref lightbox, goto-bookings with pulse.
6. Mark-as-read decrements badge.
7. Empty states (3 variants) with correct CTA presence.
8. Reduced-motion everything.
9. iOS Safari smoke on physical device if possible (or BrowserStack simulator).
10. Palette — nothing glows neon, dark theme intact.

- [ ] **Step 15.2 — Update SESSION_LOG**

Append to `docs/superpowers/SESSION_LOG.md`:

```markdown

### 2026-04-20 — Project C: cabinet medals + notifications + empty states

- **Сделано:** 14 коммитов по плану `docs/superpowers/plans/2026-04-20-cabinet-medals-notifications.md`. Новый таб `#tab-medals` в `cabinet.html` с прогрессом, 4 карточками медалей (3D flip, shimmer, breathing glow, locked hatch), staggered intro, particle burst, haptic. Slide-in toast при апгрейде. Inline-expand на уведомлениях + переход на booking-карточку с pulse. Три variant'а empty state на `tab-bookings` (upcoming/past/all) с CTA на `/booking`. Все анимации уважают `prefers-reduced-motion`. MEDALS array promoted to module scope and extended with name/benefit/svg.
- **Почему:** Project C из декомпозиции от 2026-04-19. Расширение кабинета — premium UX под эстетику REMNANT.
- **Открыто:**
  - Apple Sign In по-прежнему отложен (Project A Apple-часть), Project B (i18n) не начинался.
  - Clear-cache wipes `medals_seen_*` / `medals_burst_seen_*` → toast и burst повторятся. Server-side флаги — out of scope.
  - Дата «earned» деривируется из `bookings.date` (не `confirmed_at`), возможна нестыковка при нестандартном админ-подтверждении.
  - Safari iOS 3D flip: если glitchит при первом открытии, fallback — crossfade вместо flip (не применён в этой сессии).
- **Уроки:**
  - `preserve-3d` внутри `display:none` ненадёжен в Safari iOS → перевели `#tab-medals.hidden` на visibility+opacity+absolute; остальные табы оставили на display:none-паттерне.
  - Переиспользованный `openRefLightbox` работает и в booking-card, и в notif-detail — не нужно дублировать лайтбокс.
```

- [ ] **Step 15.3 — Commit session log**

```bash
git add docs/superpowers/SESSION_LOG.md
git commit -m "docs(log): Project C implementation complete"
```

---

## Done criteria

- [ ] All 14 feature-tasks (1-14) committed.
- [ ] All 10 items in Spec Section 5 (Testing) pass manually.
- [ ] No regressions: bookings list still renders correctly with non-empty data; orbit, profile tab, avatar upload, signout still work (quick click-through).
- [ ] `node --check js/cabinet.js` clean.
- [ ] SESSION_LOG updated.

## Out-of-scope reminders

Do NOT do any of the following during this plan — they belong to other specs:
- Apple Sign In or any Supabase Auth changes (Project A).
- Any i18n / RU-EN toggle (Project B).
- Removing Express dead code (future cleanup project).
- Modifying admin.html or the MySQL schema.
- Migrating the `client_notifications` table use.
