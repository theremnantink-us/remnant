---
tags: [remnant, overview]
---
# REMNANT — Tattoo Studio

> Система онлайн-записи для тату-студии. Vanilla JS + Node.js/Express + MySQL.

## Архитектура

```
Browser (Vanilla JS)  ←──→  Express API :3000  ←──→  MySQL (remnant_bd)
        ↕                          ↕
   Supabase RT              Telegram / Web Push
```

## Слои

| Слой | Описание |
|------|---------|
| [[Frontend]] | 8 страниц, 8 JS-модулей, 3 CSS-файла |
| [[Backend]] | Express, 5 маршрутов, 1 слой БД |
| [[Database]] | 8 таблиц MySQL |
| [[Auth System]] | JWT: раздельные токены admin + client |
| [[Notifications]] | Telegram, Web Push, in-app |
| [[Design System]] | CSS-переменные, тёмная тема |
| [[Deployment]] | TimeWeb VPS, Nginx, PM2 |

## Страницы
[[index.html]] · [[booking.html]] · [[admin.html]] · [[cabinet.html]] · [[master.html]] · [[studio.html]] · [[faq.html]] · [[aftercare.html]]

## JS Модули
[[common.js]] · [[home.js]] · [[hero-3d.js]] · [[lightbox.js]] · [[booking.js]] · [[admin.js]] · [[cabinet.js]] · [[supabase-config.js]]

## API Маршруты
[[route-auth]] · [[route-bookings]] · [[route-slots]] · [[route-admin]] · [[route-client]]

## Таблицы БД
[[table-bookings]] · [[table-availability]] · [[table-clients]] · [[table-admins]] · [[table-blocked-dates]] · [[table-notifications]]

## Инфраструктура
[[server-index.js]] · [[db.js]]
