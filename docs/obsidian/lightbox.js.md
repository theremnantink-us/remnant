---
tags: [frontend, js]
---
# js/lightbox.js

Галерея изображений. 163 строки, IIFE паттерн.

## Функции
| Функция | Описание |
|---------|---------|
| Открытие | Клик на `.portfolio-item[data-lightbox]` |
| Слайдер | translateX(±100vw) + scale(0.88) с cubic-bezier анимацией |
| Клавиатура | Escape — закрыть, стрелки — навигация |
| Swipe | touch events, velocity-based (>50px или velocity >0.3) |
| iOS fix | Предотвращает swipe-to-go-back браузера |

## Data атрибуты
```html
<div class="portfolio-item"
     data-lightbox="works/work-01.webp"
     data-lightbox-fallback="works/work-01.png">
```

## Состояние
```js
let current = 0
let animating = false
const ANIM_MS = 320
```

## Присутствует на
[[index.html]] · [[master.html]]

## Связано
[[Frontend]] · [[index.html]] · [[master.html]]
