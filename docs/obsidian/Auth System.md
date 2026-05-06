---
tags: [auth, security]
---
# Auth System

Два отдельных JWT-потока. Один секрет: `process.env.JWT_SECRET`.

## Admin Auth

| Параметр | Значение |
|----------|---------|
| Endpoint | `POST /api/auth/login` → [[route-auth]] |
| Payload | `{ username, password }` |
| Token claim | `{ id, username }` |
| Expiry | 24 часа |
| Storage | `localStorage.remnant_token` |
| Middleware | `req.admin` = payload |

Таблица: [[table-admins]]
Вызывается из: [[admin.js]]

## Client Auth

| Параметр | Значение |
|----------|---------|
| Endpoint | `POST /api/client/login` → [[route-client]] |
| Payload | `{ phone, password }` |
| Token claim | `{ id, type: 'client' }` |
| Expiry | 30 дней |
| Storage | `localStorage.client_token` |
| Middleware | `req.clientId` = payload.id |

Middleware проверяет `payload.type === 'client'` — если нет, 403.
Таблица: [[table-clients]]
Вызывается из: [[cabinet.js]]

## JWT Secret
`process.env.JWT_SECRET` || `'remnant-secret-change-me'`
⚠️ Обязательно сменить в production.

## Связано
[[route-auth]] · [[route-client]] · [[route-admin]] · [[table-admins]] · [[table-clients]] · [[admin.js]] · [[cabinet.js]] · [[REMNANT]]
