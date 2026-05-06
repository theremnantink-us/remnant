# REMNANT — Граф проекта для Obsidian

Знание-граф проекта REMNANT. Каждый файл = один узел, `[[ссылки]]` = рёбра графа.

## Как импортировать

1. Открыть Obsidian
2. **Open folder as vault** → выбрать папку `docs/obsidian/`
3. Перейти в **Graph View** (`Ctrl/Cmd + G`)

## Структура узлов

| Тип | Файлы | Теги |
|-----|-------|------|
| Обзор / хабы | REMNANT, Frontend, Backend, Database | `overview` |
| Системы | Auth System, Design System, Notifications, Deployment | — |
| Страницы | `index.html`, `booking.html`, `admin.html`, `cabinet.html`… | `page` |
| JS модули | `common.js`, `home.js`, `hero-3d.js`, `booking.js`… | `js` |
| Сервер | `server-index.js`, `db.js` | `server` |
| API маршруты | `route-auth`, `route-bookings`, `route-slots`, `route-admin`, `route-client` | `route` |
| Таблицы БД | `table-bookings`, `table-clients`, `table-admins`… | `table` |

## Рекомендуемые настройки Graph View

- **Filters:** включить all files
- **Groups:** настроить цвета по тегам:
  - `overview` → красный (хабы)
  - `page` → синий
  - `js` → зелёный
  - `route` → оранжевый
  - `table` → фиолетовый
- **Display:** включить arrows для направленных связей

## Точки входа для навигации

- **[[REMNANT]]** — полный обзор всего проекта
- **[[Frontend]]** / **[[Backend]]** — по слою
- **[[Auth System]]** — понять двухпоточную авторизацию
- **[[booking.html]]** → **[[booking.js]]** → **[[route-bookings]]** → **[[table-bookings]]** — полный флоу записи
- **[[Notifications]]** — все три канала уведомлений
