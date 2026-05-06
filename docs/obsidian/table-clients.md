---
tags: [database, table]
---
# table: clients

Аккаунты клиентов сайта.

## Схема
| Столбец | Тип | Примечание |
|---------|-----|-----------|
| `id` | INT PK AUTO_INCREMENT | |
| `name` | VARCHAR(255) NOT NULL | |
| `phone` | VARCHAR(50) UNIQUE NOT NULL | Используется как логин |
| `email` | VARCHAR(255) | |
| `password` | VARCHAR(255) NOT NULL | bcrypt hash |
| `avatar_initials` | VARCHAR(5) | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

## Используется в
| Операция | Маршрут |
|----------|--------|
| INSERT (регистрация) | [[route-client]] |
| SELECT (логин) | [[route-client]] |
| SELECT/UPDATE (профиль) | [[route-client]] |

## Связи с другими таблицами
- [[table-bookings]] → `client_id` FK
- [[table-notifications]] → `client_id` FK

## Связано
[[Database]] · [[Auth System]] · [[route-client]] · [[table-bookings]] · [[table-notifications]]
