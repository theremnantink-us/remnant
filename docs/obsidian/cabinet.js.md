---
tags: [frontend, js]
---
# js/cabinet.js

Логика личного кабинета клиента. 500+ строк.

## Состояние
```js
let clientToken = localStorage.getItem('client_token')
let clientProfile = null
let allBookings = []
let currentFilter = 'upcoming'  // 'upcoming' | 'past' | 'all'
let notifPollTimer = null
```

## Ключевые функции
| Функция | Описание |
|---------|---------|
| `doLogin()` | POST `/api/client/login` → [[route-client]] |
| `doRegister()` | POST `/api/client/register` → [[route-client]] |
| `loadProfile()` | GET `/api/client/profile` → [[route-client]] |
| `loadBookings()` | GET `/api/client/bookings` → [[route-client]] |
| `renderBookings()` | Фильтрует `allBookings` по `currentFilter` |
| `startNotifPolling()` | setInterval 3 сек → [[Notifications]] |
| `logout(clear)` | Очищает токен из localStorage, показывает форму |

## API Helper
```js
async function api(method, path, body) {
  // авто-добавляет Bearer token
  // при 401 → logout(false)
}
// Базовый URL: /api/client
```

## Присутствует на
[[cabinet.html]]

## Связано
[[Frontend]] · [[cabinet.html]] · [[route-client]] · [[Auth System]] · [[Notifications]]
