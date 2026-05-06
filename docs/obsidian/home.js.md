---
tags: [frontend, js]
---
# js/home.js

Анимации главной страницы. 167 строк.

## Функции

### 1. Часы Москвы
```js
setInterval(updateTime, 1000)
// → #hero-time "Москва · HH:MM:SS"
```

### 2. GSAP ScrollTrigger анимации
- `.glass-card` — fromTo (opacity 0→1, y 80→0) с scrub 1.2
- Blur overlay — opacity 0→1 при скролле от philosophy-секции к master-секции

### 3. Smoke частицы (22 частицы)
- Canvas: `#smoke-canvas`
- Рисуются как радиальные градиенты (мягкие края)
- Волновое движение: sin/cos по осям
- Непрозрачность: 1 вверху → 0 после 1.5x высоты viewport
- 5 оттенков `--accent` (#c4a882)

## Зависит от
- GSAP 3.12.2 + ScrollTrigger (CDN)
- `#smoke-canvas`, `.glass-card` в [[index.html]]

## Связано
[[index.html]] · [[Frontend]] · [[Design System]]
