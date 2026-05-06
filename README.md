# REMNANT — Tattoo Studio Website

Сайт тату-студии REMNANT. Vanilla HTML/CSS/JS, без фреймворков. Супербаза — Supabase.

**Локальный сервер:** MAMP → `http://localhost/REMNANT/`

---

## Стек

- **Frontend:** Vanilla HTML/CSS/JS (ES modules)
- **Backend/DB:** Supabase (`cektzifptedmgfdgltnw`)
- **3D:** Three.js + GLTFLoader (hero-секция)
- **Анимации:** GSAP
- **Шрифты:** Instrument Serif + Outfit (Google Fonts)
- **Тема:** тёмная, bg `#080808`, акцент `#c4a882`

---

## Структура файлов

```
index.html          — Главная (3D голова + секции)
booking.html        — Форма записи (календарь + слоты)
cabinet.html        — Личный кабинет клиента
admin.html          — Панель администратора
master.html         — Страница мастера
studio.html         — О студии
faq.html            — FAQ
aftercare.html      — Уход после тату

css/
  style.css         — Глобальные стили главной
  cabinet.css       — Стили личного кабинета
  admin.css         — Стили админки

js/
  supabase-config.js  — Supabase клиент (shared, ES module)
  hero-3d.js          — Three.js 3D модель + scroll tattoo reveal
  cabinet.js          — Логика личного кабинета
  admin.js            — Логика админ-панели
  booking.js          — Логика страницы записи (ES module)
  common.js           — Общие утилиты (nav, etc.)

public/
  textures/           — head0-color.png … head6-color.png (tattoo states)
                        head0..6-roughness.png, head0..6-metallic.png
  source/
    female_head_usdz.glb  — основная 3D модель (27MB, из USDZ)
```

---

## Supabase

**Project:** `cektzifptedmgfdgltnw`
**URL:** `https://cektzifptedmgfdgltnw.supabase.co`
**Anon key:** `sb_publishable_PwruNmffSl75yhOOma7NzQ_ItXVA3am`

### Таблицы

**`profiles`** — профили пользователей
- `id` (uuid, FK auth.users), `name`, `phone`, `visit_count`, `loyalty_tier`, `updated_at`

**`bookings`** — записи
- `id`, `user_id` (nullable), `date`, `time_slot`, `style`, `status` (new/confirmed/done/cancelled), `notes`, `cancellation_reason`, `name`, `phone`, `created_at`

**`blocked_dates`** — заблокированные даты/слоты
- `id`, `date` (unique), `blocked_slots` (text[], NULL = весь день закрыт), `notes`, `created_at`

### RLS
- Клиент видит только свои записи и профиль
- Анонимные пользователи могут создавать записи (для формы без авторизации)
- Публичное чтение `blocked_dates` (для показа слотов)
- Роль `admin` (`user_metadata.role = 'admin'`) — полный доступ ко всем таблицам

### Тайм-слоты (фиксированные)
`10:00, 11:30, 13:00, 14:30, 16:00, 17:30, 19:00`

---

## Аккаунты

**Админ:** `theremnant.ink@gmail.com` — войти через `/admin.html`
- `user_metadata.role = 'admin'` уже установлен

**Клиенты:** регистрация через `/cabinet.html` (email + пароль)

---

## 3D Hero

- Модель: `public/source/female_head_usdz.glb` (конвертирована из USDZ через Blender)
- При скролле тату появляются по одной (7 состояний через cross-dissolve)
- Текстуры: `head0-color.png` (чистая кожа) → `head6-color.png` (все тату)
- При скролле назад — тату остаются 7 секунд, потом исчезают
- Логика в `js/hero-3d.js`

---

## Личный кабинет (`/cabinet.html`)

- Авторизация: email + пароль (Supabase Auth)
- Телефон — опциональное поле профиля
- 4 вкладки: Главная (следующая запись, статистика, лояльность), Записи (фильтр), Уведомления, Профиль
- Отмена записи через модальное окно
- Программа лояльности: Стандарт → Серебро (5 визитов) → Золото (10 визитов)

---

## Админ-панель (`/admin.html`)

- Авторизация: email + пароль, проверка `user_metadata.role === 'admin'`
- **Дашборд:** 4 статы (новые/подтверждённые/завершённые/всего), последние 5 заявок
- **Заявки:** таблица с поиском (debounce 300ms), фильтр по статусу, inline смена статуса, детали в модалке, экспорт CSV
- **Расписание:** календарь + тоглы слотов
  - Клик по дню → 7 кнопок-тоглов (зелёный = свободно, красный = закрыто, серый = занято)
  - Клик по тоглу = мгновенная блокировка/разблокировка слота в Supabase
  - «Закрыть весь день» / «Открыть весь день»
  - Частично закрытые дни — отдельный цвет на календаре
  - Список записей на выбранный день
- **Realtime:** при новой заявке → тост-уведомление + бейдж на «Заявки»

---

## Страница записи (`/booking.html`)

- Шаг 1: календарь + выбор слота (слоты грузятся из Supabase, учитывают blocked_dates и занятые bookings)
- Шаг 2: контактные данные (имя, телефон с маской, стиль, заметки)
- Шаг 3: подтверждение
- Запись сохраняется в `bookings` через Supabase напрямую
- Если клиент авторизован — `user_id` привязывается автоматически

---

## Что ещё нужно сделать

- [ ] Проверить работу 3D модели в продакшне (текстуры могут не грузиться по CORS)
- [ ] Настроить email-уведомления при новой записи (Supabase Edge Function или внешний сервис)
- [ ] Добавить страницу восстановления пароля
- [ ] Протестировать полный флоу: запись → кабинет → статус в админке
