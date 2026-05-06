---
tags: [frontend, js, three]
---
# hero-3d.js — Three.js 3D анимация

Код расположен **inline** в [[index.html]] (`<script type="module">`), не в отдельном файле.

## Сцена Three.js
| Параметр | Значение |
|----------|---------|
| Renderer | WebGLRenderer, ACES filmic, `#080808` background |
| Camera | PerspectiveCamera, fov=38, z=3.8 |
| Fog | FogExp2, density=0.18 |

## 5 источников света
| Свет | Цвет | Роль |
|------|------|------|
| Ambient | `#1a1520` | Общее освещение |
| Key | `#fff6e8` warm | Главный свет (сверху-сбоку) |
| Fill | `#8090c0` cool | Заполняющий (противоположная сторона) |
| Rim | `#5060c8` | Контровой (сзади, отделяет от фона) |
| Bottom | `#80600a` | Подсветка снизу (едва заметна) |

## 3D Модель
`public/source/Female Head Anatomy.glb` (30 MB)
- Нормализация до 2.2 units
- Материал: MeshStandardMaterial, marble-white, roughness=0.72, metalness=0.04
- При ошибке загрузки → fallback на particle effect

## 7-стадийная scroll анимация (GSAP timeline, scrub=3)
| Прогресс | Стадия | Поворот модели |
|----------|--------|---------------|
| 0–10% | Intro drift | −0.5 от старта |
| 10–22% | Profile snap | Левый профиль (−π/2), dutch tilt |
| 22–40% | Back reveal | Затылок (−π) |
| 40–50% | Hold tattoo | Слегка ближе |
| 50–62% | Whip pan | Правый профиль (−π×1.5) |
| 62–80% | Dramatic return | Лицо (−2π+0.3) |
| 80–100% | Final settle | Возврат к старту |

## Texture Overlay система
6 текстур `textures/color-0..5.png`:
- Белые пиксели → прозрачный alpha (удаление фона)
- Наложения поверх модели как MeshBasicMaterial
- Появляются по одному при скролле (GSAP opacity)

## Render loop
- Плавное покачивание: `sin(t*0.5)*0.08` по Y
- Mouse tracking → micro-rotations камеры (lerp 0.05)
- `rotProxy`, `camProxy` обновляются GSAP, применяются в каждом кадре

## Связано
[[index.html]] · [[Frontend]] · [[REMNANT]]
