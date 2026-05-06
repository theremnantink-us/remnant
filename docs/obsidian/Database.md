---
tags: [database, overview]
---
# Database

MySQL (`remnant_bd`). Локально: MAMP на порту 3306, `root/root`.
Схема инициализируется автоматически при старте через [[db.js]] → `initDatabase()`.

## Таблицы
| Таблица | Назначение |
|---------|-----------|
| [[table-bookings]] | Записи клиентов на сеанс |
| [[table-availability]] | Еженедельное расписание (Пн–Вс) |
| [[table-blocked-dates]] | Закрытые даты |
| [[table-clients]] | Аккаунты клиентов (phone UNIQUE) |
| [[table-admins]] | Аккаунты администраторов |
| [[table-notifications]] | In-app уведомления клиентов |
| `date_overrides` | Кастомные часы для конкретных дат |
| `push_subscriptions` | Web Push подписки (VAPID) |

## DB Helper Layer ([[db.js]])
```js
query(sql, params)       // → rows[]
get(sql, params)         // → row | null
run(sql, params)         // → { insertId, affectedRows }
transaction(async work)  // → с автоматическим rollback
```
Все запросы — параметризованные (`?`), никакой конкатенации.

## Seed данные (первый запуск)
- `availability`: 7 дней, 12:00–21:00, слоты по 120 мин
- `admins`: `admin/remnant2025`, `root/root` (bcrypt)

## Связано
[[Backend]] · [[db.js]] · [[REMNANT]]
