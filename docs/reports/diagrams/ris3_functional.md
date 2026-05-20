# REMNANT — Функциональная схема

## Пользователь (клиент)

### Браузер — Frontend
#### index.html
##### 3D-анимация (Three.js · GSAP)
#### booking.html
##### Онлайн-запись (3 шага)
#### cabinet.html
##### Личный кабинет
#### portfolio.html
##### Галерея работ

## Администратор

### Браузер — Frontend
#### admin.html
##### Панель администратора

## API-сервер Node.js / Express (порт 3000)

### /api/auth
#### Авторизация администратора
#### JWT-токен (localStorage)

### /api/bookings
#### Создание записи (POST)
#### Уведомление в Telegram

### /api/slots
#### Список свободных слотов (GET)
#### Фильтрация по дате

### /api/admin
#### CRUD записей
#### Управление расписанием
#### Блокировка дат
#### Push-рассылка

### /api/client
#### Авторизация клиента
#### Профиль и история записей
#### Уведомления

## Внешние сервисы

### MySQL remnant_bd
#### 8 таблиц
#### host 127.0.0.1:3306

### Telegram Bot API
#### TG_BOT_TOKEN
#### TG_CHAT_ID

### Web Push VAPID
#### Подписки (push_subscriptions)
#### web-push npm
