---
tags: [deployment, ops]
---
# Deployment

## Локальная разработка
| Компонент | Команда | Порт |
|-----------|---------|------|
| MySQL | MAMP (запустить вручную) | 3306 |
| API Server | `node --watch server/index.js` | 3000 |
| Vite dev (опц.) | `npm run dev` | 5173 |

Vite проксирует `/api` → `localhost:3000`.
Доступ: `http://localhost:3000/` или `http://localhost:8888/REMNANT/` (через MAMP).

## Production (TimeWeb VPS)
| Файл | Назначение |
|------|-----------|
| `ecosystem.config.cjs` | PM2 конфиг (process manager) |
| `nginx.conf` | Reverse proxy шаблон |
| `deploy.sh` | Скрипт деплоя (заготовка) |

Стек: **Nginx → PM2 → Node.js :3000 → MySQL**

## Build
```bash
npm run build    # Vite → dist/
# Express в prod отдаёт dist/ как статику
```

## ENV переменные (`server/.env`)
```
PORT=3000
DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME
JWT_SECRET          ← обязательно сменить!
TG_BOT_TOKEN / TG_CHAT_ID   ← опционально
```

## Чеклист перед деплоем
- [ ] Сменить `JWT_SECRET`
- [ ] Сгенерировать новые VAPID ключи
- [ ] Настроить Telegram бота
- [ ] Настроить MySQL credentials
- [ ] `npm run build` → загрузить `dist/`

## Связано
[[Backend]] · [[server-index.js]] · [[Notifications]] · [[REMNANT]]
