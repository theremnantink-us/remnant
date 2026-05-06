---
tags: [backend, overview]
---
# Backend

Node.js / Express. Порт 3000. ES Modules (`type: module`).
В dev-режиме обслуживает статику из корня проекта; в prod — из `dist/`.

## Файлы
| Файл | Роль |
|------|------|
| [[server-index.js]] | Точка входа, middleware, маршруты, static, clean URLs |
| [[db.js]] | MySQL pool, helper-функции, `initDatabase()` |

## API Маршруты
| Файл | Prefix | Auth | Назначение |
|------|--------|------|-----------|
| [[route-auth]] | `/api/auth` | — | Логин/смена пароля admin |
| [[route-bookings]] | `/api/bookings` | — | Создание записи (public) |
| [[route-slots]] | `/api` | — | Доступность слотов |
| [[route-admin]] | `/api/admin` | Admin JWT | CRUD, расписание, push |
| [[route-client]] | `/api/client` | Client JWT | Клиент: auth, профиль, записи |

## Rate Limiting (в [[server-index.js]])
- Общий API: 100 req / 15 мин / IP
- POST /api/bookings: 5 req / час / IP
- Auth endpoints: 10 req / 15 мин / IP

## npm зависимости
`express` · `mysql2` · `jsonwebtoken` · `bcryptjs` · `cors` · `compression` · `express-rate-limit` · `web-push`

## Связано
[[Frontend]] · [[Database]] · [[Auth System]] · [[Notifications]] · [[Deployment]] · [[REMNANT]]
