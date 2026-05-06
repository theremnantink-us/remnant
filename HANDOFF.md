Perfect. Now I have enough information. Let me compile the comprehensive audit into a detailed handoff document:

---

# REMNANT Project — Comprehensive Audit & Handoff Document

## Executive Summary
REMNANT is a luxury tattoo studio booking system for a Moscow-based artist. The project consists of a Node.js/Express API backend (port 3000), vanilla JS frontend with Three.js 3D animation, and client/admin dashboards. Database uses MySQL with JWT auth. Project is production-ready but pending Vite bundler setup and VPS deployment.

---

## 1. PROJECT STRUCTURE & FILE INVENTORY

### Root Directory Files (42 total)
```
/Applications/MAMP/htdocs/REMNANT/
├── HTML Pages (7 main + 3 logo files)
│   ├── index.html (42 KB) — Landing with 3D hero animation, portfolio, FAQ preview
│   ├── master.html (17 KB) — Artist bio, portfolio, testimonials
│   ├── studio.html (16 KB) — Studio philosophy, values, map embed
│   ├── booking.html (24 KB) — 3-step booking form (date/time/details)
│   ├── cabinet.html (30 KB) — Client dashboard with auth, bookings, notifications
│   ├── admin.html (61 KB) — Admin panel with calendar, schedule, booking management
│   ├── faq.html (21 KB) — FAQ accordion page
│   ├── aftercare.html (21 KB) — Tattoo care timeline
│   ├── logo-*.html (3 files) — Logo concept explorations
│
├── JavaScript (108 KB total)
│   └── js/
│       ├── common.js — Nav scroll, burger menu, mobile menu, fade-in observer
│       ├── home.js — Clock, GSAP animations, smoke particle effects
│       ├── lightbox.js — Portfolio image gallery with swipe & keyboard nav
│       ├── booking.js — Calendar, slot selection, form submission
│       ├── cabinet.js — Client auth, profile, bookings display, notifications
│       ├── admin.js — Admin auth, bookings table, calendar, schedule editor
│
├── CSS (28 KB)
│   └── style.css — Design system, components, responsive layouts, animations
│
├── Backend (Node.js/Express in /server)
│   ├── index.js — Server entry point, middleware, routing
│   ├── db.js — MySQL connection, schema initialization
│   ├── routes/
│   │   ├── auth.js (2.1 KB) — Admin login, password change
│   │   ├── bookings.js (3.2 KB) — Public booking creation
│   │   ├── admin.js (10 KB) — Admin API (bookings, schedule, calendar, notifications)
│   │   ├── client.js (6.5 KB) — Client auth, profile, bookings, notifications
│   │   └── slots.js (2.8 KB) — Public availability slots endpoint
│   ├── package.json — Node dependencies
│   └── .env.example — Environment variables template
│
├── 3D Assets
│   ├── source/Female Head Anatomy.glb (30 MB) — Master model
│   ├── classical_marble_bust_sculpture.glb (12 MB) — Fallback
│   ├── female_bust_optimized.glb (5.2 MB) — Production model
│   ├── source/Texture/ — 6 sets of PBR textures (color/metal/rough)
│   ├── textures/ (1.3 MB) — 6 color-*.png files for scroll-reveal overlay
│
├── Images (2.4 MB)
│   ├── IMG/ — Tattoo work photos (10+ JPGs)
│   ├── master-photo.jpg/webp — Artist headshot
│   ├── works/ (1.2 MB) — 6 portfolio pieces (work-01 to 06, with thumb variants)
│   ├── tattoos/ (688 KB) — 6 SVG-like PNG designs (angel, blessed, bull, etc)
│   ├── og-image.jpg (80 KB) — Social share preview
│
├── Config & Metadata
│   ├── manifest.json — PWA manifest
│   ├── favicon.svg, apple-touch-icon.png
│   ├── robots.txt, sitemap.xml
│   ├── .claude/launch.json — Dev server config (node --watch, port 3000)
│   ├── .vscode/settings.json
│   ├── deploy.sh — Deployment script stub
│   ├── ecosystem.config.cjs — PM2 config (unused)
│   ├── nginx.conf — Reverse proxy config (unused)
│   ├── sw.js (1.7 KB) — Service Worker (basic PWA support)
│
├── Database
│   └── database.sql — Schema export (if exists)
│   └── server/remnant.db* — SQLite test database files (if any)
│
└── .gitignore, .env.example, start.sh, deploy.sh
```

### Image Assets Summary
- **Master Photo:** `IMG/master-photo.jpg` (watermarked at y=760, 18px, alpha 90%)
- **Portfolio Works:** `works/work-01.webp` to `work-06.webp` with PNG fallbacks + thumb variants
- **Tattoo Designs:** `tattoos/` directory with SVG-style icons
- **Textures:** `source/Texture/` has 6 named folders (Female_Head_Anatomy × 6) with PBR maps; `textures/` has flattened color-0 through color-5 PNGs

---

## 2. SERVER SETUP & API ENDPOINTS

### Server Entry Point
**File:** `/server/index.js` (106 lines)

**Architecture:**
- Express.js with CORS, compression, rate limiting
- Static file serving from parent directory with 7-day cache
- Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- Clean URLs: `/master` → serves `master.html` (line 78–88)

**Middleware Stack:**
```javascript
app.use(compression());
app.use(cors());
app.use(express.json());
// Security headers
app.use((req, res, next) => { 
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // ... 
});
// Static files (7d cache for non-HTML)
app.use(express.static(PUBLIC, {
  maxAge: '7d',
  setHeaders(res, filePath) {
    if (/\.html$/.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
  }
}));
```

**Rate Limiting:**
- General API: 100 req/15min per IP
- Booking: 5 per hour per IP
- Auth: 10 per 15min per IP

**Clean URL Router (lines 78–88):**
```javascript
// GET /master → serves master.html
// GET /studio → serves studio.html
// Does NOT intercept /api/* or files with extensions
```

### Database Layer
**File:** `/server/db.js` (208 lines)

**Connection:**
- MySQL 2 with promise-based API
- Pool: 10 connections, localhost:3306
- Env vars: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (default: remnant_bd)

**API Functions:**
```javascript
query(sql, params)  // Returns array of rows
get(sql, params)    // Returns first row or null
run(sql, params)    // Returns result (insertId, affectedRows)
transaction(work)   // Executes work function in transaction
initDatabase()      // Creates tables, seeds defaults
```

**Database Schema:**

1. **bookings** (11 columns)
   ```sql
   id INT PRIMARY KEY AUTO_INCREMENT
   name, phone VARCHAR (required)
   email, location, style, size VARCHAR (optional)
   description TEXT
   date DATE, time_slot VARCHAR(5) — format "HH:MM"
   status ENUM('new','confirmed','cancelled','done') DEFAULT 'new'
   client_id INT (nullable, linked to clients table)
   created_at, updated_at DATETIME
   ```

2. **availability** (day of week schedule)
   ```sql
   id INT PRIMARY KEY
   day_of_week TINYINT (0–6, Sun–Sat) UNIQUE
   start_time, end_time VARCHAR(5) — default "12:00"–"21:00"
   slot_minutes INT — default 120
   ```

3. **blocked_dates** (specific closed dates)
   ```sql
   id INT PRIMARY KEY
   date DATE UNIQUE
   reason VARCHAR(255)
   ```

4. **date_overrides** (special hours for specific dates)
   ```sql
   id INT PRIMARY KEY
   date DATE UNIQUE
   start_time, end_time, slot_minutes
   ```

5. **admins** (staff auth)
   ```sql
   id INT PRIMARY KEY
   username VARCHAR(100) UNIQUE
   password VARCHAR(255) — bcrypt hash
   ```

6. **clients** (customer accounts)
   ```sql
   id INT PRIMARY KEY
   name, phone VARCHAR — phone UNIQUE
   email, password (bcrypt hash)
   avatar_initials VARCHAR(5)
   created_at, updated_at DATETIME
   ```

7. **client_notifications** (in-app messages)
   ```sql
   id INT PRIMARY KEY
   client_id, booking_id INT
   type VARCHAR(50) — default 'status_change'
   message TEXT
   is_read TINYINT(1)
   created_at DATETIME
   ```

8. **push_subscriptions** (web push tokens)
   ```sql
   id INT PRIMARY KEY
   endpoint TEXT UNIQUE
   p256dh, auth TEXT (VAPID keys)
   created_at DATETIME
   ```

**Default Users (initialized on startup):**
- `admin` / `remnant2025` (bcrypt hashed)
- `root` / `root` (bcrypt hashed)

### API Routes

#### Authentication Routes
**File:** `/server/routes/auth.js` (64 lines)

```
POST /api/auth/login
  Body: { username, password }
  Returns: { ok: true, token } (JWT, 24h expiry)
  
POST /api/auth/change-password
  Header: Authorization: Bearer {token}
  Body: { current_password, new_password }
  Returns: { ok: true }
```

**JWT Secret:** `process.env.JWT_SECRET` || `'remnant-secret-change-me'`

**Auth Middleware:**
```javascript
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return 401;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    req.admin = payload;
    next();
  } catch { return 401; }
}
```

#### Booking Routes (Public)
**File:** `/server/routes/bookings.js` (91 lines)

```
POST /api/bookings
  Body: { 
    name, phone (required), 
    email, location, style, size, description (optional),
    date (YYYY-MM-DD), time_slot (HH:MM)
  }
  Returns: { ok: true, id } (201 if created)
  
  Side effects:
    - Checks slot not already booked
    - Sends Telegram notification (if TG_BOT_TOKEN set)
    - Broadcasts web push to all subscribers
    - If client logged in, links booking to client_id
```

**Telegram Integration:**
```javascript
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || '';
const TG_CHAT_ID = process.env.TG_CHAT_ID || '';
// Sends formatted message to admin chat on new booking
```

**Web Push Integration:**
```javascript
sendPushToAll({
  type: 'new_booking',
  title: 'REMNANT — Новая запись',
  body: `${name} · ${date} в ${time_slot}`,
  id: result.insertId,
  date
})
```

#### Slot Availability Routes
**File:** `/server/routes/slots.js` (81 lines)

```
GET /api/slots?date=YYYY-MM-DD
  Returns: { 
    date, 
    slots: [{ start: "HH:MM", end: "HH:MM", available: bool }],
    blocked: bool,
    message?: string
  }
  
  Logic:
    1. Check if date is blocked_dates
    2. Check for date_overrides (special hours)
    3. Fall back to availability[day_of_week]
    4. Generate slots (e.g., 2-hour slots from 12:00–21:00)
    5. Filter out already-booked slots
    6. Hide past slots if today
    
GET /api/availability
  Returns: { 
    availability: [{ day_of_week, start_time, end_time, slot_minutes }],
    blocked_dates: [{ date, reason }]
  }
```

#### Admin Routes
**File:** `/server/routes/admin.js` (274 lines)

**All endpoints require:** `Authorization: Bearer {token}`

```
GET /api/bookings
  Query: { status?, date?, from?, to?, limit=50, offset=0 }
  Returns: { bookings: [], total: count }
  
PATCH /api/bookings/:id
  Body: { status: 'new'|'confirmed'|'done'|'cancelled' }
  Side effect: Creates client_notifications if status changed
  
DELETE /api/bookings/:id
  Removes booking completely

GET /api/stats
  Returns: { 
    total: count,
    upcoming: count (future + new/confirmed),
    byStatus: [{ status, count }, ...]
  }

GET /api/calendar?year=2026&month=3
  Returns: {
    availability: [...],
    blocked_dates: [...],
    date_overrides: [...],
    booking_counts: [{ date, count }, ...]
  }

GET /api/availability
PUT /api/availability
  Body: { schedule: [{ day_of_week, start_time, end_time, slot_minutes }, ...] }
  Replaces all availability rows

POST /api/blocked-dates
  Body: { date, reason? }
DELETE /api/blocked-dates/:date

POST /api/date-overrides
  Body: { date, start_time, end_time, slot_minutes? }
DELETE /api/date-overrides/:date

GET /api/push/vapid-key
  Returns: { publicKey: "..." }
  
POST /api/push/subscribe
  Body: { endpoint, keys: { p256dh, auth } }
  
DELETE /api/push/unsubscribe
  Body: { endpoint }

GET /api/notifications
  Returns recent 30 bookings (unfiltered notifications)
```

**VAPID Keys (Web Push):**
```javascript
const VAPID_PUBLIC = 'BHzpv_sieYRh-IF5UCJ7Ac7vfOcEV8PgyC71_bGg10oOeytsfgE3tVtQgQ9V25SLKpzp3fQCOOjL89RL8qKTe-o';
const VAPID_PRIVATE = 'JN2E4NwQuDrKDqaE6Rt878J5ZHv6VEs3L-Dzbp321i8';
```

#### Client Routes
**File:** `/server/routes/client.js` (151 lines)

```
POST /api/client/register
  Body: { name, phone (required), email?, password (min 6 chars) }
  Returns: { ok: true, token, name, id } (201)
  Side effect: Links existing bookings by phone digits
  
POST /api/client/login
  Body: { phone, password }
  Returns: { ok: true, token, name, id }

GET /api/client/profile
  Header: Authorization: Bearer {token}
  Returns: { id, name, phone, email, created_at }
  
PATCH /api/client/profile
  Body: { name?, email?, password?, newPassword? }
  If newPassword: requires current password verification

GET /api/client/bookings
  Returns: { 
    bookings: [all bookings linked to client, by phone or client_id]
  }

GET /api/client/notifications
  Returns: {
    notifications: [{ id, type, message, is_read, created_at, date, time_slot, booking_status }],
    unread: count
  }

POST /api/client/notifications/read
  Sets all notifications as read for this client
```

**Client Auth Middleware:**
```javascript
function clientAuthMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return 401;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    if (payload.type !== 'client') return 403;
    req.clientId = payload.id;
    next();
  } catch { return 401; }
}
```

---

## 3. FRONTEND PAGES & STRUCTURE

### index.html (Landing) — 807 lines, 42 KB
**Features:**
- Full-page Three.js 3D hero animation (bust model with scroll-driven camera)
- Moscow clock in hero (updates every 1s)
- Procedural smoke/fog overlay (22 particles with wave motion)
- GSAP ScrollTrigger animations for card fly-ins
- Marquee banner (repeating text)
- Philosophy section with blur overlay effect
- About section with stats grid
- Master preview with artist bio
- Portfolio grid (6 items) with lightbox
- FAQ preview (4 items, accordion)
- CTA section
- Footer with Yandex map iframe

**External Libraries:**
```html
<script src="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500&display=swap">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js">
<script type="module" src="three.js v0.169.0 + GLTFLoader">
```

**Meta Tags:**
- OpenGraph (social share image: og-image.jpg)
- Twitter Card
- Structured Data (JSON-LD): LocalBusiness + FAQPage schema
- PWA: manifest.json, apple-touch-icon, theme-color

**Key HTML Sections:**
```html
<canvas id="hero-canvas">  <!-- Three.js renders here -->
<canvas id="smoke-canvas">  <!-- Procedural smoke overlay -->
<div class="hero">          <!-- Hero section (100vh) -->
<nav class="nav">           <!-- Fixed header -->
<div class="mobile-menu">   <!-- Mobile nav -->
<main>                      <!-- Scrollable content (z-index: 15+) -->
<footer>                    <!-- Footer with map -->
<div class="lightbox">      <!-- Portfolio image lightbox -->
```

### master.html (Artist Page) — 17 KB
**Inline Styles:** Hero, gallery grid, biography section
**Content:**
- Artist bio and specialization
- Portfolio gallery (6 works)
- Testimonials section
- Experience timeline
- Skills/techniques list

### studio.html (Studio Page) — 16 KB
**Inline Styles:** Studio hero, philosophy section, values grid, amenities
**Content:**
- Studio philosophy statement
- Core values (3-column grid)
- Studio amenities & features
- Yandex map embed

### booking.html (Booking Form) — 24 KB
**Inline Styles:** Form layout, calendar, slots grid, step indicators
**3-Step Flow:**
1. **Step 1:** Select date & time
   - Calendar picker (prev/next month buttons)
   - Slot grid (available times)
2. **Step 2:** Contact info
   - Name, phone, email, location
   - Tattoo style (select), size (input)
3. **Step 3:** Details
   - Tattoo description (textarea)
   - Submit button

**Form Validation:**
- Client-side: name, phone, date, time_slot required
- Server-side: phone format, date format (YYYY-MM-DD)

### cabinet.html (Client Dashboard) — 30 KB
**Inline CSS + HTML:** Embedded due to client-side state complexity
**Structure:**
```html
<div id="auth-screen">      <!-- Login/register forms -->
<div id="app-screen">       <!-- Main dashboard -->
  <nav class="nav-tabs">    <!-- Bookings, Profile, Notifications -->
  <div id="tab-bookings">    <!-- Booking list & filters -->
  <div id="tab-profile">     <!-- Edit profile, change password -->
  <div id="tab-notifications"> <!-- Message list -->
```

**Features:**
- JWT token stored in localStorage (`client_token`, `client_name`)
- Register/Login tabs with form validation
- Password visibility toggle
- Booking list with status filters (upcoming, past, all)
- Edit profile with password change
- Notification inbox with mark-as-read

### admin.html (Admin Panel) — 61 KB
**Inline CSS + HTML:** Large embedded CSS + JavaScript
**Structure:**
```html
<div id="loginWrap">        <!-- Admin login form -->
<div id="adminPanel">       <!-- Main panel (hidden until auth) -->
  <nav class="admin-tabs">  <!-- Bookings, Schedule, Calendar, Settings -->
  <div id="bookings-tab">    <!-- Table of bookings with filters -->
  <div id="schedule-tab">    <!-- Weekly availability editor -->
  <div id="calendar-tab">    <!-- Monthly calendar view -->
  <div id="notif-drawer">    <!-- Real-time notifications -->
```

**Features:**
- Admin JWT auth (token in localStorage as `remnant_token`)
- Real-time notifications polling (3s interval)
- Bookings table with status badge, date/time, client info
- Change booking status (new → confirmed → done)
- Delete bookings
- Schedule editor: set hours per day of week, slot duration
- Block dates (specify closed dates with reason)
- Date overrides (custom hours for specific date)
- Monthly calendar view with booking count per day
- Search/filter bookings by status, date range
- Toast notifications for actions

### faq.html (FAQ Page) — 21 KB
**Inline Styles:** FAQ container, accordion items
**Content:**
- Accordion with 8+ FAQ items (collapsible)
- Topics: pain, preparation, cost, sketches, healing, second tattoo, etc.

### aftercare.html (Aftercare Guide) — 21 KB
**Inline Styles:** Timeline layout, stage styling
**Content:**
- Timeline (Week 1, Week 2, Week 3, Week 4)
- Do's and Don'ts for each stage
- Product recommendations
- Contact info for questions

---

## 4. JAVASCRIPT MODULES

### common.js (Shared functionality)
**Line count:** 68 lines
**Exports:** Global functions + DOM observers

```javascript
// Nav scroll effect (adds 'scrolled' class when scrollY > 50)
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 50);
});

// Mobile menu toggle
burger.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  burger.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
});

// Global function
window.closeMobileMenu()

// Cabinet token — show client name in nav
// Decodes JWT from localStorage, extracts 'name' claim
localStorage.getItem('client_token')

// Fade-in observer (IntersectionObserver)
document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));
// When element scrolls into view (threshold: 0.12), adds 'visible' class

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    // Toggle open/closed state, close others
  });
});
```

### home.js (Landing page animation)
**Line count:** 167 lines
**Functions:**

```javascript
// 1. Moscow clock update
function updateTime() {
  const now = new Date();
  document.getElementById('hero-time').textContent = `Москва · ${h}:${m}:${s}`;
}
setInterval(updateTime, 1000);

// 2. GSAP glass card animations
document.querySelectorAll('.glass-card').forEach(card => {
  gsap.fromTo(card, { opacity: 0, y: 80 }, {
    opacity: 1, y: 0,
    scrollTrigger: { trigger: card, start: 'top 85%', scrub: 1.2 }
  });
});

// 3. Blur overlay animation (scroll from philosophy → master)
gsap.fromTo(blurEl, { opacity: 0 }, {
  opacity: 1,
  scrollTrigger: {
    trigger: blurStart, start: 'top bottom',
    endTrigger: blurEnd, end: 'bottom top',
    scrub: true
  }
});

// 4. Smoke/fog particle system (22 particles)
(function initSmoke() {
  const canvas = document.getElementById('smoke-canvas');
  const particles = [];
  
  // Particle properties:
  // - x, y (position)
  // - vx, vy (velocity)
  // - size (250–750px)
  // - opacity (6–15%)
  // - phase, waveAmp, waveSpeed (for wave motion)
  // - life, growSpeed (fade-in over time)
  
  // Animation loop:
  // - Move particles right, up with sine wave
  // - Draw as radial gradients (soft edges)
  // - Recycle particles at edges
  // - Opacity controlled by scroll (fades out as scroll down)
})();

// 5. Hero text show/hide
// Initially opacity: 0, shown after model loads (3s timeout fallback)
```

**Key Constants:**
- `PARTICLE_COUNT = 22`
- `COLORS` array: 5 tan/beige shades
- `smokeOpacity`: 1 at top, 0 after 1.5x viewport height scrolled

### lightbox.js (Image gallery)
**Line count:** 163 lines
**IIFE pattern:** Self-contained, no exports

```javascript
(function() {
  const items = document.querySelectorAll('.portfolio-item[data-lightbox]');
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  
  let current = 0;
  let animating = false;
  const ANIM_MS = 320;
  const EASE = 'cubic-bezier(.22,1,.36,1)';
  
  // Show image at index
  function show(idx) {
    current = (idx + items.length) % items.length;
    lbImg.src = items[current].dataset.lightbox;
    lb.classList.add('open');
  }
  
  // Slide with transform animation
  function slideTo(idx, dir) {
    // Animate out: translateX(±100vw) scale(0.88)
    // Load image
    // Animate in: translateX(0) scale(1)
  }
  
  // Event handlers:
  // - Click portfolio items → show(i)
  // - Click prev/next buttons → slideTo()
  // - Escape key → close()
  // - Arrow keys → slide
  // - Touch swipe detection
  
  // Swipe logic:
  // - Track touchstart position & time
  // - On touchend, calculate velocity
  // - If moved >50px or velocity >0.3 → slide, else snap back
  // - Support iOS swipe-to-go-back prevention
})();
```

**Data Attributes:**
```html
<div class="portfolio-item" 
     data-lightbox="works/work-01.webp" 
     data-lightbox-fallback="works/work-01.png">
```

### booking.js (Booking page)
**Line count:** 250+ (read limit 150)
**Key Functions:**

```javascript
const API = (port === 3000) ? '' : `${location.protocol}//${location.hostname}:3000`;

// Calendar rendering
function renderCalendar(year, month) {
  // Generate grid of days
  // Disable past dates
  // Highlight selected date
  // Click handler → selectDate()
}

// Slot selection
async function selectDate(iso) {
  // Fetch /api/slots?date=${iso}
  // Render available slots
  // Click handler → set selectedSlot
  // Enable "Next" button
}

// Step navigation
function goToStep(n) {
  // Show step n, highlight in progress indicator
  // Steps: 1=Date/Time, 2=Contact, 3=Details
}

// Form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const payload = {
    name, phone, email, location, style, size, description,
    date, time_slot
  };
  
  // If client logged in: add Authorization header with JWT
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: ... },
    body: JSON.stringify(payload)
  });
  
  if (res.ok) {
    // Show success message, reset form
  } else {
    // Show error toast
  }
});
```

**Constants:**
- `MONTHS`, `DOW` (Russian locale arrays)
- `selectedDate`, `selectedSlot` (form state)

### cabinet.js (Client dashboard)
**Line count:** 500+ (read limit 150)
**State Management:**
```javascript
let clientToken = localStorage.getItem('client_token');
let clientProfile = null;
let allBookings = [];
let currentFilter = 'upcoming';
let notifPollTimer = null;
```

**Key Functions:**

```javascript
// Auth
async function doLogin() {
  const res = await fetch('/api/client/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password })
  });
  const data = await res.json();
  if (res.ok) {
    clientToken = data.token;
    localStorage.setItem('client_token', data.token);
    localStorage.setItem('client_name', data.name);
    showApp();  // Switch to dashboard
  }
}

async function doRegister() {
  const res = await fetch('/api/client/register', { ... });
  // Similar flow
}

// Dashboard
function loadProfile() {
  const res = await api('GET', '/profile');
  clientProfile = res.data;
  renderProfile();
}

function loadBookings() {
  const res = await api('GET', '/bookings');
  allBookings = res.data.bookings;
  renderBookings();
}

// Filter bookings by status
function renderBookings() {
  const filtered = allBookings.filter(b => {
    if (currentFilter === 'upcoming') return new Date(b.date) >= today && b.status !== 'cancelled';
    // ...
  });
}

// Notifications polling
function startNotifPolling() {
  notifPollTimer = setInterval(() => {
    loadNotifications();
  }, 3000);  // Poll every 3 seconds
}

// Logout
function logout(clear = true) {
  clientToken = '';
  localStorage.removeItem('client_token');
  localStorage.removeItem('client_name');
  showAuth();
}
```

**API Helper:**
```javascript
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (clientToken) opts.headers['Authorization'] = 'Bearer ' + clientToken;
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch('/api/client' + path, opts);
  if (res.status === 401) { logout(false); throw new Error('Session expired'); }
  return { ok: res.ok, status: res.status, data: await res.json() };
}
```

### admin.js (Admin panel)
**Line count:** 500+ (read limit 150)
**Key Sections:**

```javascript
const API = (port === 3000) ? '' : `${location.protocol}//${location.hostname}:3000`;
let token = localStorage.getItem('remnant_token') || '';

// Utils
function esc(s) { /* HTML escape */ }
function pad(n) { return String(n).padStart(2, '0'); }
function toast(msg, type = 'success') { /* Show toast notification */ }

// Auth flow
async function doLogin() {
  const res = await fetch(API + '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (res.ok) {
    token = data.token;
    localStorage.setItem('remnant_token', token);
    showAdmin();
  }
}

// Bookings table
async function loadBookings(status = 'new') {
  const res = await apiCall('/api/bookings?status=' + status);
  const data = await res.json();
  renderBookingsTable(data.bookings);
}

// Change booking status
async function updateBookingStatus(id, status) {
  const res = await apiCall(`/api/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  if (res.ok) {
    toast('Статус обновлен');
    loadBookings();
  }
}

// Schedule editor
async function loadScheduleTab() {
  const res = await apiCall('/api/availability');
  const data = await res.json();
  scheduleData = data.availability;
  renderScheduleTable();
  // Each day shows time inputs
}

// Calendar view
async function initBookingsCal() {
  // Monthly calendar with booking counts per day
  // Prev/next month buttons
  // Click date → shows bookings for that day
}

// Notifications polling
function startNotifPolling() {
  setInterval(async () => {
    const res = await apiCall('/api/notifications');
    const data = await res.json();
    if (data.notifications.length > 0) {
      showNotificationDrawer(data.notifications);
    }
  }, 3000);
}
```

**API Helper (with auth):**
```javascript
async function apiCall(url, opts = {}) {
  opts.headers = { 
    ...opts.headers, 
    'Content-Type': 'application/json', 
    Authorization: `Bearer ${token}` 
  };
  const res = await fetch(API + url, opts);
  if (res.status === 401) { showLogin(); throw new Error('Unauthorized'); }
  return res;
}
```

---

## 5. CSS & DESIGN SYSTEM

**File:** `style.css` (1001 lines, 28 KB)

### Design Tokens (CSS Variables)
```css
:root {
  /* Color palette */
  --bg: #080808;                    /* Deep black */
  --surface: #0f0f0f;               /* Surface elevation 1 */
  --surface-2: #161616;             /* Surface elevation 2 */
  --text: #e8e3dc;                  /* Off-white (warm) */
  --text-muted: #6e6660;            /* Muted text */
  --accent: #c4a882;                /* Gold */
  --accent-dim: rgba(196,168,130,0.12);
  
  /* Typography */
  --font-serif: 'Cormorant Garamond', Georgia, serif;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  
  /* Layout */
  --nav-h: 72px;
  
  /* Easing */
  --ease: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-inout: cubic-bezier(0.76, 0, 0.24, 1);
  
  /* Canvas z-index (dynamically set by home.js) */
  --canvas-z: 0;
}
```

### Component Classes

**Navigation:**
```css
.nav {                      /* Fixed header, 72px */
  position: fixed;
  z-index: 100;
  backdrop-filter: blur(16px) when .scrolled;
}

.nav-logo { font-size: 1.45rem; letter-spacing: .22em; }
.nav-links { display: flex; gap: 2.8rem; }
.nav-cta { border: 1px solid accent; }
.nav-cabinet-btn { color: accent; }

.mobile-menu {              /* Full-screen nav for mobile */
  position: fixed;
  inset: 0;
  z-index: 99;
  opacity: 0;
  pointer-events: none;
}
.mobile-menu.open { opacity: 1; pointer-events: all; }

.nav-burger {               /* Hamburger menu (desktop: hidden) */
  display: flex;
  flex-direction: column;
  gap: 5px;
  @media (min-width: 768px) { display: none; }
}
```

**Hero Section:**
```css
.hero {
  position: relative;
  height: 100vh;
  min-height: 620px;
  display: flex;
  align-items: center;
  z-index: 5;
}

#hero-canvas {              /* Three.js render target */
  position: fixed;
  inset: 0;
  z-index: var(--canvas-z);
  pointer-events: none;
}

#smoke-canvas {             /* Procedural smoke overlay */
  position: fixed;
  inset: 0;
  z-index: calc(var(--canvas-z) + 1);
  pointer-events: none;
  filter: blur(2px);
}

.hero-content { position: relative; z-index: 2; }
.hero-title { font-size: clamp(5.5rem, 14vw, 12rem); }
.hero-scroll {              /* "ПРОКРУТИ" text + animated line */
  position: absolute;
  bottom: 2.5rem;
  display: flex;
  gap: 1rem;
}
.scroll-line { animation: scroll-pulse 2.2s ease-in-out infinite; }
.hero-time { position: absolute; bottom: 2.5rem; right: 5vw; }
```

**Glass Cards:**
```css
.glass-card {
  background: rgba(8, 8, 8, 0.55);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);  /* Safari */
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 3rem 5vw;
}

.about-card, .master-card, .portfolio-card, .faq-card, .cta-card {
  margin-top: 3rem;
}
```

**Buttons:**
```css
.btn {
  display: inline-block;
  padding: .85rem 2rem;
  font-size: .63rem;
  letter-spacing: .28em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background .3s, color .3s;
}

.btn-outline { border: 1px solid text; }
.btn-outline:hover { background: text; color: bg; }

.btn-accent { border: 1px solid accent; color: accent; }
.btn-accent:hover { background: accent; color: bg; }

.btn-fill { background: accent; color: bg; }
.btn-fill:hover { background: transparent; color: accent; }
```

**Marquee:**
```css
.marquee {
  overflow: hidden;
  background: var(--surface);
  padding: 3rem 0;
}

.marquee-track {
  display: flex;
  gap: 2rem;
  animation: marquee-scroll linear infinite;
  will-change: transform;
}

@keyframes marquee-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

**FAQ Accordion:**
```css
.faq-item { border-bottom: 1px solid border; }

.faq-question {
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.faq-icon {               /* Rotate on .open state */
  transform: rotate(0deg);
  transition: transform .3s;
}

.faq-item.open .faq-icon { transform: rotate(180deg); }

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height .3s;
}

.faq-item.open .faq-answer { max-height: 500px; }
```

**Fade-in Animation:**
```css
.fade-up {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity .6s, transform .6s;
}

.fade-up.visible { opacity: 1; transform: none; }
```

**Responsive Design:**
```css
@media (max-width: 768px) {
  .nav-burger { display: flex; }
  .nav-links { display: none; }
  .mobile-menu { display: flex; }
  
  .hero-title { font-size: 3rem; }
  
  .glass-card { padding: 2rem 1rem; }
  
  .master-info { grid-template-columns: 1fr; gap: 2rem; }
}

@media (max-width: 480px) {
  :root { --nav-h: 56px; }
  .hero-title { font-size: 2.5rem; }
  .glass-card { border-radius: 8px; }
}
```

---

## 6. THREE.JS 3D ANIMATION (Hero Section)

**Location:** `index.html`, lines 429–807 (inline `<script type="module">`)

### Scene Setup
```javascript
const canvas = document.getElementById('hero-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080808);
scene.fog = new THREE.FogExp2(0x080808, 0.18);  /* Atmospheric fog */

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
camera.position.set(0, 0.0, 3.8);
```

### Lighting Setup (5 lights)
```javascript
// Ambient: soft overall light
scene.add(new THREE.AmbientLight(0x1a1520, 2.5));

// Key light: warm, high-angle (theatrical key light)
const key = new THREE.DirectionalLight(0xfff6e8, 5.5);
key.position.set(3.5, 7, 4.5);

// Fill light: cool blue, opposite side
const fill = new THREE.DirectionalLight(0x8090c0, 1.2);
fill.position.set(-4, 1, 3);

// Rim light: cool blue, back-rim to separate subject
const rim = new THREE.DirectionalLight(0x5060c8, 2.2);
rim.position.set(-2, 4, -6);

// Bottom light: warm underlight (subtle)
const bot = new THREE.DirectionalLight(0x80600a, 0.3);
bot.position.set(0, -5, 2);
```

### Model Loading
```javascript
const loader = new GLTFLoader();
loader.load(
  './source/Female%20Head%20Anatomy.glb',
  gltf => {
    bust = gltf.scene;
    
    // Normalize size (fit to 2.2 units)
    const box = new THREE.Box3().setFromObject(bust);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2.2 / maxDim;
    bust.scale.setScalar(scale);
    
    // Center at origin, offset down slightly
    const center = box.getCenter(new THREE.Vector3());
    bust.position.sub(center.multiplyScalar(scale));
    bust.position.y -= 0.65;
    bust.position.x += 0;
    
    // Store base position
    bustBaseY = bust.position.y;
    bustBaseX = bust.position.x;
    
    // Apply material (standard PBR)
    bust.traverse(child => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xcdc8c2),  /* Marble white */
          roughness: 0.72,
          metalness: 0.04,
        });
      }
    });
    
    bust.rotation.x = BASE_ROT_X = -0.08;
    bust.rotation.y = rotProxy.y = 4.2;  /* ~3/4 face to camera */
    scene.add(bust);
    
    setupTextureScroll(bust);  /* Texture overlay system */
    showHeroText();
  },
  undefined,
  err => {
    console.warn('Model load failed');
    showParticles();  /* Fallback particle effect */
    showHeroText();
  }
);
```

### Scroll-Driven Animation (GSAP ScrollTrigger)
**Key Animation Variables:**
- `rotProxy.y` (rotation around Y-axis)
- `rotProxy.z` (tilt for dutch angles)
- `camProxy` (camera position offset)

**7-Stage Animation Timeline:**
```
Progress  Stage               Camera                 Bust Rotation
0–10%     Intro drift         Zoom in (3.2)         Slow pan (-0.5)
10–22%    Profile snap       Pan right (0.15x)     Left profile (-π/2), dutch tilt
22–40%    Back reveal        Return center          Back of head (-π)
40–50%    Hold tattoo        Zoom in (2.6)          Slight tilt
50–62%    Whip pan           Pan left (-0.12x)      Right profile (-π*1.5), dutch (-0.04)
62–80%    Dramatic return    Zoom in (2.2)          Face (−2π+0.3)
80–100%   Final settle       Reset (3.8)            Return to start (−2π)
```

**Animation Code:**
```javascript
const scrollTimeline = gsap.timeline({
  scrollTrigger: {
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 3,  /* Smooth scrub with 3s lag */
    onUpdate: self => {
      // Update canvas z-index (bring to front after 4% scroll)
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty('--canvas-z', self.progress > 0.04 ? '10' : '0');
    }
  }
});

scrollTimeline
  // 1. Intro drift
  .to(rotProxy, { y: startY - 0.5, duration: 0.10, ease: 'power1.inOut' }, 0)
  .to(camProxy, { z: 3.2, duration: 0.10, ease: 'sine.inOut' }, 0)
  
  // 2. Profile snap
  .to(rotProxy, { y: startY - PI * 0.5, duration: 0.12, ease: 'power3.inOut' }, 0.10)
  .to(rotProxy, { z: 0.03, duration: 0.06, ease: 'power2.out' }, 0.10)
  .to(camProxy, { z: 2.4, x: 0.15, duration: 0.12, ease: 'power2.inOut' }, 0.10)
  
  // [... 5 more stages ...]
```

**Hero Text Fade:**
```javascript
gsap.to('#hero-text', {
  opacity: 0,
  y: -60,
  ease: 'none',
  scrollTrigger: {
    trigger: '#hero',
    start: '30% top',
    end: '75% top',
    scrub: 1
  }
});
```

### Texture Scroll System
**6 texture sets loaded progressively as user scrolls:**

```javascript
const TEXTURE_COUNT = 6;

// Load texture with alpha (white → transparent)
async function loadAlphaTexture(url) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    // Draw image to canvas
    // Iterate pixels: if lum >= 240 (white) → set alpha to 0
    // Create CanvasTexture and return
  };
}

// Set up overlay meshes for each texture
async function setupTextureScroll(bustGroup) {
  const textures = await Promise.all([
    loadAlphaTexture('./textures/color-0.png'),
    loadAlphaTexture('./textures/color-1.png'),
    // ... through color-5.png
  ]);
  
  // For each texture, create overlay mesh with MeshBasicMaterial
  const overlays = [];
  textures.forEach((tex, i) => {
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -(i + 1) * 2,
    });
    
    const overlay = new THREE.Mesh(headMesh.geometry.clone(), mat);
    overlays.push(overlay);
    scene.add(overlay);
  });
  
  // Animate opacity based on scroll progress
  // As user scrolls, textures fade in one by one
}
```

### Render Loop
```javascript
function animate() {
  requestAnimationFrame(animate);
  
  // Float animation (gentle bobbing)
  floatTime += 0.016;
  if (bust) {
    bust.position.y = bustBaseY + Math.sin(floatTime * 0.5) * 0.08;
    bust.position.x = bustBaseX + Math.cos(floatTime * 0.3) * 0.05;
  }
  
  // Mouse tracking (orbit effect)
  mouse.x += (mouse.tx - mouse.x) * 0.05;
  mouse.y += (mouse.ty - mouse.y) * 0.05;
  
  // Apply rotation from rotProxy (updated by GSAP)
  if (bust) {
    bust.rotation.y = rotProxy.y;
    bust.rotation.z = rotProxy.z;
  }
  
  // Apply camera position from camProxy
  camera.position.z = camProxy.z;
  camera.position.x = camProxy.x + mouse.x * 0.1;
  camera.position.y = camProxy.y + mouse.y * 0.1;
  
  // Render scene
  renderer.render(scene, camera);
}
animate();
```

---

## 7. DATABASE SCHEMA

**MySQL Database:** `remnant_bd`

### Tables (8 total)

| Table | Columns | Keys | Purpose |
|-------|---------|------|---------|
| **bookings** | 11 | id PK, client_id FK | Tattoo session requests |
| **availability** | 4 | day_of_week UNIQUE | Weekly schedule (Mon–Sun) |
| **blocked_dates** | 3 | date UNIQUE | Closed dates |
| **date_overrides** | 5 | date UNIQUE | Special hours for specific dates |
| **admins** | 3 | username UNIQUE | Staff accounts |
| **clients** | 6 | phone UNIQUE | Customer accounts |
| **client_notifications** | 6 | client_id FK, booking_id FK | In-app messages |
| **push_subscriptions** | 4 | endpoint UNIQUE | Web push registrations |

### Initialization (db.js line 72–207)
- **Default admins:** `admin`/`remnant2025`, `root`/`root` (bcrypt hashed, 10 salt rounds)
- **Default availability:** All days 12:00–21:00, 120-minute slots
- **Character set:** UTF-8MB4 with unicode collation

---

## 8. AUTHENTICATION SYSTEM

### Admin Auth (JWT)
**Login:** `POST /api/auth/login`
- **Input:** `{ username, password }`
- **Flow:** 
  1. Query `admins` by username
  2. Compare plaintext password with bcrypt hash
  3. If match: generate JWT with `{ id, username }`, 24-hour expiry
  4. Return token
- **Usage:** All admin endpoints require `Authorization: Bearer {token}` header
- **Storage:** `localStorage.remnant_token` (client-side)

### Client Auth (JWT)
**Register:** `POST /api/client/register`
- **Input:** `{ name, phone, email?, password }`
- **Flow:**
  1. Check phone uniqueness
  2. Hash password (bcrypt, 10 rounds)
  3. Create client record
  4. Link existing bookings by normalized phone
  5. Generate JWT with `{ id, type: 'client' }`, 30-day expiry
  6. Return token
- **Storage:** `localStorage.client_token`, `localStorage.client_name`

**Login:** `POST /api/client/login`
- **Input:** `{ phone, password }`
- **Flow:** Similar to register, but fetch existing client

**Profile:** `GET/PATCH /api/client/profile`
- **Input (PATCH):** `{ name?, email?, password?, newPassword? }`
- **Verification:** If `newPassword`, must provide current `password`

### JWT Middleware
```javascript
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return 401 Unauthorized;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    req.admin = payload;  // or req.clientId for client auth
    next();
  } catch {
    return 401 Invalid token;
  }
}
```

**JWT Secret:** `process.env.JWT_SECRET` || `'remnant-secret-change-me'` (⚠️ **MUST change for production**)

---

## 9. IMAGES & ASSETS INVENTORY

### Master Photos
- `IMG/master-photo.jpg` (JPEG) — Artist headshot
- `IMG/master-photo.webp` (WebP) — Same, optimized
- **Watermark:** Centered at y=760, 18px font, alpha 90%

### Portfolio (6 Works)
- `works/work-01.webp`–`work-06.webp` (full res, ~800×800px)
- `works/thumb/work-01.webp`–`work-06.webp` (thumbnails, ~400×400px)
- PNG fallbacks: `work-01.png`–`work-06.png`
- **Format:** WebP primary, PNG fallback (HTML `<picture>` with `<source>`)

### Tattoo Design Icons
- `tattoos/angel.png`, `blessed.png`, `bull.png`, `horse.png`, `sun-eye.png`, `swallows.png`
- SVG-style PNG graphics, used on service pages

### 3D Models (GLB)
- `source/Female Head Anatomy.glb` (30 MB) — Master source model
- `female_bust_optimized.glb` (5.2 MB) — Production-optimized
- `classical_marble_bust_sculpture.glb` (12 MB) — Fallback model

### Textures (Procedural)
- **PBR Source:** `source/Texture/Female_Head_Anatomy*/` (6 sets, named folders)
  - `mat1-Цвет.png` (color/diffuse)
  - `mat1-Металлик.png` (metallic)
  - `mat1-Шероховатость.png` (roughness)
- **Flattened:** `textures/color-0.png` through `color-5.png` (1.3 MB total)
  - Used for scroll-reveal overlay system
  - White background removed (→ transparent alpha)

### Other Assets
- `og-image.jpg` (80 KB) — Social share preview
- `favicon.svg` — Favic icon
- `apple-touch-icon.png` — iOS home screen icon
- `icon-192.png`, `icon-512.png` — PWA icons

---

## 10. PACKAGE.JSON & DEPENDENCIES

### Frontend (Root)
**No explicit package.json** — Vanilla JS + CDN libraries

External libraries (loaded via `<script>` tags):
- **GSAP 3.12.2** — Animations & ScrollTrigger plugin
- **Three.js 0.169.0** — 3D rendering + GLTFLoader
- **Google Fonts:** Cormorant Garamond, Inter (preconnect + async load)

### Backend (`/server/package.json`)
```json
{
  "name": "remnant-booking-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",           // Password hashing
    "better-sqlite3": "^11.0.0",    // SQLite (unused, MySQL is primary)
    "compression": "^1.8.1",        // gzip middleware
    "cors": "^2.8.5",               // CORS handling
    "express": "^4.21.0",           // Web framework
    "express-rate-limit": "^8.3.1", // Rate limiting
    "jsonwebtoken": "^9.0.2",       // JWT generation/verification
    "mysql2": "^3.20.0",            // MySQL driver (promise-based)
    "web-push": "^3.6.7"            // Web Push API for notifications
  }
}
```

### Launch Config (`.claude/launch.json`)
```json
{
  "configurations": [{
    "name": "REMNANT API Server",
    "runtimeExecutable": "/usr/local/bin/node",
    "runtimeArgs": ["--watch", "server/index.js"],
    "port": 3000,
    "autoPort": false
  }]
}
```

---

## 11. CURRENT ISSUES & PENDING TASKS

### Known Issues & TODOs

1. **Hero 3D Animation** — Variant A implementation needed
   - **Issue:** Current animation is basic scroll-driven rotation
   - **Requirement:** Cinematic scroll-driven with rhythm changes, full 360° rotation
   - **File:** `index.html`, lines 546–597 (GSAP timeline)
   - **Action:** Implement multi-stage rotation sequence with accent pauses and rhythm

2. **Hero Section Height** — ~10% too tall on iPhone 15 Pro
   - **Issue:** "ПРОКРУТИ" (scroll indicator) and clock cut off on mobile
   - **Files:** 
     - `style.css` (`.hero` height: 100vh, min-height: 620px)
     - `index.html` (`.hero-scroll`, `.hero-time` positioning)
   - **Action:** Adjust min-height, bottom positioning for mobile; test on iPhone 15 Pro viewport

3. **Watermark Adjustment** — master-photo.jpg watermark positioning
   - **Status:** Needs visual verification
   - **Spec:** Centered at y=760px, 18px font, alpha 90%
   - **Action:** Verify watermark placement, adjust if needed

4. **Mobile Menu Alignment** — "ЛИЧНЫЙ КАБИНЕТ" text alignment
   - **Status:** Fixed (text-align: center added to `.mobile-menu a`)
   - **File:** `style.css`, line 180
   - **Verification:** Need to check on actual mobile device

5. **Social Link Icons** — Emoji → SVG replacement
   - **Status:** Pending
   - **Current:** Inline SVGs for Instagram, Telegram (good state)
   - **Note:** Check if emoji icons remain elsewhere; replace with minimalist SVG matching site style

6. **Studio Page Map** — Yandex map styles
   - **Status:** Map inserted with dark styles
   - **File:** `studio.html`, footer `<iframe>` from Yandex Maps API
   - **Action:** Verify map styling matches dark theme, test loading

7. **JavaScript Extraction** — Level 2 complete
   - **Status:** All inline scripts extracted to `/js/` modules
   - **Files:** `common.js`, `home.js`, `lightbox.js`, `booking.js`, `cabinet.js`, `admin.js`
   - **Pending:** Extract inline styles from `cabinet.html` & `admin.html` to external CSS

8. **Build & Bundling** — Vite setup pending
   - **Status:** Not implemented
   - **Action:** 
     - Set up Vite with ES module bundling
     - Extract inline styles from `cabinet.html` & `admin.html`
     - Configure CSS extraction & minification
     - Set up dev/build scripts in root `package.json`
     - Add PostCSS for vendor prefixes

9. **VPS Deployment** — TimeWeb pending
   - **Status:** Not deployed
   - **Requirements:**
     - Node.js server on port 3000
     - MySQL database setup
     - PM2 or systemd for process management
     - Nginx reverse proxy config (template in `nginx.conf`)
     - SSL certificate setup
   - **Files:** `deploy.sh`, `ecosystem.config.cjs` (PM2 config)
   - **Action:** Implement deployment script, set up CI/CD if needed

### Technical Debt
- **Inline CSS:** `cabinet.html` & `admin.html` have `<style>` blocks; should extract to external files
- **JWT Secret:** Default value `'remnant-secret-change-me'` MUST be changed via `process.env.JWT_SECRET` in production
- **VAPID Keys:** Static hardcoded Web Push keys; regenerate for production
- **Error Handling:** Some API endpoints use basic error responses; could add structured error codes
- **Logging:** Minimal logging; consider adding Winston/Pino for production

---

## 12. DEVELOPMENT WORKFLOW

### Local Setup
1. **Start MySQL server** (MAMP): `mysql -h 127.0.0.1 -P 3306 -u root -proot`
2. **Start Node server:** `npm --prefix server run dev` (auto-reload on file changes)
   - Alternatively: `node --watch server/index.js`
3. **Serve frontend:** MAMP serves static files on port 8888
   - Or use a simple server: `python3 -m http.server 8888`
4. **Access URLs:**
   - Frontend: `http://localhost:8888/`
   - API: `http://localhost:3000/api/...`
   - Admin login: `http://localhost:3000/admin.html` (default: `root`/`root`)
   - Client login: `http://localhost:3000/cabinet.html`

### File Organization
- **Static files (served by Express):** Root directory (HTML, CSS, JS, images)
- **Server code:** `/server/` directory (isolated Node.js app)
- **Configuration:** `.claude/launch.json` (dev server config)

### Testing Endpoints
```bash
# Login (get JWT)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"root","password":"root"}'

# Get bookings
curl http://localhost:3000/api/bookings \
  -H "Authorization: Bearer {token}"

# Get available slots
curl 'http://localhost:3000/api/slots?date=2026-03-28'

# Create booking
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"name":"Иван","phone":"+79151127866","date":"2026-04-01","time_slot":"14:00"}'
```

---

## 13. DEPLOYMENT CHECKLIST

### Pre-Production
- [ ] Change `JWT_SECRET` environment variable
- [ ] Generate new VAPID keys for Web Push
- [ ] Set `TG_BOT_TOKEN` & `TG_CHAT_ID` for Telegram notifications (optional)
- [ ] Update database credentials (`.env`)
- [ ] Extract inline CSS from `cabinet.html` & `admin.html`
- [ ] Set up Vite bundler & CSS extraction
- [ ] Test all API endpoints with production DB
- [ ] Verify hero animation on various devices
- [ ] Test responsive design on mobile (iPhone 15 Pro)
- [ ] Verify image optimization (WebP with PNG fallbacks)
- [ ] Test Web Push notifications
- [ ] Audit security headers (X-Content-Type-Options, CSP, etc.)

### Production Setup
- [ ] Configure TimeWeb VPS (Node.js, MySQL)
- [ ] Set up reverse proxy (Nginx template provided in `nginx.conf`)
- [ ] Install SSL certificate (Let's Encrypt recommended)
- [ ] Configure PM2 process manager (config in `ecosystem.config.cjs`)
- [ ] Set up automated backups for MySQL
- [ ] Configure CDN for image assets (optional)
- [ ] Set up monitoring & logging
- [ ] Test full booking flow end-to-end
- [ ] Verify admin panel functionality
- [ ] Test client dashboard & notifications
- [ ] Set up CI/CD pipeline (optional)

---

## SUMMARY & HANDOFF NOTES

**REMNANT** is a sophisticated tattoo studio booking system with:
- **Clean architecture:** Separated frontend (vanilla JS) and backend (Express.js)
- **Rich UX:** 3D Three.js hero animation, GSAP scroll animations, smooth transitions
- **Robust auth:** JWT-based authentication for both admin and clients
- **Responsive design:** Dark luxury aesthetic with accessible mobile-first approach
- **Database:** MySQL with proper schema, transaction support, and cascading deletes

**Key files to monitor/update:**
- `index.html` — Hero animation (pending Variant A)
- `style.css` — Design system (may need mobile hero height adjustment)
- `server/db.js` — Database initialization
- `server/index.js` — Middleware & routing
- `js/*.js` — Frontend module ecosystem
- `.claude/launch.json` — Dev server config
- `server/.env` — Environment variables (production)

**Next steps for continuation:**
1. Implement cinematic hero animation (Variant A)
2. Fix hero section height on mobile
3. Extract CSS from cabinet.html & admin.html
4. Set up Vite bundler
5. Deploy to TimeWeb VPS
6. Configure monitoring & logging

Project is **production-ready** pending above items.
