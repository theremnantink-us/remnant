---
tags: [backend, route]
---
# route: /api/bookings (public)

Файл: `server/routes/bookings.js`

> ⚠️ Только создание (POST). GET/PATCH/DELETE — в [[route-admin]]!

## POST /api/bookings
```json
Body: {
  "name": "Иван",
  "phone": "+79151234567",
  "date": "2026-05-01",
  "time_slot": "14:00",
  "email": "",
  "location": "предплечье",
  "style": "blackwork",
  "description": "..."
}
Returns: { "ok": true, "id": 42 }  // 201 Created
```

### Алгоритм
1. Проверяет, что слот не занят в [[table-bookings]]
2. Если авторизован client (`Authorization: Bearer`) → привязывает `client_id`
3. Вставляет запись в [[table-bookings]]
4. Отправляет Telegram уведомление (если `TG_BOT_TOKEN` задан) → [[Notifications]]
5. Рассылает Web Push всем подписчикам → [[Notifications]]

## Rate limit
5 req / час / IP (из [[server-index.js]])

## Связано
[[table-bookings]] · [[table-clients]] · [[Notifications]] · [[booking.js]] · [[Backend]]
