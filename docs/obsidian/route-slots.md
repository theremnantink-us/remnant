---
tags: [backend, route]
---
# route: /api/slots

Файл: `server/routes/slots.js`

## GET /api/slots?date=YYYY-MM-DD
```json
Returns: {
  "date": "2026-05-01",
  "slots": [
    { "start": "12:00", "end": "14:00", "available": true },
    { "start": "14:00", "end": "16:00", "available": false }
  ],
  "blocked": false
}
```

### Алгоритм (5 шагов)
1. **Блокировка?** → проверить [[table-blocked-dates]]; если есть → `{ blocked: true }`
2. **Овверрайд?** → проверить `date_overrides` для конкретной даты
3. **Расписание** → fallback на [[table-availability]] по `day_of_week`
4. **Генерация слотов** → start_time … end_time с шагом slot_minutes
5. **Фильтрация** → исключить занятые в [[table-bookings]], исключить прошедшие (если сегодня)

## GET /api/availability
Возвращает еженедельное расписание + заблокированные даты (для отображения в календаре).

## Связано
[[table-availability]] · [[table-blocked-dates]] · [[table-bookings]] · [[booking.js]] · [[Backend]]
