---
tags: [backend, route, auth]
---
# route: /api/auth

Файл: `server/routes/auth.js`

## Endpoints

### POST /api/auth/login
```json
Body:    { "username": "root", "password": "root" }
Returns: { "ok": true, "token": "eyJ..." }
```
1. Ищет admin по username в [[table-admins]]
2. `bcrypt.compare()` с хешем
3. Генерирует JWT `{ id, username }`, expiry 24ч
4. При неверных данных → 401

### POST /api/auth/change-password
```
Authorization: Bearer {token}
Body: { "current_password": "...", "new_password": "..." }
```
Требует Admin JWT middleware.

## Admin JWT Middleware
```js
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.slice(7)
  const payload = jwt.verify(token, JWT_SECRET)
  req.admin = payload  // → доступно в [[route-admin]]
  next()
}
```

## Rate limit
10 req / 15 мин / IP (из [[server-index.js]])

## Связано
[[Auth System]] · [[table-admins]] · [[admin.js]] · [[Backend]]
