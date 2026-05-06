---
tags: [notifications, backend]
---
# Notifications

Три независимых канала уведомлений. Каждый срабатывает в разном месте кода.

## 1. Telegram (новая запись)
- **Триггер:** `POST /api/bookings` → [[route-bookings]]
- **Env:** `TG_BOT_TOKEN`, `TG_CHAT_ID`
- **Действие:** отправляет сообщение с именем, датой и слотом в чат администратора

## 2. Web Push (новая запись)
- **Триггер:** `POST /api/bookings` → [[route-bookings]]
- **Библиотека:** `web-push` (VAPID)
- **Ключи:** `VAPID_PUBLIC` / `VAPID_PRIVATE` — hardcoded ⚠️ сменить в prod
- **Подписки:** таблица `push_subscriptions`
- **Доставка:** `sendPushToAll()` — рассылка всем подписчикам
- **Push API** (в [[route-admin]]): `GET /api/push/vapid-key`, `POST /api/push/subscribe`, `DELETE /api/push/unsubscribe`

## 3. In-App уведомления (смена статуса)
- **Триггер:** `PATCH /api/bookings/:id` → [[route-admin]] при смене статуса
- **Запись в:** [[table-notifications]]
- **Читает:** `GET /api/client/notifications` → [[route-client]]
- **Polling:** каждые 3 секунды в [[cabinet.js]]
- **Прочитать:** `POST /api/client/notifications/read` → [[route-client]]

## Связано
[[route-bookings]] · [[route-admin]] · [[route-client]] · [[table-notifications]] · [[cabinet.js]] · [[REMNANT]]
