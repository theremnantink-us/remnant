---
tags: [frontend, js, supabase]
---
# js/supabase-config.js

Supabase JS клиент (shared ES module).

## Конфигурация
```js
const SUPABASE_URL  = 'https://cektzifptedmgfdgltnw.supabase.co'
const SUPABASE_ANON = 'sb_publishable_...'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})
```

## Используется в
| Файл | Цель |
|------|------|
| [[admin.js]] | Supabase Realtime — подписка на новые заявки |
| [[booking.js]] | Legacy интеграция |
| [[cabinet.js]] | Legacy интеграция |

## Примечание
Основная БД — MySQL через [[Backend]] (Node.js API).
Supabase используется преимущественно для Realtime каналов в [[admin.html]].
Supabase Auth не используется — только собственный JWT через [[Auth System]].

## Связано
[[Frontend]] · [[admin.js]] · [[booking.js]] · [[cabinet.js]]
