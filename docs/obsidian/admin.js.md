---
tags: [frontend, js]
---
# js/admin.js

Логика панели администратора. 500+ строк.

## Состояние
```js
let token = localStorage.getItem('remnant_token') || ''
```

## Ключевые функции
| Функция | Описание |
|---------|---------|
| `doLogin()` | POST `/api/auth/login` → [[route-auth]], сохраняет токен |
| `loadBookings(status)` | GET `/api/bookings` → [[route-admin]] |
| `updateBookingStatus(id, s)` | PATCH `/api/bookings/:id` → [[route-admin]] |
| `loadScheduleTab()` | GET `/api/availability` → [[route-admin]] |
| `initBookingsCal()` | GET `/api/calendar` → [[route-admin]] |
| `startNotifPolling()` | Polling каждые 3 сек → [[Notifications]] |

## API Helper
```js
async function apiCall(url, opts = {}) {
  // авто-добавляет Bearer token
  // при 401 → showLogin()
}
```

## Утилиты
- `esc(s)` — HTML escape (защита от XSS)
- `pad(n)` — padStart(2, '0')
- `toast(msg, type)` — показ уведомления

## Присутствует на
[[admin.html]]

## Связано
[[Frontend]] · [[admin.html]] · [[route-admin]] · [[route-auth]] · [[Auth System]] · [[Notifications]]
