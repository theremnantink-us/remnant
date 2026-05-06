---
tags: [database, table]
---
# table: client_notifications

In-app уведомления для клиентов (видны в [[cabinet.html]]).

## Схема
| Столбец | Тип | Примечание |
|---------|-----|-----------|
| `id` | INT PK AUTO_INCREMENT | |
| `client_id` | INT NOT NULL | FK → [[table-clients]] |
| `booking_id` | INT NOT NULL | FK → [[table-bookings]] |
| `type` | VARCHAR(50) | DEFAULT `status_change` |
| `message` | TEXT NOT NULL | Текст на русском |
| `is_read` | TINYINT(1) | DEFAULT 0 |
| `created_at` | DATETIME | |

## Жизненный цикл
```
PATCH /api/bookings/:id (смена статуса)
  ↓ [[route-admin]]
  INSERT client_notifications
  ↓
GET /api/client/notifications ← [[cabinet.js]] polling (3 сек)
  ↓ [[route-client]]
  SELECT + unread count
  ↓
Отображение в [[cabinet.html]]
  ↓
POST /api/client/notifications/read
  UPDATE is_read = 1
```

## Связано
[[Database]] · [[Notifications]] · [[table-clients]] · [[table-bookings]] · [[route-admin]] · [[route-client]] · [[cabinet.js]]
