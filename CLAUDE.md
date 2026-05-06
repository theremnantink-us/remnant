# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Knowledge Graph

Project graph for navigation: [docs/obsidian/REMNANT.md](docs/obsidian/REMNANT.md)
All nodes (pages, JS modules, routes, DB tables) are in `docs/obsidian/` as interconnected `.md` files.
When exploring an unfamiliar part of the codebase, start from the relevant node there.

## Project Overview

REMNANT is a tattoo studio booking system. It has a dual-stack architecture:

- **Frontend:** Vanilla HTML/CSS/JS (ES modules), no framework. Pages are mostly standalone HTML files with external JS modules in `js/`.
- **Backend:** Node.js/Express API in `server/`, port 3000. Serves static files in development.
- **Database:** MySQL via MAMP locally (host `127.0.0.1:3306`, user/pass `root/root`, DB `remnant_bd`). Schema initialized automatically on server start via `server/db.js`.
- **3D:** Three.js hero animation in `index.html` (inline `<script type="module">`) with GSAP ScrollTrigger for scroll-driven rotation. 3D model at `public/source/Female Head Anatomy.glb`.

## Commands

```bash
# Start API server (auto-reloads on change)
node --watch server/index.js
# or from root:
npm run server

# Vite dev server (proxies /api → localhost:3000, must run alongside API server)
npm run dev         # port 5173

# Production build
npm run build       # outputs to dist/

# Install server dependencies
cd server && npm install
```

**Local access:**
- Via MAMP static server: `http://localhost:8888/REMNANT/`
- Via Express (full-stack): `http://localhost:3000/`
- Admin panel: `http://localhost:3000/admin.html` (credentials: `root` / `root`)
- Client dashboard: `http://localhost:3000/cabinet.html`

## Architecture

### Two Authentication Systems

Both use JWT signed with `process.env.JWT_SECRET` (default: `'remnant-secret-change-me'`).

- **Admin:** `POST /api/auth/login` with `{ username, password }`. Token stored in `localStorage.remnant_token`. Middleware checks `Authorization: Bearer` header; sets `req.admin`.
- **Client:** `POST /api/client/login` with `{ phone, password }`. Token stored in `localStorage.client_token`. Middleware checks `payload.type === 'client'`; sets `req.clientId`.

### Server Routes (`server/routes/`)

| File | Prefix | Auth | Purpose |
|------|--------|------|---------|
| `auth.js` | `/api/auth` | None | Admin login, password change |
| `bookings.js` | `/api/bookings` | None (POST) | Public booking creation |
| `slots.js` | `/api` | None | Slot availability (`GET /api/slots?date=`) |
| `admin.js` | `/api/admin` | Admin JWT | Bookings CRUD, schedule, calendar, push |
| `client.js` | `/api/client` | Client JWT | Client auth, profile, bookings, notifications |

Note: `GET /api/bookings` (list) and `PATCH/DELETE /api/bookings/:id` are in `admin.js`, not `bookings.js`.

### Database Layer (`server/db.js`)

Four helper functions wrap `mysql2/promise`:
- `query(sql, params)` — returns array of rows
- `get(sql, params)` — returns first row or `null`
- `run(sql, params)` — returns result object (`insertId`, `affectedRows`)
- `transaction(work)` — runs `async work(tx)` in a transaction; `tx` has the same helpers

Always use parameterized queries (`?` placeholders). Tables are created via `initDatabase()` on startup.

### Frontend JS Modules (`js/`)

- `supabase-config.js` — Supabase client (legacy, some pages still use it for auth)
- `common.js` — Nav scroll, burger menu, `window.closeMobileMenu()`, fade-up IntersectionObserver, FAQ accordion, shows client name from JWT in nav
- `home.js` — Moscow clock, GSAP card animations, procedural smoke particles (22-particle canvas)
- `booking.js` — Calendar picker, slot fetching, 3-step form, submits to `/api/bookings`
- `admin.js` — Admin auth, bookings table with filters/search, schedule editor, monthly calendar, Supabase Realtime notifications
- `cabinet.js` — Client auth (phone + password), profile editing, bookings list, notification inbox

### Design System

CSS variables in `style.css`:
```css
--bg: #080808          /* Deep black */
--surface: #0f0f0f
--surface-2: #161616
--text: #e8e3dc        /* Off-white warm */
--text-muted: #6e6660
--accent: #c4a882      /* Gold */
--font-serif: 'Cormorant Garamond', Georgia, serif
--font-sans: 'Inter', system-ui, sans-serif
--nav-h: 72px
```

`admin.html` and `cabinet.html` have large embedded `<style>` blocks (not yet extracted to external CSS).

### Slot Availability Logic

`GET /api/slots?date=YYYY-MM-DD` in `server/routes/slots.js`:
1. Check `blocked_dates` — if fully blocked, return `{ blocked: true }`
2. Check `date_overrides` for custom hours on that date
3. Fall back to `availability[day_of_week]` (default: 12:00–21:00, 120-min slots)
4. Filter out already-booked slots from `bookings` table
5. Hide past time slots when date is today

### Notifications

- **Telegram:** On new booking, sends message if `TG_BOT_TOKEN` + `TG_CHAT_ID` env vars set (`server/routes/bookings.js`)
- **Web Push:** VAPID-based push to all subscribed browsers via `web-push` library; subscriptions stored in `push_subscriptions` table
- **In-app (client):** `client_notifications` table; written when admin changes booking status (`server/routes/admin.js`); client polls every 3s

### Environment Variables (`server/.env`)

```
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=remnant_bd
JWT_SECRET=CHANGE_THIS_TO_RANDOM_64_CHAR_STRING
TG_BOT_TOKEN=         # optional
TG_CHAT_ID=           # optional
```

---

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **REMNANT** (388 symbols, 571 relationships, 15 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/REMNANT/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/REMNANT/context` | Codebase overview, check index freshness |
| `gitnexus://repo/REMNANT/clusters` | All functional areas |
| `gitnexus://repo/REMNANT/processes` | All execution flows |
| `gitnexus://repo/REMNANT/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
