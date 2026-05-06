---
tags: [database, table]
---
# table: admins

Аккаунты администраторов.

## Схема
| Столбец | Тип | Примечание |
|---------|-----|-----------|
| `id` | INT PK AUTO_INCREMENT | |
| `username` | VARCHAR(100) UNIQUE | |
| `password` | VARCHAR(255) | bcrypt hash |

## Seed пользователи (при `initDatabase`)
| Username | Password | Hash |
|----------|---------|------|
| `admin` | `remnant2025` | bcrypt |
| `root` | `root` | bcrypt |

## Используется в
- [[route-auth]] — login, change-password

## Связано
[[Database]] · [[Auth System]] · [[route-auth]]
