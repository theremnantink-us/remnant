---
tags: [backend, database]
---
# server/db.js

MySQL connection layer. Инициализирует схему БД при старте.

## Helper Functions
```js
query(sql, params)       // → rows[]
get(sql, params)         // → rows[0] | null
run(sql, params)         // → { insertId, affectedRows }
transaction(async work)  // → транзакция с auto-rollback
```
Все запросы параметризованные (`?`). Никогда не конкатенировать SQL.

## Connection Pool
```js
mysql2/promise → createPool({
  connectionLimit: 10,
  host: DB_HOST || '127.0.0.1',
  port: DB_PORT || 3306,
  user: DB_USER || 'root',
  password: DB_PASSWORD || 'root',
  database: DB_NAME || 'remnant_bd',
  dateStrings: true
})
```

## initDatabase() — таблицы
[[table-bookings]] · [[table-availability]] · `date_overrides` · [[table-admins]] · [[table-clients]] · [[table-notifications]] · `push_subscriptions` · [[table-blocked-dates]]

## Seed данные (при первом запуске)
- `availability`: 7 строк (дни 0–6), 12:00–21:00, 120-мин слоты
- `admins`: `admin/remnant2025`, `root/root` (bcrypt, 10 rounds)

## Связано
[[Database]] · [[server-index.js]] · [[route-auth]] · [[route-bookings]] · [[route-slots]] · [[route-admin]] · [[route-client]]
