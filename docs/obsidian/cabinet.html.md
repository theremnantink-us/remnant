---
tags: [frontend, page]
---
# cabinet.html — Личный кабинет клиента

30 KB. Клиентский дашборд с авторизацией.

## Структура
```
#auth-screen       ← Login / Register табы
#app-screen
  .nav-tabs        ← Главная | Записи | Уведомления | Профиль
  #tab-bookings    ← список записей + фильтры
  #tab-notifications ← inbox
  #tab-profile     ← редактирование профиля
```

## Функции
| Функция | Описание |
|---------|---------|
| Авторизация | Регистрация/логин по телефону + паролю |
| Записи | Список с фильтром: предстоящие / прошедшие / все |
| Профиль | Редактирование имени, email, смена пароля |
| Уведомления | Inbox, mark-as-read |

## Программа лояльности (в записях)
Стандарт → Серебро (5 визитов) → Золото (10 визитов)

## Auth
- Token: `localStorage.client_token`, `localStorage.client_name`
- API: [[route-client]]

## JS зависимости
| Модуль | Роль |
|--------|------|
| [[cabinet.js]] | Вся логика кабинета |
| [[common.js]] | Навигация |

## Связано
[[Frontend]] · [[cabinet.js]] · [[route-client]] · [[Auth System]] · [[table-clients]] · [[table-notifications]] · [[Notifications]]
