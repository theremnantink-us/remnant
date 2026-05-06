---
tags: [database, table]
---
# table: bookings

Основная таблица записей клиентов.

## Схема
| Столбец | Тип | Примечание |
|---------|-----|-----------|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR(255) NOT NULL | |
| `phone` | VARCHAR(50) NOT NULL | |
| `email` | VARCHAR(255) | |
| `location` | VARCHAR(255) | Место на теле |
| `style` | VARCHAR(100) | Стиль тату |
| `size` | VARCHAR(50) | |
| `description` | TEXT | |
| `date` | DATE NOT NULL | |
| `time_slot` | VARCHAR(10) NOT NULL | Формат `HH:MM` |
| `status` | ENUM | `new` / `confirmed` / `cancelled` / `done`, default `new` |
| `client_id` | INT NULL | FK → [[table-clients]] |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | ON UPDATE CURRENT_TIMESTAMP |

## Кто использует
| Операция | Маршрут |
|----------|--------|
| INSERT (создание) | [[route-bookings]] |
| SELECT (список/детали) | [[route-admin]] |
| UPDATE (статус) | [[route-admin]] → side effect: [[table-notifications]] |
| DELETE | [[route-admin]] |
| SELECT (клиент) | [[route-client]] |
| SELECT (проверка слота) | [[route-slots]] |
| UPDATE (link client_id) | [[route-client]] при регистрации |

## Связано
[[Database]] · [[table-clients]] · [[route-bookings]] · [[route-admin]] · [[route-slots]] · [[route-client]]
