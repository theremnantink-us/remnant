# REMNANT — Session Log

Живой журнал рабочих сессий. Читается и обновляется Claude Code.

---

## Протокол самообновления

> **Для ассистента:** в конце каждой сессии, которая внесла хоть одно изменение в код проекта (коммит, правка файла, миграция, конфиг — любое), ты **обязан** добавить запись в конец этого файла по формату ниже.
>
> Если сессия была чисто исследовательской (читал код, отвечал на вопросы, ничего не менял) — запись делать **не надо**.
>
> Перед добавлением новой записи: быстро просмотри 2–3 последних. Если там есть пункт «Открыто», который сегодня закрылся — пометь его как `~~зачёркнуто~~` в старой записи и укажи причину одной строкой. Если запись устарела целиком — не удаляй, только strike-through.
>
> **Дата — всегда абсолютная** (ISO: `YYYY-MM-DD`). Никаких «сегодня» / «вчера».

### Формат одной записи

```markdown
### YYYY-MM-DD — короткий заголовок

- **Сделано:** что именно поменялось. Указывай SHA коммитов в виде `abc1234`, файлы относительно корня репо.
- **Почему:** какой баг/задача/мотив. Один-два предложения.
- **Открыто:** нерешённые хвосты, подозрительные места, гипотезы, что нужно ещё протестировать. Если пусто — напиши `—`.
- **Уроки:** (опционально) что повторить или чего избегать в будущем. Только если нашёл что-то неочевидное.
```

### Что НЕ писать в журнал

- Пошаговый пересказ разговора с пользователем.
- Содержимое diff'ов — они и так в git.
- Generic observations (`code looks clean`, `everything works`).
- Задачи, которые ещё не начаты — для этого есть план в `docs/superpowers/plans/`.

---

## Лог

### 2026-04-19 — session-log bootstrap

- **Сделано:** создан этот файл (`docs/superpowers/SESSION_LOG.md`); в `CLAUDE.md` добавлено правило «обнови SESSION_LOG в конце каждой сессии».
- **Почему:** пользователь попросил запустить цикл самообучения — явный протокол, который читается автоматически через `CLAUDE.md`.
- **Открыто:** —
- **Уроки:** —

### 2026-04-19 — auth-hardening spec (Project A) + RuFlo setup

- **Сделано:**
  - Спек `docs/superpowers/specs/2026-04-19-auth-hardening-design.md` (`2907970`). Google OAuth через Supabase, Cloudflare Turnstile (встроенный в Supabase Auth + Edge Function `submit-booking` для bookings), фирменные транзакционные письма через Resend (`noreply@theremnant.ink`). Apple Sign In отложен — нужен Apple Developer $99/год. Домен — Porkbun + Cloudflare DNS. План на 7 секций + риски + files touched.
  - Установка RuFlo v3.5.80 на ветке `chore/ruflo-setup`. `npx ruflo@latest init --minimal` + `init upgrade` (minimal сам по себе не заполняет helpers). Бэкап предыдущего `.claude/` в `.claude.bak.20260419/` (проверено — существующие skills и settings.local.json не перетёрлись).
  - Туненые `.claude/settings.json`: `adr.autoGenerate`/`ddd.trackDomains`/`security.scanOnEdit` → false (не хотим параллельных docs/adr, docs/ddd; security-scan на каждой правке избыточен). `modelPreferences.default`: `claude-opus-4-6` → `claude-opus-4-7`.
  - `.claude-flow/config.yaml`: `mcp.port` 3000 → 3333 (коллизия с Express-сервером, на случай ручного запуска MCP в HTTP-mode).
  - `.gitignore`: добавлены `.claude.bak.*/`, `.claude-flow/`.
  - Закоммичен только `.mcp.json` (в git) и `.gitignore` — остальное в `.claude/` и `.claude-flow/` игнорируется (локальный стейт).
- **Почему:** пользователь дал задачный список на 8 тем (OAuth, CAPTCHA, i18n, branded email, email-обновление, расширение медалей, обогащение уведомлений, empty state). Разбил на 4 проекта (A/B/C/D). Начали с A — дошли до утверждённого спека, но затем пользователь переключил внимание на установку RuFlo. Поставили minimum viable конфиг.
- **Открыто:** ~~Засвеченный Resend API-ключ~~ (пользователь подтвердил ревок при переходе на проект C неявно, проект A пока заморожен), ~~план реализации для спека A~~ (отложен, не блокирует C). RuFlo MCP-сервер доступен со следующей сессии. Проекты B (i18n) и остаток A (домен/OAuth/Turnstile/Resend) не начаты.
- **Уроки:**
  - Фронт REMNANT **уже полностью на Supabase** (auth, bookings, storage). Express-бэкенд в `server/` — мёртвый код, фронт в него не стучится. Документация (`HANDOFF.md`, `docs/obsidian/route-*`) описывает прошлую архитектуру. При работе с auth/bookings — смотреть на `js/cabinet.js`, не на `server/routes/*`.
  - RuFlo `init --minimal` создаёт skeleton, но **не заполняет `.claude/helpers/`**. Нужен второй шаг `init upgrade` — он доливает hook-handler, statusline, intelligence, auto-memory-hook. Без него все хуки в settings.json ссылаются на несуществующие файлы (exit 0, но `[WARN]` в логах).
  - `.claude-flow/config.yaml` по умолчанию ставит MCP на порт 3000 — конфликт с Express. Исправлено на 3333.

### 2026-04-20 — Project D (contact email) + Project C (cabinet medals/notif/empty) implementation

- **Сделано:**
  - **Project D** `c747e28`: массовая замена `hello@remnant.tattoo` → `theremnant.ink@gmail.com` в 6 публичных HTML (index/master/faq/contacts/aftercare/booking) + VAPID mailto `admin@remnant.studio` → `theremnant.ink@gmail.com` в `server/routes/admin.js:9`.
  - **Project C**, ветка `feat/cabinet-medals-c` → смерджена в `master`, 14 коммитов:
    - `c664964` MEDALS→module scope + ICONS (calendar/hourglass/sparkle).
    - `a74fc3b` HTML skeleton `#tab-medals`, удалены legacy hidden anchors в `#tab-home`.
    - `4db0e55` `renderMedals`/`medalEarnedDates`/`buildMedalCard`, retarget орбитального узла 4 → `showTab('medals')`, static CSS.
    - `c37a016` GSAP progress fill animation.
    - `f57704a` staggered intro stagger при первом открытии таба.
    - `cc1d61e` shimmer на прогрессе, breathing glow на active, hover-lift на earned, hatching на locked.
    - `1c1a6c0` 3D flip + haptic + visibility-based `#tab-medals.hidden` для iOS Safari.
    - `bba4ef0` particle burst (Canvas, 30 частиц, gate'ы reduced-motion + deviceMemory<4).
    - `4b3cb64` reduced-motion отключение декораций.
    - `2f57fbc` medal toast (slide-in right, 5s auto-dismiss, CTA/close).
    - `f182bc0` notification expand/collapse с деталями booking (+fix регрессии по удалённым `#stat-*` через `window._cabinetStats`).
    - `8c2bb06` `markNotifRead` + `updateNotifBadge`.
    - `5db1ba8` `jumpToBookingCard` с pulse 1.5s.
    - `4908a88` три empty-state варианта для `#tab-bookings`.
- **Почему:** Проект D — чистая уборка почты (5 мин), Проект C — основной UX-апгрейд кабинета: отдельный таб медалей с премиум-анимациями, раскрываемые уведомления с jump-to-booking, осмысленные empty-state'ы. Из плана `docs/superpowers/plans/2026-04-20-cabinet-medals-notifications.md`.
- **Открыто:**
  - Полный ручной smoke-test (10 пунктов из спека Section 5) не проведён в этой сессии — пользователь делает автономно. iOS Safari 3D flip, particle burst на слабом GPU, reduced-motion matrix.
  - Subagent-driven-development: первые 2 задачи прошли через цикл implementer→spec→quality subagent'ов (Task 1: c664964, Task 2: a74fc3b). После Task 2 упёрлись в лимит extra-usage quota — остальное исполнено inline, с self-review.
  - Apple Sign In, i18n (Project B), домен+Resend+OAuth (остаток Project A) — не начаты.
- **Уроки:**
  - Task 2 (удаление hidden anchors `#stat-upcoming/stat-total/stat-done` из `#tab-home`) вызвал латентную регрессию в `loadBookings` — функция писала в эти узлы без null-check'а. Исправлено в Task 11 через `window._cabinetStats`. Урок: при удалении DOM-элементов грепать все `getElementById` и не полагаться на plan, даже если plan «только HTML».
  - Для `preserve-3d` 3D flip в iOS Safari пришлось специфическим `#tab-medals.hidden` override'ом перевести таб на visibility+opacity+off-screen-absolute вместо `display:none`. Остальные табы оставлены на `display:none`.
  - Canvas particle burst работает mounted в `document.body` с `position: fixed` относительно rect цели — не нужен контейнер в самой секции.

### 2026-04-18 — bug-fixes batch (8 секций) + aftercare rescue

- **Сделано:**
  - Orbit parity: `5670a9c`. Cabinet и admin теперь используют одинаковый `radius: 200` и текст hint'а.
  - Back-to-orbit button: `5b4dd4f` (admin), `c3dba92` (cabinet). Кнопка `←` слева от логотипа, прячется на `home`/`dashboard`.
  - Gold logo: `4c9b487` (footer + cab-topbar), `cd363a3` (топбары admin/cabinet подогнаны под `.nav-logo` стиль — 1.45rem, uppercase, hover opacity .65, убран mobile font-size override).
  - Orbit appearance animation: `8e8d020`. Кольца/хаб fade-in, узлы stagger-in от центра через CSS vars `--tx/--ty/--final-opacity/--node-index`. Rotation ramp 0 → 0.25°/кадр за 1200ms. Триггер — одноразовый класс `.orbital--initializing`.
  - Bookings fix: `ac87501` + `a2b5554`. Расширенный supabase select (name, phone, reference_url, notes, created_at), `todayLocal()` вместо UTC-фильтра, обогащённая карточка с tel-ссылкой, заметками, thumb-референсом, date created, inline-lightbox с Esc/backdrop/×.
  - «Афтеркеа» → «Уход»: `73014e9` (`js/cabinet.js:354`).
  - `studio.html` → `contacts.html`: `569f398` + `179d0a4`. `vite.config.js` entry обновлён.
  - Header unification: `38fd97b`. На faq/master/contacts/booking/aftercare нав-блок и mobile-menu — побайтовая копия из `index.html` (кроме пустой строки между `</header>` и `<!-- Mobile menu -->`).
  - Scroll hint on mobile: `d7bb52f`. Удалил правило `@media (max-width: 900px) { .hero-scroll-hint { display: none; } }` в `style.css:1594`.
  - Aftercare rescue: `ecd85f4`. Восстановил hero + tab-nav + «День 1» блок, которые съел регэкс из Task 10.
  - Репо-гигиена: `21b9f39` (.gitignore), `3b91a31` (WIP baseline), `03633d7` (untracked source baseline).
- **Почему:** список из 7+1 багов и «неработающая ссылка Контакты» + «пропала Прокрути на мобилке». Плюс необходимость baseline'а в git (большая часть дерева была untracked).
- **Открыто:**
  - Полный `npm run build` не запускался — `node_modules` не устанавливались в worktree. Когда будет возможность — прогнать на master.
  - Worktree `/Applications/MAMP/htdocs/REMNANT-bugfixes` и ветка `fix/bugs-2026-04-18` живы, можно сносить.
  - Pre-existing TS-диагностика: `admin.js:527` — `calDragMoved` объявлена без чтения. Не трогал, не моя область.
  - Empty CSS rule `style.css:477` — `.info-strip__body {}`. Пустой блок, диагностика жалуется. Не трогал.
  - Есть подозрение, что user видел старое состояние из-за браузерного кэша / Service Worker'а — стоит держать в уме при следующих визуальных багах.
- **Уроки:**
  - При массовых HTML-заменах через регэкс с `.*?` и двумя закрывающими тегами — проверять, что у всех файлов одинаковая структура. `aftercare.html` был исключением (без блока соцсетей), регэкс сжевал 32 строки контента. В будущем — перед массовым sed/regex replace делать `md5` или `wc -l` до/после и проверять отклонения.
  - У проекта два «корня»: MAMP служит `/Applications/MAMP/htdocs/REMNANT` (master), worktree не виден MAMP. Работая в worktree — после merge в master нужно напомнить пользователю про hard-refresh (Service Worker в index.html кэширует через `public/sw.js`).

### 2026-05-28 — orbit-card semantics, italic-логотипы, phone-write fix (audit)

- **Сделано (не закоммичено — нет git remote):**
  - Orbit «Записи» карточка в кабинете: `js/cabinet.js` `buildCabinetOrbital()` теперь отличает upcoming от past. Раньше карточка была upcoming-only и писала «Предстоящих записей нет» при наличии истории. Теперь badge/status/date/content/energy выводят либо ближайшую запись, либо «Всего записей: N · последняя …».
  - Курсивные логотипы (как на проде): `font-style: italic` добавлен в `.nav-logo` (style.css), `.cab-topbar__logo` + `.auth-logo` (css/cabinet.css), `.adm-topbar__logo` (css/admin.css). В `cabinet.html` и `admin.html` ссылка на Google Fonts получила ось `Instrument+Serif:ital@0;1` (раньше грузился только normal — был бы faux-italic).
  - Phone write-path fix: `js/booking.js` — новая `normalizePhone()` (идентична `formatPhone()` в cabinet.js), применена при insert (`phone: normalizePhone(payload.phone)`). Бронирования теперь хранят канонический `+79991234567`, а не маску `+7 (999) …`.
- **Почему:** баг от пользователя (орбита пишет «нет записей» при наличии) + «лого не курсив как везде». Аудит вскрыл латентный баг: booking.js писал маскированный телефон, а profiles.phone хранится канонически → `phone.eq` в `loadBookings`/`medalEarnedDates` никогда не матчил pre-login (user_id NULL) брони.
- **Открыто:**
  - **Git remote отсутствует** (`git remote -v` пуст) — `пуш на гитхаб` невозможен, пока пользователь не даст URL.
  - **Прод (217.177.11.145) разошёлся с репо:** на проде self-hosted шрифты (`/fonts/*.woff2`, @font-face в css/cabinet.css) + курсив уже есть; в репо шрифты грузятся с Google Fonts. Пуш репо НЕ задеплоит на сервер (нет CI; deploy.sh — ручная первичная установка старого Express-стека). Нужно решение по reconciliation.
  - **Backfill существующих брони не выполнен** (нужно подтверждение — это запись в live Supabase). В БД 4 брони, 3 с маской, 1 из них orphan (user_id NULL + маска) — сейчас не виден ни одному кабинету. SQL готов (UPDATE bookings … regexp_replace), ждёт «да».
  - Оптимизация: self-hosting шрифтов в репо (как на проде) — render-blocking Google Fonts запрос. Не сделано (пересекается с reconciliation прода).
  - Мёртвый код `server/` (Express+MySQL) — фронт его не вызывает (всё на Supabase). Кандидат на удаление.
- **Уроки:**
  - Прошлые коммиты `561793a`/`6d62dc6` уже «чинили» orbit-no-bookings, но баг возвращался — потому что чинили симптом (источник данных), а не семантику (карточка была upcoming-only). Корень — карточка не отличала «нет предстоящих» от «нет записей вообще».
  - Два формата телефона в проекте (маска vs канон) — классический источник несовпадений. Канонизировать надо на write во всех путях (booking.js был пропущен).
