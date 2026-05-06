---
tags: [backend, server]
---
# server/index.js

Точка входа Express-сервера.

## Middleware (в порядке применения)
1. `compression()` — gzip
2. `cors()` — CORS headers
3. `express.json()` — JSON body parser
4. Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`
5. `express.static(PUBLIC)` — статика из корня (dev) / `dist/` (prod)
6. Rate limiters — на `/api`, `/api/bookings`, `/api/auth`, `/api/client/login`, `/api/client/register`

## Маршруты
```
/api           → [[route-slots]], [[route-bookings]], [[route-auth]]
/api/admin     → [[route-admin]]
/api/client    → [[route-client]]
```

## Clean URLs middleware
`GET /master` → отдаёт `master.html`
Работает для любого пути без расширения, если существует `{path}.html`.

## Режимы статики
- **dev:** корень проекта + `public/` (GLB, текстуры)
- **prod:** `dist/` (после `npm run build`)

## Запуск
```bash
node --watch server/index.js   # dev
node server/index.js           # prod
```
Вызывает `initDatabase()` из [[db.js]] перед стартом сервера.

## Связано
[[Backend]] · [[db.js]] · [[route-auth]] · [[route-bookings]] · [[route-slots]] · [[route-admin]] · [[route-client]] · [[Deployment]]
