---
tags: [frontend, js]
---
# js/common.js

Общие утилиты. Подключается ко всем страницам.

## Функции
| Функция | Описание |
|---------|---------|
| Nav scroll | Добавляет `.scrolled` на `.nav` при `scrollY > 50` (blur + border) |
| Burger menu | Тоглит `.open` на `.mobile-menu`, блокирует `body.overflow` |
| `window.closeMobileMenu()` | Глобальная функция закрытия меню |
| Client name in nav | Декодирует JWT из `localStorage.client_token`, показывает имя клиента |
| Fade-up observer | IntersectionObserver на `.fade-up` → добавляет `.visible` (threshold 0.12) |
| FAQ accordion | Клик на `.faq-question` → тоглит `.open`, закрывает остальные |

## Читает из localStorage
`localStorage.client_token` — JWT клиента для отображения имени в nav

## Присутствует на страницах
[[index.html]] · [[booking.html]] · [[admin.html]] · [[cabinet.html]] · [[master.html]] · [[studio.html]] · [[faq.html]] · [[aftercare.html]]

## Связано
[[Frontend]] · [[Auth System]] · [[Design System]]
