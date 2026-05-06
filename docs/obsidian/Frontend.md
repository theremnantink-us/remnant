---
tags: [frontend, overview]
---
# Frontend

Vanilla HTML/CSS/JS без фреймворков. Каждая страница — отдельный HTML-файл.
Vite используется только для production build (`npm run build → dist/`).

## Страницы
| Страница | Назначение |
|----------|-----------|
| [[index.html]] | Главная, 3D-герой, портфолио |
| [[booking.html]] | 3-шаговая форма записи |
| [[admin.html]] | Панель администратора |
| [[cabinet.html]] | Личный кабинет клиента |
| [[master.html]] | Страница мастера |
| [[studio.html]] | О студии |
| [[faq.html]] | FAQ аккордеон |
| [[aftercare.html]] | Уход после тату |

## JS Модули (`js/`)
| Модуль | Используется в |
|--------|---------------|
| [[common.js]] | все страницы |
| [[home.js]] | [[index.html]] |
| [[hero-3d.js]] | [[index.html]] |
| [[lightbox.js]] | [[index.html]], [[master.html]] |
| [[booking.js]] | [[booking.html]] |
| [[admin.js]] | [[admin.html]] |
| [[cabinet.js]] | [[cabinet.html]] |
| [[supabase-config.js]] | [[booking.js]], [[admin.js]], [[cabinet.js]] |

## CSS файлы
- `style.css` — глобальные стили → [[Design System]]
- `css/admin.css` — стили [[admin.html]]
- `css/cabinet.css` — стили [[cabinet.html]]

## CDN библиотеки
- **GSAP 3.12.2** + ScrollTrigger — анимации
- **Three.js 0.169.0** + GLTFLoader — 3D
- **Google Fonts** — Cormorant Garamond + Inter
- **Supabase JS v2** — Realtime + legacy DB клиент

## Связано
[[Backend]] · [[Design System]] · [[Auth System]] · [[REMNANT]]
