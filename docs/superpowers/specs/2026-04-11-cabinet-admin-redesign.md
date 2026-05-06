# Cabinet & Admin Panel Redesign — REMNANT Tattoo Studio
**Date:** 2026-04-11  
**Status:** Approved

---

## 1. Цели

Полный редизайн `cabinet.html` и `admin.html`:
- Визуальное соответствие главному сайту (тёмная тема, Instrument Serif, glassmorphism)
- Перевод аутентификации на Supabase (убрать логин/пароль из JS)
- Улучшение UX: адаптив, анимации, новые функции
- Устранение уязвимостей безопасности

---

## 2. Архитектура и модель данных

### Supabase таблицы

```sql
-- Встроенная таблица Supabase Auth
auth.users (id, email, phone, created_at)

-- Профили пользователей
profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT,
  phone TEXT,
  visit_count INT DEFAULT 0,
  loyalty_tier TEXT DEFAULT 'standard', -- standard | silver | gold
  aftercare_reminder_sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Записи
bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  style TEXT,
  size TEXT,
  notes TEXT,
  status TEXT DEFAULT 'new', -- new | confirmed | done | cancelled
  cancellation_reason TEXT,
  reference_image_url TEXT
)

-- Заблокированные даты
blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users,
  is_working_day BOOLEAN DEFAULT false,
  time_override_open TIME,
  time_override_close TIME
)
```

### RLS политики

```sql
-- Пользователь видит только свои записи
CREATE POLICY "own_bookings_select" ON bookings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "own_bookings_update" ON bookings
  FOR UPDATE USING (
    user_id = auth.uid() AND status IN ('new', 'confirmed')
  );

-- Профиль — только свой
CREATE POLICY "own_profile" ON profiles
  FOR ALL USING (id = auth.uid());

-- Заблокированные даты — читают все, пишет admin
CREATE POLICY "blocked_dates_read" ON blocked_dates
  FOR SELECT USING (true);

CREATE POLICY "blocked_dates_write" ON blocked_dates
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );
```

### Файловое хранилище
- Supabase Storage бакет `reference-images` (приватный)
- Доступ через signed URL с TTL 3600 секунд
- Путь: `{user_id}/{booking_id}.{ext}`

---

## 3. Аутентификация

| Сторона | Метод |
|---------|-------|
| Клиент (cabinet) | `supabase.auth.signInWithPassword({ email, password })` |
| Админ | То же + проверка `user.user_metadata.role === 'admin'` после входа |
| Сессия | JWT в localStorage через supabase-js, auto-refresh |
| Защита админа | Если роль ≠ admin → `signOut()` + редирект на `/` |

**Сервисный ключ** (`service_role`) — только на сервере, в клиентский JS не попадает.

---

## 4. Личный кабинет (cabinet)

### Структура файлов
```
cabinet.html        — HTML структура (переписать)
css/cabinet.css     — стили (переписать)
js/cabinet.js       — логика (переписать)
```

### Экран авторизации
- Тёмный фон `#080808`, glassmorphism карточка по центру
- Логотип REMNANT (Instrument Serif, letter-spacing .22em)
- Табы: Войти / Зарегистрироваться (underline индикатор)
- Поля: телефон/email + пароль (toggle видимости)
- Ошибки инлайн (не alert)
- Анимация появления: `opacity 0→1` + `translateY(20px→0)`, 400ms

### Основной макет (адаптив)

| Breakpoint | Макет |
|------------|-------|
| < 768px | Bottom nav (4 кнопки), контент-область со скроллом |
| ≥ 768px | Левый сайдбар 220px + контент рядом |
| ≥ 1200px | Контент max-width 900px, центрирован |

### Таб: Главная
- Карточка следующей записи (дата, время, стиль — крупно)
- 3 стат-чипа: предстоящие / всего / завершено
- Полоска лояльности: прогресс-бар к следующему уровню (5 визитов → Silver, 10 → Gold)
- CTA кнопка "Записаться" → `/booking`

### Таб: Записи
- Фильтр-пилюли: Предстоящие / Прошедшие / Все
- Карточка записи: дата, время, стиль, статус-бейдж
- Кнопка "Отменить" (только статус new/confirmed) → модал с полем причины
- Загрузка референса: кнопка прикрепить фото → Supabase Storage upload, превью
- Skeleton-загрузка пока данные не пришли

### Таб: Уведомления
- Список системных уведомлений (подтверждение записи, напоминание за 24ч, уход за тату)
- Кнопка "Прочитать все"
- Бейдж с числом непрочитанных на иконке

### Таб: Профиль
- Инициалы аватара (авто-генерация из имени)
- Редактирование имени / email
- Смена пароля (коллапс-блок)
- Выход из аккаунта (кнопка danger)

---

## 5. Админ-панель (admin)

### Структура файлов
```
admin.html          — HTML (переписать)
css/admin.css       — стили (переписать)
js/admin.js         — логика (переписать)
```

### Макет

| Breakpoint | Макет |
|------------|-------|
| < 768px | Бургер + мобильное меню (slide-in) |
| ≥ 768px | Левый сайдбар 240px + контент |

Сайдбар: логотип REMNANT → навигация → статус "онлайн" → кнопка выйти снизу.

### Таб: Дашборд
- 4 стат-карточки: новые записи / подтверждённые / завершено за месяц / (расчётная выручка)
- График записей по неделям (SVG без зависимостей)
- Лента последних 5 записей с быстрыми действиями (подтвердить / отменить)
- Supabase Realtime: новые записи появляются мгновенно

### Таб: Заявки
- Поиск по имени / телефону (debounced, 300ms)
- Фильтры: статус + диапазон дат
- Таблица (≥768px) / карточки (<768px)
- Инлайн смена статуса через `<select>` с optimistic update
- Клик на строку → модальное окно с деталями + кнопка просмотра референса
- Экспорт в CSV (клиентская генерация через Blob)
- Realtime: тост при новой заявке + счётчик в хедере

### Таб: Расписание
- Calendарь (текущая логика сохраняется, визуал переписывается)
- Блокировка / разблокировка дат
- Массовые действия (выбор нескольких дат)
- Недельное расписание в боковой панели

### Уведомления
- Колокольчик в хедере, выдвижная drawer-панель справа
- Supabase Realtime subscription на `bookings` INSERT

---

## 6. Безопасность

| Угроза | Решение |
|--------|---------|
| Жёсткий пароль в JS | Удалён, Supabase Auth |
| XSS | Только `textContent`, никакого `innerHTML` с user data |
| Несанкционированный доступ к данным | RLS на всех таблицах |
| Доступ к чужим файлам | Приватный бакет + signed URL |
| Брутфорс | Supabase Auth встроенный rate limit |
| Утечка service_role ключа | Только на сервере |
| CSRF | Не применимо (SPA + JWT, без cookie-сессий) |

---

## 7. Анимации

| Элемент | Анимация |
|---------|----------|
| Появление карточки auth | `opacity 0→1` + `translateY(20px→0)`, 400ms |
| Переключение табов | slide left/right, 250ms |
| Карточки записей | staggered fade-up, 30ms stagger |
| Смена статуса | scale pulse `1→1.08→1`, 200ms |
| Тост | slide-in справа, progress bar, 4 сек |
| Realtime новая заявка | highlight-flash (accent → transparent), 600ms |
| Мобильный сайдбар | slide-in слева + backdrop, spring easing |
| Skeleton | shimmer gradient animation |

---

## 8. Типографика (единая с сайтом)

```css
--font-serif:   'Instrument Serif', serif;
--font-sans:    'Outfit', system-ui, sans-serif;
```

Убрать: `Cormorant Garamond`, `Inter`.

---

## 9. Что убирается из текущего кода

- `localStorage.getItem('adminAuth')` — вся эта система
- Жёстко прописанные логин/пароль в `admin.js`
- `innerHTML` с непроверенными пользовательскими данными
- `Cormorant Garamond` и `Inter` шрифты
