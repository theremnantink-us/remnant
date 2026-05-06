---
tags: [backend, route, auth]
---
# route: /api/admin

Файл: `server/routes/admin.js` (274 строки)
**Все endpoints требуют Admin JWT** (`Authorization: Bearer {token}`).

## Записи
| Метод | URL | Описание |
|-------|-----|---------|
| GET | `/api/bookings` | Список: фильтры status, date, from, to, limit, offset |
| PATCH | `/api/bookings/:id` | Смена статуса → пишет [[table-notifications]] |
| DELETE | `/api/bookings/:id` | Удаление записи |
| GET | `/api/stats` | `{ total, upcoming, byStatus[] }` |

## Расписание
| Метод | URL | Описание |
|-------|-----|---------|
| GET / PUT | `/api/availability` | Читать/заменить [[table-availability]] |
| POST / DELETE | `/api/blocked-dates` | Управление [[table-blocked-dates]] |
| POST / DELETE | `/api/date-overrides` | Кастомные часы для дат |
| GET | `/api/calendar?year=&month=` | Данные для месячного календаря |

## Web Push
| Метод | URL | Описание |
|-------|-----|---------|
| GET | `/api/push/vapid-key` | Публичный VAPID ключ |
| POST | `/api/push/subscribe` | Подписка браузера |
| DELETE | `/api/push/unsubscribe` | Отписка |

## Notifications polling
| Метод | URL | Описание |
|-------|-----|---------|
| GET | `/api/notifications` | Последние 30 записей (для [[admin.js]] polling) |

## Side Effect
`PATCH /api/bookings/:id` при смене статуса → `INSERT` в [[table-notifications]] для клиента.

## Связано
[[Auth System]] · [[table-bookings]] · [[table-availability]] · [[table-blocked-dates]] · [[table-notifications]] · [[admin.js]] · [[Notifications]] · [[Backend]]
