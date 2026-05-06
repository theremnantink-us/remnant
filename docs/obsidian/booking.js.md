---
tags: [frontend, js]
---
# js/booking.js

Логика формы записи. 250+ строк.

## Состояние
```js
let selectedDate = null
let selectedSlot = null
```

## Ключевые функции
| Функция | Описание |
|---------|---------|
| `renderCalendar(year, month)` | Генерирует сетку дней, блокирует прошедшие |
| `selectDate(iso)` | Загружает слоты: `GET /api/slots?date=` |
| `goToStep(n)` | Переключение между шагами 1–3 |
| Form submit | `POST /api/bookings` |

## API вызовы
```
GET /api/slots?date=YYYY-MM-DD → [[route-slots]]
POST /api/bookings             → [[route-bookings]]
```

## Auth интеграция
Если `localStorage.client_token` существует → добавляет `Authorization: Bearer` в POST → связывает запись с клиентом.

## Локализация
Константы `MONTHS[]`, `DOW[]` — русские названия.

## Присутствует на
[[booking.html]]

## Связано
[[Frontend]] · [[booking.html]] · [[route-slots]] · [[route-bookings]] · [[Auth System]]
