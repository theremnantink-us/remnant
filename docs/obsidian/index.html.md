---
tags: [frontend, page]
---
# index.html — Главная страница

42 KB. Точка входа сайта.

## Секции
| Секция | Описание |
|--------|---------|
| Hero | 3D модель на canvas + текст + scroll-индикатор + часы Москвы |
| Marquee | Бегущая строка |
| Philosophy | Blur-overlay эффект при скролле |
| About | Stats grid |
| Master | Превью мастера |
| Portfolio | 6 работ + lightbox |
| FAQ | Превью аккордеона (4 вопроса) |
| CTA | Призыв к записи |
| Footer | Карта Яндекс |

## JS зависимости
| Модуль | Роль |
|--------|------|
| [[hero-3d.js]] | Three.js 3D модель + 7-стадийная scroll анимация |
| [[home.js]] | Часы Москвы, GSAP card анимации, smoke частицы |
| [[lightbox.js]] | Галерея портфолио со swipe |
| [[common.js]] | Навигация, fade-up observer, FAQ |

## 3D Ресурсы
- `public/source/Female Head Anatomy.glb` (30 MB) — модель
- `public/textures/color-0..5.png` — текстуры тату (overlay при скролле)
- `works/work-01..06.webp` — портфолио

## SEO / Meta
- OpenGraph, Twitter Card
- JSON-LD: LocalBusiness + FAQPage schema
- PWA: manifest.json

## Связано
[[Frontend]] · [[Design System]] · [[hero-3d.js]] · [[home.js]] · [[lightbox.js]] · [[common.js]]
