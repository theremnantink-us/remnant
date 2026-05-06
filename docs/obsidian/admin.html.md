---
tags: [frontend, page]
---
# admin.html — Панель администратора

61 KB. Большой inline `<style>` блок + встроенный JS.

## Структура
```
#loginWrap         ← форма входа admin
#adminPanel
  .admin-tabs      ← Заявки | Расписание | Настройки
  #bookings-tab    ← таблица записей
  #schedule-tab    ← тогл-кнопки слотов
  #notif-drawer    ← drawer уведомлений
```

## Вкладки
| Вкладка | Функции |
|---------|--------|
| Заявки | Таблица + поиск (debounce 300ms) + фильтр статуса + смена статуса inline + детали в модалке + CSV экспорт |
| Расписание | Тогл слотов по дням, «Закрыть/Открыть день», список записей на дату |
| Настройки | Блокировка дат, date overrides (кастомные часы) |

## Auth
- Login → [[route-auth]]
- Token: `localStorage.remnant_token`
- Все API-запросы через [[route-admin]] с `Authorization: Bearer`

## Real-time
Polling каждые 3 сек → `GET /api/notifications` → [[route-admin]] → тост + бейдж.

## JS зависимости
| Модуль | Роль |
|--------|------|
| [[admin.js]] | Вся логика панели |
| [[supabase-config.js]] | Supabase Realtime (уведомления о новых заявках) |

## Связано
[[Frontend]] · [[admin.js]] · [[route-admin]] · [[route-auth]] · [[Auth System]] · [[Notifications]] · [[Design System]]
