---
tags: [database, table]
---
# table: availability

Еженедельное расписание работы (по дням недели).

## Схема
| Столбец | Тип | Default |
|---------|-----|---------|
| `id` | INT PK | |
| `day_of_week` | TINYINT UNIQUE | 0=Вс, 1=Пн … 6=Сб |
| `start_time` | VARCHAR(5) | `12:00` |
| `end_time` | VARCHAR(5) | `21:00` |
| `slot_minutes` | INT | `120` |

## Seed данные
7 строк (дни 0–6), все 12:00–21:00, 120-мин слоты (при `initDatabase` в [[db.js]]).

## Используется в
| Кто | Что делает |
|-----|-----------|
| [[route-slots]] | Читает расписание для генерации слотов |
| [[route-admin]] | GET / PUT для редактирования расписания |
| [[admin.js]] | Отображает и изменяет через UI |

## Связано
[[Database]] · [[route-slots]] · [[route-admin]]
