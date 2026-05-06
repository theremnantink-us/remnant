---
tags: [design, css]
---
# Design System

Определён в `style.css` через CSS-переменные. Тёмная luxury-тема.

## Цвета
| Переменная | Значение | Роль |
|-----------|---------|------|
| `--bg` | `#080808` | Фон страницы |
| `--surface` | `#0f0f0f` | Приподнятый фон |
| `--surface-2` | `#161616` | Второй уровень |
| `--text` | `#e8e3dc` | Основной текст (тёплый белый) |
| `--text-muted` | `#6e6660` | Приглушённый текст |
| `--accent` | `#c4a882` | Золотой акцент |
| `--accent-dim` | `rgba(196,168,130,0.12)` | Dim акцент |

## Типографика
| Переменная | Шрифт |
|-----------|-------|
| `--font-serif` | Cormorant Garamond, Georgia |
| `--font-sans` | Inter, system-ui |

## Layout & Easing
- `--nav-h: 72px` (56px на <480px)
- `--ease: cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- `--ease-inout: cubic-bezier(0.76, 0, 0.24, 1)`

## Ключевые компоненты
| Класс | Описание |
|-------|---------|
| `.glass-card` | backdrop-filter blur(20px) + полупрозрачный фон |
| `.btn`, `.btn-outline`, `.btn-accent`, `.btn-fill` | Кнопки |
| `.fade-up` / `.fade-up.visible` | IntersectionObserver анимация → [[common.js]] |
| `.nav`, `.mobile-menu`, `.nav-burger` | Навигация |
| `.marquee` / `.marquee-track` | Бегущая строка |
| `.faq-item` / `.faq-answer` | Аккордеон FAQ |

## Breakpoints
- `768px` — tablet/mobile switch
- `480px` — small mobile

## CSS файлы
- `style.css` — глобальные стили (28 KB)
- `css/admin.css` — доп. стили [[admin.html]]
- `css/cabinet.css` — доп. стили [[cabinet.html]]
- `admin.html`, `cabinet.html` имеют дополнительные inline `<style>` блоки

## Используется на всех страницах
[[index.html]] · [[booking.html]] · [[admin.html]] · [[cabinet.html]] · [[master.html]] · [[studio.html]] · [[faq.html]] · [[aftercare.html]]

## Связано
[[Frontend]] · [[REMNANT]]
