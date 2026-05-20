# REMNANT — Структурная схема

## Уровень представления

### Браузер клиента
#### HTML / CSS / JS
#### Three.js
##### Модель Female Head Anatomy.glb
#### GSAP ScrollTrigger
##### Scroll-анимация

### Браузер администратора
#### admin.html
#### JS-модуль admin.js

### Vite Dev Server
#### Порт 5173
#### Proxy /api → localhost:3000
#### HMR (Hot Module Replacement)

## Уровень логики

### Node.js / Express
#### Порт 3000
#### Маршруты
##### /api/auth
##### /api/bookings
##### /api/slots
##### /api/admin
##### /api/client
#### Безопасность
##### JWT (jsonwebtoken)
##### bcrypt (10 раундов)
##### Helmet / CORS
#### Уведомления
##### web-push (VAPID)
##### Telegram Bot API

## Уровень данных

### MySQL 8 — remnant_bd
#### bookings
#### clients
#### admins
#### availability
#### date_overrides
#### blocked_dates
#### client_notifications
#### push_subscriptions

### Telegram Bot API
#### Уведомление при новой записи

### Web Push VAPID
#### Подписки браузеров
#### Push при смене статуса записи
