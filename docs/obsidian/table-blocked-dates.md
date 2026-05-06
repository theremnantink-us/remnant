---
tags: [database, table]
---
# table: blocked_dates

Даты, когда студия закрыта.

## Схема
| Столбец | Тип | Примечание |
|---------|-----|-----------|
| `id` | INT PK AUTO_INCREMENT | |
| `date` | DATE UNIQUE | |
| `reason` | VARCHAR(255) | Причина закрытия |

## Семантика
Если дата есть в таблице → весь день недоступен.
[[route-slots]] возвращает `{ blocked: true }` — слоты не генерируются.

## Используется в
| Операция | Маршрут |
|----------|--------|
| SELECT (проверка) | [[route-slots]] |
| INSERT / DELETE | [[route-admin]] |
| SELECT (список) | [[route-admin]] (calendar endpoint) |

## Связано
[[Database]] · [[route-slots]] · [[route-admin]]
