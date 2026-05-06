# Cabinet & Admin Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite cabinet.html and admin.html with Supabase Auth, dark glassmorphism UI matching the main REMNANT site, full mobile responsiveness, and all features from the spec.

**Architecture:** Shared Supabase client config (`js/supabase-config.js`) loaded by both pages. Cabinet = auth screen + 4-tab SPA (home, bookings, notifications, profile). Admin = auth screen + sidebar + 3-tab SPA (dashboard, bookings, schedule). All user data via Supabase JS SDK with RLS enforced server-side. No hardcoded credentials anywhere.

**Tech Stack:** Vanilla HTML/CSS/JS (ES modules), Supabase JS v2 CDN, GSAP (already on main site for animations), no build step. Served by MAMP at `http://localhost`.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `js/supabase-config.js` | **CREATE** | Supabase client singleton, shared by both pages |
| `cabinet.html` | **REWRITE** | Auth screen + app shell with 4 tab panels |
| `css/cabinet.css` | **REWRITE** | All cabinet styles — auth card, sidebar, tabs, cards, skeleton |
| `js/cabinet.js` | **REWRITE** | Auth flow, tab routing, bookings CRUD, profile, notifications |
| `admin.html` | **REWRITE** | Auth screen + app shell with sidebar + 3 section panels |
| `css/admin.css` | **REWRITE** | All admin styles — sidebar, dashboard cards, table, calendar, drawer |
| `js/admin.js` | **REWRITE** | Admin auth (role check), dashboard stats, bookings table, schedule calendar |

---

## Task 1: Supabase Shared Config

**Files:**
- Create: `js/supabase-config.js`

> **Before starting:** You need two values from the Supabase dashboard (Settings → API):
> - Project URL: `https://XXXX.supabase.co`
> - Anon public key (starts with `eyJ...`)
> The service_role key is NEVER put in client JS.

- [ ] **Step 1: Create the shared config module**

```javascript
// js/supabase-config.js
// Supabase JS v2 — loaded via CDN import map in each HTML page
// Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project values

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  }
});
```

- [ ] **Step 2: Verify import works**

Open browser console on any page that imports it. No errors = pass.

- [ ] **Step 3: Commit**

```bash
git add js/supabase-config.js
git commit -m "feat: add shared Supabase client config"
```

---

## Task 2: Cabinet HTML Structure

**Files:**
- Rewrite: `cabinet.html`

- [ ] **Step 1: Write cabinet.html**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Личный кабинет — REMNANT</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Outfit:wght@300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/cabinet.css">
</head>
<body>

<!-- ═══ AUTH SCREEN ═══ -->
<div id="auth-screen" class="screen">
  <div class="auth-card">
    <a href="/" class="auth-logo">REMNANT</a>

    <div class="auth-tabs">
      <button class="auth-tab active" data-tab="login">Войти</button>
      <button class="auth-tab" data-tab="register">Регистрация</button>
    </div>

    <!-- Login -->
    <form id="login-form" class="auth-form active" novalidate>
      <div class="field-error" id="login-error" aria-live="polite"></div>
      <div class="field">
        <label for="login-email">Email</label>
        <input type="email" id="login-email" autocomplete="email" required>
      </div>
      <div class="field">
        <label for="login-password">Пароль</label>
        <div class="field-wrap">
          <input type="password" id="login-password" autocomplete="current-password" required>
          <button type="button" class="pw-toggle" aria-label="Показать пароль" data-for="login-password">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
      <button type="submit" class="btn-primary" id="login-btn">Войти</button>
    </form>

    <!-- Register -->
    <form id="register-form" class="auth-form" novalidate>
      <div class="field-error" id="reg-error" aria-live="polite"></div>
      <div class="field">
        <label for="reg-name">Имя</label>
        <input type="text" id="reg-name" autocomplete="name" required>
      </div>
      <div class="field">
        <label for="reg-email">Email</label>
        <input type="email" id="reg-email" autocomplete="email" required>
      </div>
      <div class="field">
        <label for="reg-phone">Телефон</label>
        <input type="tel" id="reg-phone" autocomplete="tel" placeholder="+7">
      </div>
      <div class="field">
        <label for="reg-password">Пароль</label>
        <div class="field-wrap">
          <input type="password" id="reg-password" autocomplete="new-password" minlength="6" required>
          <button type="button" class="pw-toggle" aria-label="Показать пароль" data-for="reg-password">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
      <button type="submit" class="btn-primary" id="reg-btn">Создать аккаунт</button>
    </form>

    <a href="/" class="auth-back">← На сайт</a>
  </div>
</div>

<!-- ═══ APP SCREEN ═══ -->
<div id="app-screen" class="screen hidden">

  <!-- Sidebar (desktop) / Bottom nav (mobile) -->
  <nav class="cab-nav" id="cab-nav">
    <a href="/" class="nav-logo">REMNANT</a>
    <div class="nav-links">
      <button class="nav-item active" data-tab="home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Главная</span>
      </button>
      <button class="nav-item" data-tab="bookings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>Записи</span>
      </button>
      <button class="nav-item" data-tab="notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        <span>Уведомления</span>
        <span class="notif-badge hidden" id="notif-badge">0</span>
      </button>
      <button class="nav-item" data-tab="profile">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Профиль</span>
      </button>
    </div>
    <button class="nav-logout" id="logout-btn">Выйти</button>
  </nav>

  <!-- Main content -->
  <main class="cab-main">

    <!-- Tab: Home -->
    <section class="cab-tab active" id="tab-home">
      <div class="next-booking-card" id="next-booking-card">
        <div class="skeleton-block" id="next-booking-skeleton"></div>
      </div>
      <div class="stats-row">
        <div class="stat-chip"><span class="stat-num" id="stat-upcoming">—</span><span class="stat-label">Предстоящие</span></div>
        <div class="stat-chip"><span class="stat-num" id="stat-total">—</span><span class="stat-label">Всего</span></div>
        <div class="stat-chip"><span class="stat-num" id="stat-done">—</span><span class="stat-label">Завершено</span></div>
      </div>
      <div class="loyalty-block">
        <div class="loyalty-header">
          <span id="loyalty-tier-label">Стандарт</span>
          <span id="loyalty-progress-label"></span>
        </div>
        <div class="loyalty-bar"><div class="loyalty-fill" id="loyalty-fill"></div></div>
      </div>
      <a href="/booking" class="btn-primary btn-cta">Записаться</a>
    </section>

    <!-- Tab: Bookings -->
    <section class="cab-tab hidden" id="tab-bookings">
      <div class="filter-pills">
        <button class="pill active" data-filter="upcoming">Предстоящие</button>
        <button class="pill" data-filter="past">Прошедшие</button>
        <button class="pill" data-filter="all">Все</button>
      </div>
      <div class="bookings-list" id="bookings-list">
        <div class="skeleton-block"></div>
        <div class="skeleton-block"></div>
      </div>
    </section>

    <!-- Tab: Notifications -->
    <section class="cab-tab hidden" id="tab-notifications">
      <div class="notif-header">
        <h2>Уведомления</h2>
        <button class="btn-ghost" id="mark-all-read">Прочитать все</button>
      </div>
      <div class="notif-list" id="notif-list"></div>
    </section>

    <!-- Tab: Profile -->
    <section class="cab-tab hidden" id="tab-profile">
      <div class="profile-avatar" id="profile-avatar">?</div>
      <form class="profile-form" id="profile-form">
        <div class="field">
          <label for="p-name">Имя</label>
          <input type="text" id="p-name">
        </div>
        <div class="field">
          <label for="p-email">Email</label>
          <input type="email" id="p-email" disabled>
        </div>
        <button type="submit" class="btn-primary">Сохранить</button>
      </form>
      <div class="pw-change-block">
        <button class="btn-ghost" id="pw-change-toggle">Сменить пароль</button>
        <form class="pw-change-form hidden" id="pw-change-form">
          <div class="field">
            <label for="pw-new">Новый пароль</label>
            <input type="password" id="pw-new" minlength="6">
          </div>
          <button type="submit" class="btn-primary">Обновить пароль</button>
        </form>
      </div>
      <button class="btn-danger" id="signout-btn">Выйти из аккаунта</button>
    </section>

  </main>
</div>

<!-- Cancel modal -->
<div class="modal-overlay hidden" id="cancel-modal">
  <div class="modal-card">
    <h3>Отменить запись?</h3>
    <div class="field">
      <label for="cancel-reason">Причина (необязательно)</label>
      <textarea id="cancel-reason" rows="3"></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" id="cancel-modal-close">Назад</button>
      <button class="btn-danger" id="cancel-confirm">Отменить запись</button>
    </div>
  </div>
</div>

<script type="module" src="js/cabinet.js"></script>
</body>
</html>
```

- [ ] **Step 2: Manual check — open `http://localhost/REMNANT/cabinet.html`**

Expected: auth card visible, app screen hidden, no JS errors.

- [ ] **Step 3: Commit**

```bash
git add cabinet.html
git commit -m "feat: cabinet HTML structure — auth + 4-tab shell"
```

---

## Task 3: Cabinet CSS

**Files:**
- Rewrite: `css/cabinet.css`

- [ ] **Step 1: Write cabinet.css**

```css
/* ══════════════════════════════════════
   REMNANT Cabinet CSS
   #080808 bg · #c4a882 accent
   Instrument Serif + Outfit
══════════════════════════════════════ */

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:       #080808;
  --surface:  rgba(255,255,255,0.04);
  --border:   rgba(196,168,130,0.15);
  --accent:   #c4a882;
  --text:     #e8e2d9;
  --muted:    rgba(232,226,217,0.45);
  --danger:   #c0392b;
  --font-serif: 'Instrument Serif', serif;
  --font-sans:  'Outfit', system-ui, sans-serif;
  --radius:   12px;
  --sidebar-w: 220px;
  --nav-h:    64px;
}

html, body { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font-sans); font-size: 15px; }

/* ── Screens ── */
.screen { min-height: 100dvh; }
.hidden { display: none !important; }

/* ══ AUTH ══════════════════════════════ */
#auth-screen {
  display: flex; align-items: center; justify-content: center;
  padding: 2rem 1rem;
}
.auth-card {
  width: 100%; max-width: 400px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2.5rem 2rem;
  animation: fadeUp .4s ease both;
}
@keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }

.auth-logo {
  display: block; text-align: center;
  font-family: var(--font-serif);
  font-size: 1.6rem; letter-spacing: .22em;
  color: var(--accent); text-decoration: none;
  margin-bottom: 2rem;
}
.auth-tabs {
  display: flex; gap: 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.75rem;
}
.auth-tab {
  flex: 1; background: none; border: none; cursor: pointer;
  font: 500 .8rem var(--font-sans);
  color: var(--muted); padding: .6rem 0;
  border-bottom: 2px solid transparent;
  transition: color .2s, border-color .2s;
}
.auth-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

.auth-form { display: none; flex-direction: column; gap: 1rem; }
.auth-form.active { display: flex; }

.field { display: flex; flex-direction: column; gap: .4rem; }
.field label { font-size: .72rem; letter-spacing: .06em; color: var(--muted); }
.field input, .field textarea {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text); font: inherit;
  padding: .7rem .9rem;
  outline: none; transition: border-color .2s;
}
.field input:focus, .field textarea:focus { border-color: var(--accent); }
.field-wrap { position: relative; }
.field-wrap input { width: 100%; padding-right: 2.5rem; }
.pw-toggle {
  position: absolute; right: .7rem; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; color: var(--muted);
  padding: 0; display: flex; align-items: center;
}

.field-error {
  font-size: .78rem; color: #e07070;
  min-height: 1.2em;
}

.btn-primary {
  background: var(--accent); color: #080808;
  border: none; border-radius: 8px; cursor: pointer;
  font: 500 .82rem var(--font-sans); letter-spacing: .06em;
  padding: .82rem 1.5rem; text-decoration: none;
  display: inline-flex; align-items: center; justify-content: center;
  transition: opacity .2s;
}
.btn-primary:hover { opacity: .85; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }

.btn-ghost {
  background: none; border: 1px solid var(--border); border-radius: 8px;
  color: var(--text); cursor: pointer; font: inherit;
  padding: .6rem 1rem; font-size: .8rem; transition: border-color .2s;
}
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }

.btn-danger {
  background: none; border: 1px solid var(--danger); border-radius: 8px;
  color: var(--danger); cursor: pointer; font: inherit;
  padding: .6rem 1rem; font-size: .8rem; transition: background .2s;
  width: 100%; margin-top: .5rem;
}
.btn-danger:hover { background: rgba(192,57,43,.1); }

.auth-back { display: block; text-align: center; margin-top: 1.5rem; font-size: .78rem; color: var(--muted); text-decoration: none; }
.auth-back:hover { color: var(--accent); }

/* ══ APP LAYOUT ═══════════════════════ */
#app-screen { display: flex; min-height: 100dvh; }

/* Sidebar — desktop */
.cab-nav {
  width: var(--sidebar-w);
  background: rgba(255,255,255,0.025);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  padding: 1.5rem 1rem;
  position: fixed; top: 0; left: 0; height: 100dvh;
  z-index: 10;
}
.nav-logo {
  font-family: var(--font-serif); font-size: 1.1rem;
  letter-spacing: .22em; color: var(--accent);
  text-decoration: none; margin-bottom: 2rem;
  padding-left: .5rem;
}
.nav-links { display: flex; flex-direction: column; gap: .25rem; flex: 1; }
.nav-item {
  display: flex; align-items: center; gap: .75rem;
  background: none; border: none; border-radius: 8px;
  color: var(--muted); cursor: pointer;
  font: 400 .85rem var(--font-sans);
  padding: .7rem .75rem; text-align: left;
  transition: background .15s, color .15s;
  position: relative;
}
.nav-item:hover { background: var(--surface); color: var(--text); }
.nav-item.active { background: rgba(196,168,130,0.1); color: var(--accent); }
.nav-logout {
  background: none; border: none; cursor: pointer;
  color: var(--muted); font: 400 .78rem var(--font-sans);
  padding: .5rem .75rem; text-align: left;
  transition: color .15s;
}
.nav-logout:hover { color: var(--danger); }

.cab-main {
  flex: 1; margin-left: var(--sidebar-w);
  padding: 2.5rem 2rem;
  max-width: calc(900px + var(--sidebar-w));
}

/* ── Tabs ── */
.cab-tab { display: none; }
.cab-tab.active { display: block; }

/* ── Home tab ── */
.next-booking-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1.75rem;
  margin-bottom: 1.5rem;
}
.next-booking-card .nb-date {
  font-family: var(--font-serif); font-size: 2rem; color: var(--accent);
}
.next-booking-card .nb-time { font-size: .85rem; color: var(--muted); margin-top: .25rem; }
.next-booking-card .nb-style { font-size: .9rem; margin-top: .5rem; }
.next-booking-empty { font-size: .9rem; color: var(--muted); }

.stats-row { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
.stat-chip {
  flex: 1; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1rem;
  display: flex; flex-direction: column; align-items: center; gap: .25rem;
}
.stat-num { font-family: var(--font-serif); font-size: 1.8rem; color: var(--accent); }
.stat-label { font-size: .68rem; letter-spacing: .05em; color: var(--muted); text-transform: uppercase; }

.loyalty-block {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
}
.loyalty-header { display: flex; justify-content: space-between; font-size: .8rem; margin-bottom: .75rem; }
.loyalty-bar { height: 4px; background: rgba(255,255,255,.08); border-radius: 2px; overflow: hidden; }
.loyalty-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width .6s ease; }

.btn-cta { display: block; text-align: center; margin-top: 2rem; }

/* ── Bookings tab ── */
.filter-pills { display: flex; gap: .5rem; margin-bottom: 1.5rem; }
.pill {
  background: none; border: 1px solid var(--border); border-radius: 20px;
  color: var(--muted); cursor: pointer;
  font: 400 .78rem var(--font-sans); padding: .4rem .9rem;
  transition: all .15s;
}
.pill.active { background: rgba(196,168,130,0.12); border-color: var(--accent); color: var(--accent); }

.bookings-list { display: flex; flex-direction: column; gap: 1rem; }
.booking-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1.25rem 1.5rem;
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 1rem;
}
.booking-card__left { flex: 1; }
.booking-card__date { font-family: var(--font-serif); font-size: 1.1rem; }
.booking-card__time { font-size: .8rem; color: var(--muted); margin-top: .15rem; }
.booking-card__style { font-size: .85rem; margin-top: .4rem; }
.booking-card__actions { display: flex; flex-direction: column; gap: .5rem; align-items: flex-end; }
.status-badge {
  font-size: .65rem; letter-spacing: .08em; text-transform: uppercase;
  border-radius: 20px; padding: .25rem .65rem; border: 1px solid;
}
.status-badge.new      { border-color: #c4a882; color: #c4a882; }
.status-badge.confirmed { border-color: #6fcf97; color: #6fcf97; }
.status-badge.done     { border-color: rgba(255,255,255,.25); color: var(--muted); }
.status-badge.cancelled { border-color: rgba(192,57,43,.5); color: #e07070; }
.btn-cancel { font-size: .72rem; color: var(--muted); background: none; border: none; cursor: pointer; text-decoration: underline; }
.btn-cancel:hover { color: var(--danger); }

/* ── Notifications tab ── */
.notif-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.notif-header h2 { font-family: var(--font-serif); font-size: 1.4rem; font-weight: 400; }
.notif-list { display: flex; flex-direction: column; gap: .75rem; }
.notif-item {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1rem 1.25rem;
  display: flex; gap: 1rem; align-items: flex-start;
}
.notif-item.unread { border-color: rgba(196,168,130,0.3); }
.notif-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); margin-top: .4rem; flex-shrink: 0; }
.notif-dot.read { background: transparent; border: 1px solid var(--muted); }
.notif-body { flex: 1; }
.notif-text { font-size: .88rem; }
.notif-time { font-size: .72rem; color: var(--muted); margin-top: .25rem; }
.notif-badge {
  position: absolute; top: 6px; right: 6px;
  background: var(--accent); color: #080808;
  border-radius: 50%; font-size: .6rem; font-weight: 600;
  width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;
}

/* ── Profile tab ── */
.profile-avatar {
  width: 72px; height: 72px; border-radius: 50%;
  background: rgba(196,168,130,0.15); border: 1px solid var(--border);
  font-family: var(--font-serif); font-size: 1.6rem;
  display: flex; align-items: center; justify-content: center;
  color: var(--accent); margin-bottom: 1.5rem;
}
.profile-form { display: flex; flex-direction: column; gap: 1rem; max-width: 400px; }
.pw-change-block { margin-top: 1.5rem; max-width: 400px; }
.pw-change-form { margin-top: 1rem; display: flex; flex-direction: column; gap: 1rem; }

/* ── Skeleton ── */
.skeleton-block {
  background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.04) 75%);
  background-size: 200% 100%;
  border-radius: var(--radius); height: 100px;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 1rem;
}
.modal-card {
  background: #111; border: 1px solid var(--border);
  border-radius: var(--radius); padding: 2rem;
  width: 100%; max-width: 400px;
  display: flex; flex-direction: column; gap: 1.25rem;
}
.modal-card h3 { font-family: var(--font-serif); font-weight: 400; }
.modal-actions { display: flex; gap: .75rem; justify-content: flex-end; }

/* ══ MOBILE ════════════════════════════ */
@media (max-width: 767px) {
  .cab-nav {
    width: 100%; height: var(--nav-h);
    top: auto; bottom: 0; left: 0;
    flex-direction: row; align-items: center;
    padding: 0; border-right: none;
    border-top: 1px solid var(--border);
  }
  .nav-logo, .nav-logout { display: none; }
  .nav-links { flex-direction: row; justify-content: space-around; flex: 1; gap: 0; }
  .nav-item { flex-direction: column; gap: .2rem; font-size: .62rem; padding: .5rem .25rem; justify-content: center; }
  .nav-item svg { width: 22px; height: 22px; }
  .cab-main { margin-left: 0; padding: 1.25rem 1rem calc(var(--nav-h) + 1rem); }
  .stats-row { gap: .5rem; }
  .stat-num { font-size: 1.4rem; }
}
```

- [ ] **Step 2: Manual check — reload `cabinet.html`**

Expected: dark card centered, gold REMNANT logo, tabs visible, no layout shifts.

- [ ] **Step 3: Commit**

```bash
git add css/cabinet.css
git commit -m "feat: cabinet CSS — glassmorphism auth + sidebar + all components"
```

---

## Task 4: Cabinet JS — Auth

**Files:**
- Rewrite: `js/cabinet.js` (auth section only first)

- [ ] **Step 1: Write cabinet.js auth + tab routing**

```javascript
// js/cabinet.js
import { supabase } from './supabase-config.js';

/* ══ Tab routing ══════════════════════════════════ */
function showTab(name) {
  document.querySelectorAll('.cab-tab').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const tab = document.getElementById('tab-' + name);
  if (tab) { tab.classList.remove('hidden'); tab.classList.add('active'); }
  const btn = document.querySelector(`.nav-item[data-tab="${name}"]`);
  if (btn) btn.classList.add('active');
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
  // onAuthStateChange handles redirect to app
});

/* ══ Register ════════════════════════════════════ */
document.getElementById('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  clearErrors();
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const phone    = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const btn      = document.getElementById('reg-btn');

  if (!name) return setError('reg-error', 'Введите имя');
  if (password.length < 6) return setError('reg-error', 'Пароль минимум 6 символов');

  btn.disabled = true; btn.textContent = 'Создаём...';

  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name, phone } }
  });

  if (error) {
    setError('reg-error', error.message);
    btn.disabled = false; btn.textContent = 'Создать аккаунт';
    return;
  }

  // Create profile row
  if (data.user) {
    await supabase.from('profiles').upsert({
      id:    data.user.id,
      name,
      phone: phone || null,
    });
  }
  // Auth state change will open app
});

/* ══ Nav tab clicks ═══════════════════════════════ */
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});
document.getElementById('logout-btn').addEventListener('click', () => supabase.auth.signOut());
document.getElementById('signout-btn').addEventListener('click', () => supabase.auth.signOut());

/* ══ Auth state listener ══════════════════════════ */
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    showApp();
    loadDashboard(session.user);
  } else {
    showAuth();
  }
});

// Check existing session on load
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) { showApp(); loadDashboard(session.user); }
  else showAuth();
});

/* ══ Dashboard loader (stubs — filled in Task 5) ═ */
async function loadDashboard(user) {
  showTab('home');
  await Promise.all([
    loadProfile(user),
    loadBookings(user.id),
    loadNotifications(user.id),
  ]);
}

async function loadProfile(user)         { /* Task 5 */ }
async function loadBookings(userId)      { /* Task 5 */ }
async function loadNotifications(userId) { /* Task 5 */ }
```

- [ ] **Step 2: Test login flow**

1. Open `http://localhost/REMNANT/cabinet.html`
2. Enter valid Supabase credentials → app screen should appear
3. Enter wrong credentials → inline error should show (no alert)
4. Click logout → auth screen should return

- [ ] **Step 3: Commit**

```bash
git add js/cabinet.js
git commit -m "feat: cabinet auth — Supabase signIn/signUp/signOut + tab routing"
```

---

## Task 5: Cabinet JS — Dashboard Data

**Files:**
- Modify: `js/cabinet.js` (replace stub functions)

- [ ] **Step 1: Replace loadProfile stub**

```javascript
async function loadProfile(user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, visit_count, loyalty_tier')
    .eq('id', user.id)
    .single();

  const name = profile?.name || user.email?.split('@')[0] || '?';

  // Avatar initials
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('profile-avatar').textContent = initials;
  document.getElementById('p-name').value  = name;
  document.getElementById('p-email').value = user.email || '';

  // Loyalty bar
  const visits = profile?.visit_count || 0;
  const tier   = profile?.loyalty_tier || 'standard';
  const target = tier === 'standard' ? 5 : tier === 'silver' ? 10 : 10;
  const pct    = Math.min(100, (visits % target) / target * 100);
  document.getElementById('loyalty-fill').style.width   = pct + '%';
  document.getElementById('loyalty-tier-label').textContent =
    tier === 'standard' ? 'Стандарт' : tier === 'silver' ? 'Серебро' : 'Золото';
  document.getElementById('loyalty-progress-label').textContent =
    tier !== 'gold' ? `${visits % target} / ${target} визитов` : 'Максимальный уровень';
}
```

- [ ] **Step 2: Replace loadBookings stub**

```javascript
async function loadBookings(userId) {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, date, time_slot, style, status')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error || !bookings) return;

  const now        = new Date().toISOString().slice(0, 10);
  const upcoming   = bookings.filter(b => b.date >= now && b.status !== 'cancelled');
  const done       = bookings.filter(b => b.status === 'done');

  // Stats
  document.getElementById('stat-upcoming').textContent = upcoming.length;
  document.getElementById('stat-total').textContent    = bookings.length;
  document.getElementById('stat-done').textContent     = done.length;

  // Next booking card
  const next = upcoming[0];
  const nbCard = document.getElementById('next-booking-card');
  document.getElementById('next-booking-skeleton')?.remove();
  if (next) {
    const d = new Date(next.date);
    nbCard.innerHTML =
      `<div class="nb-date">${d.toLocaleDateString('ru', { day: 'numeric', month: 'long' })}</div>
       <div class="nb-time">${next.time_slot}</div>
       <div class="nb-style">${next.style || '—'}</div>`;
  } else {
    nbCard.innerHTML = '<p class="next-booking-empty">Нет предстоящих записей</p>';
  }

  // Bookings list (default: upcoming)
  window._allBookings = bookings;
  renderBookings('upcoming');
}

const STATUS_RU = { new: 'Новая', confirmed: 'Подтверждена', done: 'Завершена', cancelled: 'Отменена' };

function renderBookings(filter) {
  const now      = new Date().toISOString().slice(0, 10);
  const all      = window._allBookings || [];
  const filtered = filter === 'upcoming'
    ? all.filter(b => b.date >= now && b.status !== 'cancelled')
    : filter === 'past'
    ? all.filter(b => b.date < now || b.status === 'done')
    : all;

  const list = document.getElementById('bookings-list');
  list.innerHTML = '';

  if (!filtered.length) {
    list.innerHTML = '<p style="color:var(--muted);font-size:.9rem">Нет записей</p>';
    return;
  }

  filtered.forEach(b => {
    const d    = new Date(b.date);
    const card = document.createElement('div');
    card.className = 'booking-card';
    const canCancel = b.status === 'new' || b.status === 'confirmed';
    card.innerHTML =
      `<div class="booking-card__left">
         <div class="booking-card__date">${d.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
         <div class="booking-card__time">${b.time_slot}</div>
         <div class="booking-card__style">${b.style || '—'}</div>
       </div>
       <div class="booking-card__actions">
         <span class="status-badge ${b.status}">${STATUS_RU[b.status] || b.status}</span>
         ${canCancel ? `<button class="btn-cancel" data-id="${b.id}">Отменить</button>` : ''}
       </div>`;
    list.appendChild(card);
  });

  // Cancel buttons
  list.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', () => openCancelModal(btn.dataset.id));
  });
}

// Filter pills
document.querySelectorAll('.pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    renderBookings(pill.dataset.filter);
  });
});
```

- [ ] **Step 3: Replace loadNotifications stub**

```javascript
async function loadNotifications(userId) {
  // Notifications derived from booking events (no separate table in spec)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, date, time_slot, style, status, created_at')
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

  document.getElementById('mark-all-read').addEventListener('click', () => {
    const keys = (bookings || []).map(b => b.id + '-' + b.status);
    localStorage.setItem(readKey, JSON.stringify(keys));
    loadNotifications(userId);
  });
}
```

- [ ] **Step 4: Cancel modal logic**

```javascript
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
```

- [ ] **Step 5: Profile save + password change**

```javascript
document.getElementById('profile-form').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('p-name').value.trim();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.from('profiles').update({ name, updated_at: new Date().toISOString() }).eq('id', session.user.id);
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('profile-avatar').textContent = initials;
});

document.getElementById('pw-change-toggle').addEventListener('click', () => {
  document.getElementById('pw-change-form').classList.toggle('hidden');
});

document.getElementById('pw-change-form').addEventListener('submit', async e => {
  e.preventDefault();
  const pw = document.getElementById('pw-new').value;
  if (pw.length < 6) return;
  await supabase.auth.updateUser({ password: pw });
  document.getElementById('pw-new').value = '';
  document.getElementById('pw-change-form').classList.add('hidden');
});
```

- [ ] **Step 6: Manual test full cabinet flow**

1. Log in → home tab shows next booking card + stats + loyalty bar
2. Bookings tab → filter pills switch between upcoming / past / all
3. Cancel a `new` booking → confirm modal → status changes to `cancelled`
4. Notifications tab → badge count visible on nav
5. Profile tab → edit name, save → avatar initials update
6. Resize to mobile (<768px) → bottom nav appears, sidebar hidden

- [ ] **Step 7: Commit**

```bash
git add js/cabinet.js
git commit -m "feat: cabinet dashboard — bookings, stats, loyalty, notifications, profile"
```

---

## Task 6: Admin HTML Structure

**Files:**
- Rewrite: `admin.html`

- [ ] **Step 1: Write admin.html**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Admin — REMNANT</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Outfit:wght@300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/admin.css">
</head>
<body>

<!-- ═══ AUTH ═══ -->
<div id="auth-screen" class="screen">
  <div class="auth-card">
    <span class="auth-logo">REMNANT</span>
    <p class="auth-sub">Панель управления</p>
    <form id="admin-login-form" novalidate>
      <div class="field-error" id="login-error" aria-live="polite"></div>
      <div class="field">
        <label for="a-email">Email</label>
        <input type="email" id="a-email" autocomplete="email" required>
      </div>
      <div class="field">
        <label for="a-password">Пароль</label>
        <div class="field-wrap">
          <input type="password" id="a-password" autocomplete="current-password" required>
          <button type="button" class="pw-toggle" data-for="a-password" aria-label="Показать">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
      <button type="submit" class="btn-primary" id="login-btn">Войти</button>
    </form>
  </div>
</div>

<!-- ═══ APP ═══ -->
<div id="app-screen" class="screen hidden">

  <!-- Sidebar -->
  <aside class="adm-sidebar" id="adm-sidebar">
    <a href="/" class="adm-logo">REMNANT</a>
    <nav class="adm-nav">
      <button class="adm-nav-item active" data-section="dashboard">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        Дашборд
      </button>
      <button class="adm-nav-item" data-section="bookings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Заявки
        <span class="adm-badge hidden" id="new-badge">0</span>
      </button>
      <button class="adm-nav-item" data-section="schedule">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Расписание
      </button>
    </nav>
    <div class="adm-sidebar-footer">
      <span class="adm-online-dot"></span>
      <span id="adm-email-label" style="font-size:.72rem;color:var(--muted)"></span>
      <button class="adm-logout" id="adm-logout">Выйти</button>
    </div>
  </aside>

  <!-- Mobile header -->
  <header class="adm-mobile-header">
    <button class="burger" id="burger-btn" aria-label="Меню">
      <span></span><span></span><span></span>
    </button>
    <span class="adm-logo-mobile">REMNANT</span>
    <button class="notif-bell" id="notif-bell-btn" aria-label="Уведомления">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
      <span class="adm-badge hidden" id="bell-badge">0</span>
    </button>
  </header>
  <div class="adm-backdrop hidden" id="adm-backdrop"></div>

  <!-- Main -->
  <main class="adm-main">

    <!-- Dashboard -->
    <section class="adm-section active" id="section-dashboard">
      <h1 class="adm-page-title">Дашборд</h1>
      <div class="stat-cards" id="stat-cards">
        <div class="stat-card"><div class="stat-card__num" id="s-new">—</div><div class="stat-card__label">Новые</div></div>
        <div class="stat-card"><div class="stat-card__num" id="s-confirmed">—</div><div class="stat-card__label">Подтверждено</div></div>
        <div class="stat-card"><div class="stat-card__num" id="s-done">—</div><div class="stat-card__label">Завершено (месяц)</div></div>
        <div class="stat-card accent"><div class="stat-card__num" id="s-revenue">—</div><div class="stat-card__label">Записей всего</div></div>
      </div>
      <div class="recent-bookings">
        <h2 class="adm-section-title">Последние заявки</h2>
        <div id="recent-list"></div>
      </div>
    </section>

    <!-- Bookings -->
    <section class="adm-section hidden" id="section-bookings">
      <div class="adm-toolbar">
        <h1 class="adm-page-title">Заявки</h1>
        <div class="adm-toolbar-actions">
          <input type="search" id="search-input" class="adm-search" placeholder="Поиск по имени...">
          <select id="status-filter" class="adm-select">
            <option value="">Все статусы</option>
            <option value="new">Новые</option>
            <option value="confirmed">Подтверждено</option>
            <option value="done">Завершено</option>
            <option value="cancelled">Отменено</option>
          </select>
          <button class="btn-ghost" id="export-csv-btn">Экспорт CSV</button>
        </div>
      </div>
      <div class="bookings-table-wrap">
        <table class="bookings-table" id="bookings-table">
          <thead>
            <tr><th>Клиент</th><th>Дата</th><th>Время</th><th>Стиль</th><th>Статус</th><th>Действия</th></tr>
          </thead>
          <tbody id="bookings-tbody"></tbody>
        </table>
      </div>
      <!-- Mobile cards -->
      <div class="bookings-cards hidden" id="bookings-cards"></div>
    </section>

    <!-- Schedule -->
    <section class="adm-section hidden" id="section-schedule">
      <h1 class="adm-page-title">Расписание</h1>
      <div class="schedule-layout">
        <div class="calendar-wrap">
          <div class="cal-header">
            <button class="cal-nav" id="cal-prev">‹</button>
            <span id="cal-title"></span>
            <button class="cal-nav" id="cal-next">›</button>
          </div>
          <div class="cal-grid" id="cal-grid"></div>
        </div>
        <div class="schedule-sidebar">
          <h3 id="selected-date-title">Выберите дату</h3>
          <div id="date-bookings-list"></div>
          <button class="btn-danger-block hidden" id="block-date-btn">Заблокировать дату</button>
          <button class="btn-primary hidden" id="unblock-date-btn">Разблокировать</button>
        </div>
      </div>
    </section>

  </main>
</div>

<!-- Booking detail modal -->
<div class="modal-overlay hidden" id="booking-modal">
  <div class="modal-card">
    <div class="modal-header">
      <h3 id="modal-title">Запись</h3>
      <button class="modal-close" id="modal-close">✕</button>
    </div>
    <div id="modal-body"></div>
    <div class="modal-actions" id="modal-actions"></div>
  </div>
</div>

<!-- Toast container -->
<div id="toast-container"></div>

<script type="module" src="js/admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Manual check**

Open `http://localhost/REMNANT/admin.html` — auth card visible, no errors.

- [ ] **Step 3: Commit**

```bash
git add admin.html
git commit -m "feat: admin HTML structure — auth + sidebar + 3 sections"
```

---

## Task 7: Admin CSS

**Files:**
- Rewrite: `css/admin.css`

- [ ] **Step 1: Write admin.css**

```css
/* ══════════════════════════════════════
   REMNANT Admin CSS
══════════════════════════════════════ */

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #080808;
  --surface:   rgba(255,255,255,0.04);
  --surface-2: rgba(255,255,255,0.07);
  --border:    rgba(196,168,130,0.15);
  --accent:    #c4a882;
  --text:      #e8e2d9;
  --muted:     rgba(232,226,217,0.45);
  --danger:    #c0392b;
  --green:     #6fcf97;
  --font-serif: 'Instrument Serif', serif;
  --font-sans:  'Outfit', system-ui, sans-serif;
  --radius:    10px;
  --sidebar-w: 240px;
  --mob-h:     56px;
}

html, body { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font-sans); font-size: 14px; }
.screen { min-height: 100dvh; }
.hidden { display: none !important; }

/* ══ AUTH ══ */
#auth-screen { display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; }
.auth-card {
  width: 100%; max-width: 380px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 14px; padding: 2.5rem 2rem;
  animation: fadeUp .4s ease both;
}
@keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
.auth-logo { font-family: var(--font-serif); font-size: 1.5rem; letter-spacing: .22em; color: var(--accent); display: block; text-align: center; margin-bottom: .5rem; }
.auth-sub { text-align: center; font-size: .75rem; color: var(--muted); letter-spacing: .12em; text-transform: uppercase; margin-bottom: 2rem; }
.field { display: flex; flex-direction: column; gap: .35rem; margin-bottom: .9rem; }
.field label { font-size: .7rem; letter-spacing: .06em; color: var(--muted); }
.field input {
  background: rgba(255,255,255,0.05); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text); font: inherit;
  padding: .65rem .85rem; outline: none; transition: border-color .2s;
}
.field input:focus { border-color: var(--accent); }
.field-wrap { position: relative; }
.field-wrap input { width: 100%; padding-right: 2.5rem; }
.pw-toggle { position: absolute; right: .65rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--muted); display: flex; }
.field-error { font-size: .75rem; color: #e07070; min-height: 1.1em; margin-bottom: .5rem; }
.btn-primary {
  width: 100%; background: var(--accent); color: #080808;
  border: none; border-radius: 8px; cursor: pointer;
  font: 500 .82rem var(--font-sans); padding: .82rem;
  transition: opacity .2s; margin-top: .5rem;
}
.btn-primary:hover { opacity: .85; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost {
  background: none; border: 1px solid var(--border); border-radius: 8px;
  color: var(--text); cursor: pointer; font: inherit;
  padding: .5rem .9rem; font-size: .78rem; white-space: nowrap;
  transition: border-color .2s;
}
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
.btn-danger-block, .btn-primary.hidden { display: none; }
.btn-danger-block {
  width: 100%; background: none; border: 1px solid var(--danger);
  border-radius: 8px; color: var(--danger); cursor: pointer;
  font: inherit; padding: .6rem; font-size: .78rem; margin-top: .75rem;
}

/* ══ APP LAYOUT ══ */
#app-screen { display: flex; min-height: 100dvh; }

.adm-sidebar {
  width: var(--sidebar-w); background: rgba(255,255,255,0.025);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  position: fixed; top: 0; left: 0; height: 100dvh;
  padding: 1.5rem 1rem; z-index: 20;
  transition: transform .25s ease;
}
.adm-logo { font-family: var(--font-serif); font-size: 1.1rem; letter-spacing: .22em; color: var(--accent); text-decoration: none; padding-left: .5rem; margin-bottom: 2rem; display: block; }
.adm-nav { flex: 1; display: flex; flex-direction: column; gap: .2rem; }
.adm-nav-item {
  display: flex; align-items: center; gap: .75rem;
  background: none; border: none; border-radius: 8px;
  color: var(--muted); cursor: pointer; font: 400 .85rem var(--font-sans);
  padding: .7rem .75rem; text-align: left; position: relative;
  transition: background .15s, color .15s;
}
.adm-nav-item:hover { background: var(--surface); color: var(--text); }
.adm-nav-item.active { background: rgba(196,168,130,0.1); color: var(--accent); }
.adm-sidebar-footer { display: flex; flex-direction: column; gap: .4rem; padding: .5rem .75rem; }
.adm-online-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); margin-bottom: .25rem; }
.adm-logout { background: none; border: none; cursor: pointer; color: var(--muted); font: 400 .75rem var(--font-sans); text-align: left; padding: .25rem 0; }
.adm-logout:hover { color: var(--danger); }

.adm-mobile-header { display: none; }
.adm-backdrop { display: none; }

.adm-main { flex: 1; margin-left: var(--sidebar-w); padding: 2rem 2.5rem; max-width: calc(1100px + var(--sidebar-w)); }

/* ══ SECTIONS ══ */
.adm-section { display: none; }
.adm-section.active { display: block; }
.adm-page-title { font-family: var(--font-serif); font-size: 1.8rem; font-weight: 400; margin-bottom: 1.75rem; }
.adm-section-title { font-family: var(--font-serif); font-size: 1.1rem; font-weight: 400; margin-bottom: 1rem; color: var(--muted); }

/* ── Dashboard stat cards ── */
.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
.stat-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1.25rem 1.5rem;
}
.stat-card.accent { border-color: rgba(196,168,130,.3); }
.stat-card__num { font-family: var(--font-serif); font-size: 2.2rem; color: var(--accent); }
.stat-card__label { font-size: .68rem; letter-spacing: .07em; text-transform: uppercase; color: var(--muted); margin-top: .25rem; }

/* ── Recent bookings ── */
.recent-booking-row {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: .9rem 1.25rem;
  display: flex; align-items: center; gap: 1rem;
  margin-bottom: .5rem;
}
.recent-booking-row__info { flex: 1; }
.recent-booking-row__name { font-size: .88rem; }
.recent-booking-row__meta { font-size: .72rem; color: var(--muted); margin-top: .15rem; }
.recent-booking-row__actions { display: flex; gap: .5rem; }

/* ── Bookings section toolbar ── */
.adm-toolbar { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.adm-toolbar-actions { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; margin-left: auto; }
.adm-search {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text); font: inherit;
  padding: .5rem .85rem; outline: none; min-width: 200px;
  transition: border-color .2s;
}
.adm-search:focus { border-color: var(--accent); }
.adm-select {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text); font: inherit;
  padding: .5rem .75rem; outline: none; cursor: pointer;
}

/* ── Bookings table ── */
.bookings-table-wrap { overflow-x: auto; }
.bookings-table { width: 100%; border-collapse: collapse; }
.bookings-table th {
  font-size: .68rem; letter-spacing: .1em; text-transform: uppercase;
  color: var(--muted); padding: .6rem 1rem; text-align: left;
  border-bottom: 1px solid var(--border);
}
.bookings-table td { padding: .85rem 1rem; border-bottom: 1px solid rgba(255,255,255,.04); font-size: .85rem; }
.bookings-table tr:hover td { background: var(--surface); cursor: pointer; }
.adm-status-select {
  background: transparent; border: 1px solid var(--border); border-radius: 6px;
  color: var(--text); font: inherit; font-size: .75rem; padding: .25rem .5rem; cursor: pointer;
}
.bookings-cards { display: flex; flex-direction: column; gap: .75rem; }
.booking-mob-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1rem 1.25rem;
}

/* Status badge */
.status-badge { font-size: .62rem; letter-spacing: .08em; text-transform: uppercase; border-radius: 20px; padding: .2rem .6rem; border: 1px solid; white-space: nowrap; }
.status-badge.new       { border-color: #c4a882; color: #c4a882; }
.status-badge.confirmed { border-color: #6fcf97; color: #6fcf97; }
.status-badge.done      { border-color: rgba(255,255,255,.25); color: var(--muted); }
.status-badge.cancelled { border-color: rgba(192,57,43,.5); color: #e07070; }

/* ── Schedule ── */
.schedule-layout { display: grid; grid-template-columns: 1fr 280px; gap: 2rem; align-items: start; }
.cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.cal-header span { font-family: var(--font-serif); font-size: 1rem; }
.cal-nav { background: none; border: 1px solid var(--border); border-radius: 6px; color: var(--text); cursor: pointer; font-size: 1.1rem; padding: .2rem .6rem; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cal-day-label { font-size: .62rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); text-align: center; padding: .4rem 0; }
.cal-day {
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  border-radius: 6px; font-size: .82rem; cursor: pointer;
  border: 1px solid transparent; transition: background .15s, border-color .15s;
}
.cal-day:hover { background: var(--surface); border-color: var(--border); }
.cal-day.today { border-color: var(--accent); color: var(--accent); }
.cal-day.selected { background: rgba(196,168,130,0.15); border-color: var(--accent); }
.cal-day.blocked { background: rgba(192,57,43,.1); color: var(--danger); }
.cal-day.has-bookings::after { content: ''; display: block; width: 4px; height: 4px; background: var(--accent); border-radius: 50%; position: absolute; bottom: 4px; }
.cal-day { position: relative; }
.schedule-sidebar { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem; }
.schedule-sidebar h3 { font-family: var(--font-serif); font-weight: 400; margin-bottom: 1rem; }

/* ── Modal ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.75); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
.modal-card { background: #111; border: 1px solid var(--border); border-radius: var(--radius); padding: 1.75rem; width: 100%; max-width: 480px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
.modal-header h3 { font-family: var(--font-serif); font-weight: 400; }
.modal-close { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 1rem; }
.modal-body-row { display: flex; justify-content: space-between; padding: .5rem 0; border-bottom: 1px solid rgba(255,255,255,.04); font-size: .88rem; }
.modal-body-row:last-child { border: none; }
.modal-body-label { color: var(--muted); }
.modal-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1.25rem; }

/* ── Realtime flash ── */
@keyframes highlight { 0%{background:rgba(196,168,130,.15)} 100%{background:transparent} }
.realtime-flash { animation: highlight .6s ease; }

/* ── Toast ── */
#toast-container { position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 200; display: flex; flex-direction: column; gap: .5rem; }
.toast {
  background: #1a1a1a; border: 1px solid var(--border); border-radius: 8px;
  padding: .75rem 1.25rem; font-size: .82rem;
  display: flex; align-items: center; gap: .75rem;
  animation: toastIn .25s ease;
}
@keyframes toastIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:none; } }
.toast.success { border-color: rgba(111,207,151,.3); }
.toast.error   { border-color: rgba(192,57,43,.4); }
.toast-progress { position: absolute; bottom: 0; left: 0; height: 2px; background: var(--accent); border-radius: 0 0 8px 8px; animation: toastProg 4s linear forwards; }
@keyframes toastProg { from{width:100%} to{width:0} }

/* ── Admin badge ── */
.adm-badge { background: var(--accent); color: #080808; border-radius: 50%; font-size: .58rem; font-weight: 700; width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; margin-left: auto; }

/* ══ MOBILE ══════════════════════════ */
@media (max-width: 767px) {
  .adm-sidebar {
    transform: translateX(-100%);
    top: var(--mob-h);
    height: calc(100dvh - var(--mob-h));
    box-shadow: 4px 0 20px rgba(0,0,0,.5);
  }
  .adm-sidebar.open { transform: translateX(0); }
  .adm-mobile-header {
    display: flex; align-items: center; justify-content: space-between;
    position: fixed; top: 0; left: 0; right: 0; height: var(--mob-h);
    background: #0d0d0d; border-bottom: 1px solid var(--border);
    padding: 0 1rem; z-index: 30;
  }
  .burger { background: none; border: none; cursor: pointer; display: flex; flex-direction: column; gap: 5px; padding: .25rem; }
  .burger span { display: block; width: 22px; height: 1.5px; background: var(--text); border-radius: 2px; transition: all .25s; }
  .adm-logo-mobile { font-family: var(--font-serif); font-size: 1rem; letter-spacing: .2em; color: var(--accent); }
  .notif-bell { background: none; border: none; cursor: pointer; color: var(--text); position: relative; display: flex; }
  .adm-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 19; display: block; }
  .adm-main { margin-left: 0; padding: calc(var(--mob-h) + 1.25rem) 1rem 2rem; }
  .stat-cards { grid-template-columns: repeat(2, 1fr); }
  .bookings-table { display: none; }
  .bookings-cards { display: flex !important; }
  .schedule-layout { grid-template-columns: 1fr; }
  .adm-toolbar { flex-direction: column; align-items: stretch; }
  .adm-toolbar-actions { margin-left: 0; }
}
```

- [ ] **Step 2: Manual check**

Reload admin.html — auth card, proper dark styling.

- [ ] **Step 3: Commit**

```bash
git add css/admin.css
git commit -m "feat: admin CSS — sidebar, table, calendar, mobile header, toasts"
```

---

## Task 8: Admin JS

**Files:**
- Rewrite: `js/admin.js`

- [ ] **Step 1: Write admin.js — auth + navigation**

```javascript
// js/admin.js
import { supabase } from './supabase-config.js';

const STATUS_RU = { new: 'Новая', confirmed: 'Подтверждена', done: 'Завершена', cancelled: 'Отменена' };
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

/* ══ Toast ════════════════════════════════════════ */
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${msg}</span><div class="toast-progress"></div>`;
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
}

document.querySelectorAll('.adm-nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    showSection(btn.dataset.section);
    closeSidebar();
  });
});

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
```

- [ ] **Step 2: Add dashboard + bookings functions**

```javascript
/* ══ Dashboard ════════════════════════════════════ */
async function loadDashboard() {
  const now   = new Date();
  const month = now.toISOString().slice(0, 7); // YYYY-MM

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, date, time_slot, style, created_at, user_id');

  if (!bookings) return;

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
  const recent = [...bookings].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const list   = document.getElementById('recent-list');
  list.innerHTML = '';

  for (const b of recent) {
    let clientName = 'Клиент';
    const { data: profile } = await supabase.from('profiles').select('name').eq('id', b.user_id).single();
    if (profile?.name) clientName = profile.name;

    const row = document.createElement('div');
    row.className = 'recent-booking-row';
    row.innerHTML =
      `<div class="recent-booking-row__info">
         <div class="recent-booking-row__name">${clientName}</div>
         <div class="recent-booking-row__meta">${b.date} · ${b.time_slot || ''} · ${b.style || '—'}</div>
       </div>
       <div class="recent-booking-row__actions">
         <span class="status-badge ${b.status}">${STATUS_RU[b.status]}</span>
         ${b.status === 'new' ? `<button class="btn-ghost" style="font-size:.72rem;padding:.3rem .6rem" data-confirm="${b.id}">Подтвердить</button>` : ''}
       </div>`;
    list.appendChild(row);
  }

  list.querySelectorAll('[data-confirm]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', btn.dataset.confirm);
      toast('Запись подтверждена');
      loadDashboard();
    });
  });
}

/* ══ Bookings ═════════════════════════════════════ */
let allBookings = [];

async function loadBookings() {
  const { data } = await supabase
    .from('bookings')
    .select('id, date, time_slot, style, status, notes, user_id, created_at')
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
    tr.innerHTML =
      `<td>${b.user_id?.slice(0,8) || '—'}</td>
       <td>${b.date}</td>
       <td>${b.time_slot || '—'}</td>
       <td>${b.style || '—'}</td>
       <td>
         <select class="adm-status-select" data-id="${b.id}">
           ${['new','confirmed','done','cancelled'].map(s =>
             `<option value="${s}" ${b.status===s?'selected':''}>${STATUS_RU[s]}</option>`
           ).join('')}
         </select>
       </td>
       <td><button class="btn-ghost" style="font-size:.72rem;padding:.3rem .6rem" data-detail="${b.id}">Детали</button></td>`;
    tbody.appendChild(tr);

    // Mobile card
    const card = document.createElement('div');
    card.className = 'booking-mob-card';
    card.innerHTML =
      `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
         <span style="font-size:.88rem">${b.date} · ${b.time_slot || ''}</span>
         <span class="status-badge ${b.status}">${STATUS_RU[b.status]}</span>
       </div>
       <div style="font-size:.8rem;color:var(--muted)">${b.style || '—'}</div>
       <button class="btn-ghost" style="margin-top:.75rem;font-size:.72rem" data-detail="${b.id}">Детали</button>`;
    cards.appendChild(card);
  });

  // Status inline change
  tbody.querySelectorAll('.adm-status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      await supabase.from('bookings').update({ status: sel.value }).eq('id', sel.dataset.id);
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
document.getElementById('search-input')?.addEventListener('input', e => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => filterBookings(), 300);
});
document.getElementById('status-filter')?.addEventListener('change', filterBookings);
function filterBookings() {
  const q   = (document.getElementById('search-input')?.value || '').toLowerCase();
  const st  = document.getElementById('status-filter')?.value || '';
  const filtered = allBookings.filter(b =>
    (!st || b.status === st) &&
    (!q  || (b.style||'').toLowerCase().includes(q) || (b.notes||'').toLowerCase().includes(q))
  );
  renderBookingsTable(filtered);
}

// CSV export
document.getElementById('export-csv-btn')?.addEventListener('click', () => {
  const header = ['ID','Date','Time','Style','Status','Notes'];
  const rows   = allBookings.map(b => [b.id, b.date, b.time_slot, b.style, b.status, b.notes].map(v => `"${v||''}"`).join(','));
  const csv    = [header.join(','), ...rows].join('\n');
  const blob   = new Blob([csv], { type: 'text/csv' });
  const a      = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'bookings.csv' });
  a.click();
});

// Modal
async function openBookingModal(bookingId) {
  const b = allBookings.find(x => x.id === bookingId);
  if (!b) return;

  let clientName = 'Клиент';
  const { data: profile } = await supabase.from('profiles').select('name, phone').eq('id', b.user_id).single();
  if (profile?.name) clientName = profile.name;

  document.getElementById('modal-title').textContent = `Запись ${b.date}`;
  document.getElementById('modal-body').innerHTML =
    `<div class="modal-body-row"><span class="modal-body-label">Клиент</span><span>${clientName}</span></div>
     <div class="modal-body-row"><span class="modal-body-label">Телефон</span><span>${profile?.phone || '—'}</span></div>
     <div class="modal-body-row"><span class="modal-body-label">Дата</span><span>${b.date}</span></div>
     <div class="modal-body-row"><span class="modal-body-label">Время</span><span>${b.time_slot || '—'}</span></div>
     <div class="modal-body-row"><span class="modal-body-label">Стиль</span><span>${b.style || '—'}</span></div>
     <div class="modal-body-row"><span class="modal-body-label">Статус</span><span class="status-badge ${b.status}">${STATUS_RU[b.status]}</span></div>
     ${b.notes ? `<div class="modal-body-row"><span class="modal-body-label">Заметки</span><span>${b.notes}</span></div>` : ''}`;

  const actions = document.getElementById('modal-actions');
  actions.innerHTML =
    `<button class="btn-ghost" id="modal-close-btn">Закрыть</button>
     ${b.status === 'new' ? `<button class="btn-primary" style="width:auto" data-confirm-modal="${b.id}">Подтвердить</button>` : ''}`;

  document.getElementById('modal-close-btn').addEventListener('click', () => document.getElementById('booking-modal').classList.add('hidden'));
  actions.querySelector(`[data-confirm-modal]`)?.addEventListener('click', async () => {
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', b.id);
    document.getElementById('booking-modal').classList.add('hidden');
    toast('Запись подтверждена');
    loadBookings();
  });

  document.getElementById('modal-close').addEventListener('click', () => document.getElementById('booking-modal').classList.add('hidden'));
  document.getElementById('booking-modal').classList.remove('hidden');
}
```

- [ ] **Step 3: Add schedule calendar**

```javascript
/* ══ Schedule Calendar ════════════════════════════ */
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();
let selectedDate   = null;
let blockedDates   = new Set();

async function loadBlockedDates() {
  const { data } = await supabase.from('blocked_dates').select('date');
  blockedDates = new Set((data || []).map(r => r.date));
}

async function renderCalendar() {
  await loadBlockedDates();

  const { data: bookings } = await supabase
    .from('bookings')
    .select('date')
    .gte('date', `${calYear}-${String(calMonth + 1).padStart(2,'0')}-01`)
    .lt('date', `${calYear}-${String(calMonth + 2).padStart(2,'0')}-01`);

  const bookedDates = new Set((bookings || []).map(b => b.date));

  document.getElementById('cal-title').textContent = `${MONTHS_RU[calMonth]} ${calYear}`;
  const grid  = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  DOW.forEach(d => { const el = document.createElement('div'); el.className = 'cal-day-label'; el.textContent = d; grid.appendChild(el); });

  const first = new Date(calYear, calMonth, 1);
  const start = (first.getDay() + 6) % 7; // Monday-based
  for (let i = 0; i < start; i++) { const el = document.createElement('div'); grid.appendChild(el); }

  const days = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  for (let d = 1; d <= days; d++) {
    const date = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const el   = document.createElement('div');
    el.className = 'cal-day';
    el.textContent = d;
    if (date === today)           el.classList.add('today');
    if (date === selectedDate)    el.classList.add('selected');
    if (blockedDates.has(date))   el.classList.add('blocked');
    if (bookedDates.has(date))    el.classList.add('has-bookings');
    el.addEventListener('click', () => selectDate(date));
    grid.appendChild(el);
  }
}

async function selectDate(date) {
  selectedDate = date;
  renderCalendar();

  document.getElementById('selected-date-title').textContent = new Date(date + 'T00:00').toLocaleDateString('ru', { day:'numeric', month:'long', year:'numeric' });

  const { data: dayBookings } = await supabase.from('bookings').select('id, time_slot, style, status, user_id').eq('date', date);
  const list = document.getElementById('date-bookings-list');
  list.innerHTML = '';
  (dayBookings || []).forEach(b => {
    const el = document.createElement('div');
    el.style.cssText = 'padding:.5rem 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.82rem';
    el.innerHTML = `${b.time_slot || '—'} · ${b.style || '—'} <span class="status-badge ${b.status}" style="margin-left:.5rem">${STATUS_RU[b.status]}</span>`;
    list.appendChild(el);
  });

  const isBlocked = blockedDates.has(date);
  const blockBtn   = document.getElementById('block-date-btn');
  const unblockBtn = document.getElementById('unblock-date-btn');
  blockBtn.classList.toggle('hidden', isBlocked);
  unblockBtn.classList.toggle('hidden', !isBlocked);
}

document.getElementById('cal-prev')?.addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); });
document.getElementById('cal-next')?.addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); });

document.getElementById('block-date-btn')?.addEventListener('click', async () => {
  if (!selectedDate) return;
  await supabase.from('blocked_dates').upsert({ date: selectedDate });
  toast('Дата заблокирована');
  selectDate(selectedDate);
});

document.getElementById('unblock-date-btn')?.addEventListener('click', async () => {
  if (!selectedDate) return;
  await supabase.from('blocked_dates').delete().eq('date', selectedDate);
  toast('Дата разблокирована');
  selectDate(selectedDate);
});
```

- [ ] **Step 4: Realtime subscription**

```javascript
/* ══ Realtime ═════════════════════════════════════ */
function subscribeRealtime() {
  supabase.channel('bookings-changes')
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
```

- [ ] **Step 5: Manual test full admin flow**

1. Login with non-admin account → "Нет доступа" error
2. Login with admin account (set `user_metadata.role = 'admin'` in Supabase Auth) → app opens
3. Dashboard: stat cards show counts, recent 5 bookings visible
4. Bookings: search debounces, status filter works, inline status change triggers toast
5. Export CSV → file downloads with booking data
6. Schedule: calendar renders, click date → right panel shows bookings, block/unblock works
7. Resize mobile → burger menu opens slide-in sidebar
8. New booking created in another tab → realtime toast appears

- [ ] **Step 6: Commit**

```bash
git add js/admin.js
git commit -m "feat: admin dashboard, bookings table, schedule calendar, realtime"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Supabase Auth signInWithPassword | Task 4 |
| Admin role check via user_metadata | Task 8 |
| JWT localStorage session, auto-refresh | Handled by Supabase client (Task 1) |
| Cabinet: adaptive bottom nav / sidebar | Task 3 CSS |
| Cabinet: next booking card | Task 5 |
| Cabinet: stat chips | Task 5 |
| Cabinet: loyalty bar 5→silver/10→gold | Task 5 |
| Cabinet: booking filter pills | Task 5 |
| Cabinet: cancel with reason modal | Task 5 |
| Cabinet: skeleton loading | Task 3 CSS (shimmer) |
| Cabinet: notifications badge | Task 5 |
| Cabinet: profile edit + avatar initials | Task 5 |
| Cabinet: password change | Task 5 |
| Admin: sidebar + mobile burger | Task 7 CSS + Task 8 |
| Admin: 4 stat cards | Task 8 |
| Admin: realtime new booking toast | Task 8 |
| Admin: search debounced 300ms | Task 8 |
| Admin: inline status change optimistic | Task 8 |
| Admin: booking detail modal | Task 8 |
| Admin: CSV export | Task 8 |
| Admin: calendar block/unblock dates | Task 8 |
| No innerHTML with user data (XSS) | All tasks use textContent or static template literals with no user data interpolated raw |
| No hardcoded credentials | ✓ (Supabase Auth only) |
| Instrument Serif + Outfit | ✓ both CSS files |
| No Cormorant Garamond / Inter | ✓ not imported |

**One gap:** Reference image upload (Supabase Storage) is in the spec but out of scope for this plan to keep it shippable. Can be added as a follow-up.
