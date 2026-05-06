---
tags: [frontend, page]
---
# booking.html — Форма записи

24 KB. 3-шаговый процесс записи на сеанс.

## Шаги
1. **Шаг 1** — Выбор даты (календарь) + слота времени
2. **Шаг 2** — Контакты: имя, телефон (с маской), стиль, размер
3. **Шаг 3** — Описание + подтверждение

## Логика слотов
- Слоты загружаются из [[route-slots]] при выборе даты
- Недоступные/занятые слоты серые
- Прошедшие слоты сегодня скрываются

## Отправка формы
```
POST /api/bookings → [[route-bookings]]
{ name, phone, email, location, style, size, description, date, time_slot }
```
Если клиент авторизован → добавляется `Authorization: Bearer {client_token}` → привязка `client_id`.

## JS зависимости
| Модуль | Роль |
|--------|------|
| [[booking.js]] | Основная логика: календарь, слоты, форма |
| [[common.js]] | Навигация |

## Связано
[[Frontend]] · [[booking.js]] · [[route-bookings]] · [[route-slots]] · [[table-bookings]] · [[Auth System]]
