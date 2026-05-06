---
tags: [backend, route, auth]
---
# route: /api/client

Файл: `server/routes/client.js`

## Публичные (без auth)

### POST /api/client/register
```json
Body:    { "name": "Иван", "phone": "+7...", "password": "secret" }
Returns: { "ok": true, "token": "...", "name": "Иван", "id": 1 }  // 201
```
- Проверяет уникальность phone в [[table-clients]]
- bcrypt hash пароля (10 rounds)
- После регистрации: линкует существующие записи в [[table-bookings]] по номеру телефона
- JWT: `{ id, type: 'client' }`, expiry 30 дней

### POST /api/client/login
```json
Body: { "phone": "+7...", "password": "secret" }
```

## Защищённые (Client JWT)
| Метод | URL | Описание |
|-------|-----|---------|
| GET | `/api/client/profile` | Данные профиля |
| PATCH | `/api/client/profile` | Обновление имени, email, пароля |
| GET | `/api/client/bookings` | Все записи клиента (по client_id + phone) |
| GET | `/api/client/notifications` | Уведомления + unread count |
| POST | `/api/client/notifications/read` | Пометить все прочитанными |

## Client JWT Middleware
```js
if (payload.type !== 'client') return res.status(403)
req.clientId = payload.id
```

## Rate limit
10 req / 15 мин / IP для login + register (из [[server-index.js]])

## Связано
[[Auth System]] · [[table-clients]] · [[table-bookings]] · [[table-notifications]] · [[cabinet.js]] · [[Backend]]
