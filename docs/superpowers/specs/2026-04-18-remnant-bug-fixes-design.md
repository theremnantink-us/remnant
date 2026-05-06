# REMNANT — Bug Fixes Batch (2026-04-18)

Восемь связанных правок по UI/нав/данным кабинета. Источник задач — заказчик, согласовано через brainstorming-сессию.

## Goals

- Унифицировать орбиту в кабинете со стилем админки.
- Добавить возвратную навигацию в dashboard'ах к орбите.
- Сделать бренд-логотип золотым везде.
- Добавить анимацию появления орбиты (вращательную).
- Починить отображение записей в кабинете и обогатить карточку контактами, заметками, фото-референсом и датой создания.
- Переименовать узел «Афтеркеа» → «Уход» в орбите кабинета.
- Привести шапку и мобильное меню всех публичных страниц к эталону `index.html`.
- Починить битую ссылку `/contacts` (переименовать `studio.html` → `contacts.html`).

## Non-goals

- Ре-дизайн админки/кабинета.
- Изменение backend-роутов, схемы БД.
- Обновление контента страницы «Контакты» (кроме заголовка и `<title>`).
- Рефакторинг `supabase-config.js` и общей архитектуры auth.

---

## Section 1 — Orbit parity (cabinet ↔ admin)

**Файл:** `js/cabinet.js`, вызов `createOrbital(...)` (строки ~368-375).

**Изменения:**
- `radius: 220` → `radius: 200`
- `hint: 'Клик на узел — открыть карточку · Повторный клик — раскрыть раздел'` → `'Клик на узел — карточка раздела · Повторный клик — открыть раздел'` (как в админке)

**Не меняется:** `center` остаётся `{ type: 'image'|'initials', value: ... }` — персонализация клиента сохраняется.

---

## Section 2 — Back-to-orbit button (admin + cabinet)

**Поведение:** на всех внутренних табах (`bookings`, `schedule`, `analytics`, `notifications`, `profile`, etc.) слева в топбаре, рядом с логотипом, показана кнопка-стрелка `←`. Клик возвращает на таб `home` (орбита). На табе `home` кнопка скрыта.

**HTML:** в `admin.html` и `cabinet.html` в `<header class="adm-topbar">` / `<header class="cab-topbar">` перед `.adm-topbar__logo` / `.cab-topbar__logo` добавить:

```html
<button class="adm-topbar__back hidden" id="adm-back" aria-label="Назад к орбите">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
</button>
```

(Аналогично `cab-topbar__back` / `cab-back` для кабинета.)

**JS:** в функциях `showSection(name)` (admin.js) / `showTab(name)` (cabinet.js) toggle класса `hidden` на кнопке в зависимости от того, `name === 'dashboard'` / `name === 'home'`. Клик кнопки = вызов `showSection('dashboard')` / `showTab('home')`.

**CSS:** `css/admin.css`, `css/cabinet.css` — правило для `.adm-topbar__back` / `.cab-topbar__back`: квадратная кнопка 32×32 (моб) / 36×36 (desktop), прозрачный фон, SVG 18×18 цветом `var(--text)`, hover = color `var(--accent)`. Класс `.hidden { display: none; }` уже присутствует в обоих файлах.

---

## Section 3 — Gold logo everywhere

Добавить `color: var(--accent);` следующим правилам:

| Файл | Селектор | Строка |
|---|---|---|
| `style.css` | `.footer-logo` | ~1273 |
| `css/admin.css` | `.adm-topbar__logo` | ~155 |
| `css/cabinet.css` | `.cab-topbar__logo` | ~221 |
| `css/cabinet.css` | `.auth-logo` | ~49 |

`.nav-logo` (`style.css`) и `.auth-logo` (`css/admin.css`) уже gold — не трогаем.

---

## Section 4 — Orbit appearance animation (rotational)

**Файл:** `js/orbital-nav.js` + `css/orbital-nav.css`.

**Поведение:**
1. При первом рендере орбиты:
   - Кольца (`.orbital__ring`, `.orbital__ring--outer`) и хаб (`.orbital__hub`) стартуют с `opacity: 0; transform: scale(0.8);` и анимируются до `opacity: 1; transform: scale(1)` за 600ms (ease-out).
   - Узлы (`.orbital__node`) стартуют с `opacity: 0; transform: translate(x,y) scale(0.6)`. Через `requestAnimationFrame` после positionNodes — переходят в целевое состояние за 700ms.
   - Авто-вращение стартует с `rotationSpeed: 0` и линейно ramping до рабочей `0.25` за 1200ms (интерполируется внутри `setInterval`-таймера).
2. Управляется флагом `state.initializing` (true → false через 1200ms).
3. CSS-ключевые кадры: `@keyframes orbital-appear` (для колец и хаба) и `@keyframes orbital-node-in` (для узлов, staggered через CSS `animation-delay: calc(var(--i) * 40ms)` — индекс задаётся инлайн при создании узла).

**Работает и для admin, и для cabinet** автоматически (общий модуль).

---

## Section 5 — Cabinet bookings fix + enriched card

**Файл:** `js/cabinet.js`, функции `loadBookings` и `renderBookings`, плюс правила в `css/cabinet.css`.

**Проблемы:**
- `loadBookings` select: `id, date, time_slot, style, status` — нет имени/телефона/референса/заметок/создания.
- Фильтр `new Date().toISOString().slice(0, 10)` возвращает **UTC**-дату — для локального часового пояса «сегодня» может быть записан как «вчера» и не попадать в `upcoming`.

**Изменения:**

1. **Расширить select:**
   ```js
   .select('id, date, time_slot, style, status, name, phone, reference_url, notes, created_at')
   ```

2. **Локальная «сегодняшняя» дата:**
   ```js
   const d = new Date();
   const now = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
   ```
   (Применяется и в `loadBookings`, и в `renderBookings`.)

3. **Обогатить карточку** — новая структура (замена `.booking-card` innerHTML):
   ```
   ┌─ дата ─┬─ статус-бейдж + кнопка отмены ─┐
   │ время · стиль                            │
   │ ─────────────────────────────────────── │
   │ Имя · <a href="tel:...">телефон</a>      │
   │ Заметки (если есть)                      │
   │ [thumb 80×80 reference_url] (если есть)  │
   │ Создана: DD MMM YYYY, HH:MM              │
   └──────────────────────────────────────────┘
   ```
   - Thumb: `<img class="booking-card__ref-thumb" src="..." loading="lazy">`, клик открывает `lightbox.open(url)`.
   - Заметки в блоке `.booking-card__notes` (только если `b.notes`).
   - Контакты в `.booking-card__contact`.
   - `created_at` в `.booking-card__created` — формат `ru` локаль.

4. **Lightbox:** переиспользовать существующий `js/lightbox.js` (динамический импорт при первом клике или импорт в начале cabinet.js).

5. **CSS (`css/cabinet.css`):** добавить
   - `.booking-card__contact { display: flex; gap: 1rem; font-size: .82rem; color: var(--muted); margin-top: .4rem; }`
   - `.booking-card__notes { font-size: .82rem; color: var(--text); margin-top: .4rem; padding: .5rem; background: rgba(255,255,255,0.03); border-radius: 6px; }`
   - `.booking-card__ref-thumb { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; cursor: zoom-in; margin-top: .5rem; border: 1px solid rgba(255,255,255,0.08); }`
   - `.booking-card__created { font-size: .68rem; color: var(--muted); margin-top: .4rem; letter-spacing: .08em; }`

---

## Section 6 — «Афтеркеа» → «Уход»

Одна правка: `js/cabinet.js:351` — `title: 'Афтеркеа'` → `title: 'Уход'`. Grep по всему проекту подтвердил: других вхождений «Афтеркеа» нет.

---

## Section 7 — Header unification + `/contacts` fix

**Эталон шапки = `index.html`** (desktop-nav с `role/aria-label` + mobile-menu с иконкой-кабинет сверху + соцсети).

### 7.1 Rename studio → contacts

- `studio.html` → `contacts.html` (git mv или Write + Delete).
- Внутри файла: `<title>Студия | REMNANT Tattoo Studio</title>` → `<title>Контакты | REMNANT Tattoo Studio</title>`; `<h1>Студия</h1>` (если есть) → `<h1>Контакты</h1>`. Тело страницы не трогаем.
- `vite.config.js:25`: `studio: resolve(__dirname, 'studio.html')` → `contacts: resolve(__dirname, 'contacts.html')`.

### 7.2 Unify nav blocks

В каждом из `faq.html`, `master.html`, `contacts.html` (после переименования), `booking.html`, `aftercare.html`:

- Заменить содержимое `<header>…<nav class="nav">…</nav></header>` на точную копию из `index.html` (включая `role`, `aria-label`, корректный порядок `FAQ/Мастер/Контакты/Уход/Записаться/Кабинет`).
- Заменить `<div class="mobile-menu" id="mobile-menu">…</div>` на точную копию из `index.html` (иконка-кабинет сверху + `FAQ/Мастер/Контакты/Уход/Записаться` + полный блок соцсетей).

### 7.3 Fix footer links

Во всех публичных страницах в футере заменить `href="/studio"` → `href="/contacts"`.

---

## Section 8 — Self-check & smoke test

После всех правок:

1. Express-сервер на :3000: проверить, что `GET /contacts` отдаёт `contacts.html` (200 OK, нет `Cannot GET`).
2. Vite dev :5173: `npm run dev` — страница `/contacts` открывается, бандл собирается без ошибок entry point.
3. Кабинет: авторизованный клиент видит свои записи в табе «Записи» с полной карточкой (имя/телефон/заметки/фото/created_at). Фото открывается в лайтбоксе.
4. Орбита в кабинете визуально идентична орбите в админке (размер, хинт), кроме аватара в центре.
5. Переключение внутренних табов в админке/кабинете — кнопка «← назад» показывается, клик возвращает на орбиту.
6. Открыть любую публичную страницу на мобилке: бургер идентичен главной.
7. Логотипы везде золотые.

---

## Risk / open questions

- **Дата UTC-фикс** может изменить отображение записей у клиентов, у которых сейчас запись «сегодня» по UTC но «завтра» по локали (или наоборот). Это не регрессия, а починка — но потенциально видимая для клиента.
- **Переименование studio → contacts:** если у кого-то в браузере сохранена старая ссылка `/studio`, она выдаст 404. Редирект не настраиваем (минимальный охват, пересечения пользовательских закладок маловероятно).
- **Общая шапка:** потенциально просится выделение в партиал/шаблон (SSR include или JS-инъекция), но сейчас проект — статичные HTML без билд-шага для include. Делаем ручную синхронизацию в 5 файлах; при появлении 6-го публичного листа рекомендуется вынести.

---

## Files touched

| Файл | Что |
|---|---|
| `js/cabinet.js` | radius, hint, «Уход», расширенный select, локальная дата, обогащённая карточка, импорт lightbox |
| `js/admin.js` | toggle класса на back-button |
| `js/orbital-nav.js` | анимация появления, ramp-up rotation |
| `css/orbital-nav.css` | `@keyframes orbital-appear`, `orbital-node-in`, стартовые состояния |
| `css/admin.css` | gold на `.adm-topbar__logo`, правило `.adm-topbar__back` |
| `css/cabinet.css` | gold на `.cab-topbar__logo`, `.auth-logo`; правило `.cab-topbar__back`; стили карточки записи |
| `style.css` | gold на `.footer-logo` |
| `admin.html` | кнопка back в топбаре |
| `cabinet.html` | кнопка back в топбаре |
| `faq.html`, `master.html`, `booking.html`, `aftercare.html` | унифицированная nav + mobile-menu |
| `studio.html` → `contacts.html` | rename, title, h1, unified nav |
| `vite.config.js` | entry `studio` → `contacts` |
| — footer ссылки `/studio` → `/contacts` | во всех публичных страницах |
