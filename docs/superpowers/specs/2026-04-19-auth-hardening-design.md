# REMNANT — Auth Hardening (Project A, 2026-04-19)

Google OAuth, Cloudflare Turnstile и фирменные транзакционные письма для клиентского и админского auth-flow.

## Goals

- Добавить вход «через Google» как альтернативу email+password.
- Защитить формы регистрации, логина и бронирования от ботов через Cloudflare Turnstile.
- Перевести все системные письма (confirm signup, reset password, change email, magic link) с домена `noreply@mail.app.supabase.io` на `noreply@theremnant.ink`.
- Зарегистрировать домен `theremnant.ink` и завести инфраструктурный минимум (Porkbun + Cloudflare DNS).

## Non-goals

- Apple Sign In (отдельный спек — нужен Apple Developer аккаунт $99/год).
- Полная i18n писем (сейчас только RU; EN-версия шаблонов — в Проекте B).
- Удаление мёртвого Express-бэкенда (`server/routes/client.js`, `server/routes/auth.js`) и MySQL (`clients`, `client_notifications` таблиц). Отдельный cleanup-проект.
- Inbox-провайдер для `@theremnant.ink` (Google Workspace / Yandex 360 / Zoho) — не блокирует запуск транзакционных писем; заводится отдельно при необходимости.
- Rate-limit на Supabase Auth — встроенный у Supabase есть, кастом не добавляем.

## Контекст

Фронт полностью работает на Supabase:
- `cabinet.js` — `supabase.auth.signUp/signInWithPassword`, данные в таблице `profiles`.
- `admin.js` — `supabase.auth.signInWithPassword` с email+password админа.
- `booking.js` — `supabase.from('bookings').insert(...)` от анонимного ключа; если клиент залогинен, в запись дописывается `user_id`.

Express-сервер (`server/index.js`) работает, но фронт в него не стучится ни одним `fetch`. Это dead code — в рамках этого спека не трогаем.

---

## Section 1 — Инфраструктура (вне кода)

Подготовка до любых правок. Все шаги руками в веб-интерфейсах.

### 1.1 Домен `theremnant.ink`

1. Зарегистрировать на **Porkbun** (~$10/год).
2. В Porkbun → Name Servers → указать Cloudflare NS (`ns1.cloudflare.com` и т.п., точные значения CF выдаст при добавлении сайта).

### 1.2 Cloudflare

1. Добавить сайт `theremnant.ink` в CF (Free-план).
2. Подтвердить делегирование NS (Porkbun → CF), ждать `Active`.
3. Turnstile → Add Site:
   - Domain: `theremnant.ink` + добавить `localhost` для разработки.
   - Widget mode: **Managed** (CF сам решает, когда показывать челлендж).
   - Сохранить `Site Key` (публичный) и `Secret Key` (серверный).

### 1.3 Resend

1. Зарегистрировать новый API-ключ (старый, засвеченный в чате, пользователь ревокнул).
2. Resend → Domains → Add Domain `theremnant.ink`.
3. Resend выдаст ~5 DNS-записей (SPF, 2×DKIM, DMARC, return-path CNAME) → скопировать в Cloudflare DNS.
4. Ждать зелёных галочек «Verified» в Resend (обычно 5-30 минут).
5. После верификации домен готов слать письма от `noreply@theremnant.ink`.

### 1.4 Supabase Dashboard

1. Authentication → Providers:
   - Google: Enable, вбить Client ID + Secret из Google Cloud Console (см. 1.5).
   - Turnstile (Authentication → Settings → Bot and abuse protection): Enable, выбрать Cloudflare Turnstile, вбить Turnstile Secret Key.
2. Authentication → SMTP Settings:
   - Enable Custom SMTP.
   - Host: `smtp.resend.com`, Port: `465`, Username: `resend`, Password: Resend API key.
   - Sender email: `noreply@theremnant.ink`, Sender name: `REMNANT`.
3. Authentication → Email Templates — заменить 4 шаблона (см. Section 6).

### 1.5 Google Cloud Console

1. Создать новый проект `REMNANT`.
2. APIs & Services → OAuth consent screen → External → заполнить: App name `REMNANT`, user support email `theremnant.ink@gmail.com`, authorized domain `theremnant.ink` + `supabase.co` (для колбэка).
3. Credentials → Create → OAuth Client ID → Web application:
   - Authorized redirect URIs: `https://cektzifptedmgfdgltnw.supabase.co/auth/v1/callback` (Supabase callback).
   - Сохранить Client ID + Secret, вбить в Supabase (Section 1.4.1).

### 1.6 Переменные окружения (`server/.env`)

Добавить:
```
RESEND_API_KEY=re_новый_ключ
TURNSTILE_SECRET_KEY=...   # для Edge Function ниже
```

`.env` уже в `.gitignore` (проверить при реализации).

---

## Section 2 — Google OAuth на фронте

**Файлы:** `cabinet.html`, `js/cabinet.js`, `css/cabinet.css`.

### 2.1 Кнопка «Войти через Google»

В форме логина и в форме регистрации (обе в `cabinet.html`) над разделителем добавить:

```html
<button type="button" class="auth-oauth auth-oauth--google" id="login-google">
  <svg viewBox="0 0 24 24" width="18" height="18"><!-- Google G mark SVG --></svg>
  <span>Войти через Google</span>
</button>
<div class="auth-divider"><span>или</span></div>
```

### 2.2 Обработчик

В `cabinet.js` до существующих submit-listener'ов:

```js
document.getElementById('login-google')?.addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${location.origin}/cabinet.html`,
      queryParams: { prompt: 'select_account' },
    }
  });
  if (error) setError('login-error', 'Не удалось войти через Google');
});
```

То же для регистрации (`register-google`). Обе кнопки вызывают один flow — Supabase сам поймёт, новый юзер или существующий.

### 2.3 CSS

`css/cabinet.css`:
```css
.auth-oauth {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  padding: .75rem 1rem;
  background: #fff;
  color: #000;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 8px;
  font-family: var(--font-sans);
  font-size: .9rem;
  cursor: pointer;
  transition: background .2s;
}
.auth-oauth:hover { background: #f2f2f2; }
.auth-divider { text-align: center; color: var(--muted); font-size: .75rem; margin: 1rem 0; }
.auth-divider span { padding: 0 .5rem; }
```

---

## Section 3 — Phone onboarding после первого OAuth-входа

Google не даёт телефон. После OAuth-регистрации `profiles.phone` будет `null`. Без телефона не работают bookings (старые записи не связать) и SMS-уведомления (если будут).

### 3.1 Проверка в auth state listener

`js/cabinet.js`, внутри `onAuthStateChange`:

```js
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (!session) { showAuth(); return; }
  const { data: profile } = await supabase
    .from('profiles')
    .select('phone, name')
    .eq('id', session.user.id)
    .maybeSingle();
  if (!profile || !profile.phone) {
    // Показываем #onboarding-screen, прячем #auth-screen и #app-screen.
    // Имя дозаполняется из user_metadata.full_name, если Google его вернул.
    showPhoneOnboarding(session.user);
    return;
  }
  showApp();
  loadDashboard(session.user);
});
```

### 3.2 Экран онбординга

Новый блок в `cabinet.html` (между `#auth-screen` и `#app-screen`):

```html
<section id="onboarding-screen" hidden>
  <div class="onboarding-card">
    <h1>Последний шаг</h1>
    <p>Укажите телефон — он нужен для связи по записи.</p>
    <form id="onboarding-form">
      <input id="onb-name" placeholder="Имя" />
      <input id="onb-phone" type="tel" placeholder="+7 (___) ___-__-__" required />
      <button type="submit">Продолжить</button>
    </form>
  </div>
</section>
```

Обработчик:
```js
document.getElementById('onboarding-form').addEventListener('submit', async e => {
  e.preventDefault();
  const name  = document.getElementById('onb-name').value.trim();
  const raw   = document.getElementById('onb-phone').value.trim();
  const phone = formatPhone(raw);
  if (!raw || raw.replace(/\D/g, '').length < 10) return;
  const { data: { session } } = await supabase.auth.getSession();
  await supabase.from('profiles').upsert({
    id: session.user.id,
    name: name || session.user.user_metadata?.full_name || '',
    phone
  });
  showApp();
  loadDashboard(session.user);
});
```

Имя дозаполняется из `user_metadata.full_name` (Google возвращает). Пользователь может его отредактировать.

---

## Section 4 — Turnstile на формах

### 4.1 Supabase Auth (signup/signin)

Turnstile встроен в Supabase. После 1.4.1 фронт обязан передавать токен:

`cabinet.html` — скрипт виджета в `<head>`:
```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

В формы регистрации и логина перед кнопкой submit:
```html
<div class="cf-turnstile" data-sitekey="0x4AAA..." data-theme="dark"></div>
```

В обработчиках:
```js
const token = document.querySelector('#register-form .cf-turnstile input[name="cf-turnstile-response"]')?.value;
if (!token) return setError('reg-error', 'Подтвердите, что вы не робот');

const { error } = await supabase.auth.signUp({
  email, password,
  options: { data: { name }, captchaToken: token }
});
```

То же для логина. Supabase сам валидирует токен на своей стороне — кода на нашем бэкенде нет.

### 4.2 Admin логин

Admin использует тот же `supabase.auth.signInWithPassword` → Turnstile применяется автоматически, когда включен в Supabase Settings. Добавить виджет в форму логина админки (`admin.html`).

### 4.3 Booking form

Booking идёт через `supabase.from('bookings').insert(...)` от анонимного ключа. Supabase Turnstile для авт-endpoint'ов тут не применим. Решение — Supabase Edge Function (Section 5).

---

## Section 5 — Edge Function `submit-booking`

Заменяет прямой `insert` на вызов функции, которая:
1. Валидирует Turnstile-токен через Cloudflare API.
2. Валидирует поля (дата, слот, имя, телефон).
3. Вставляет запись через service-role ключ.

### 5.1 Функция

`supabase/functions/submit-booking/index.ts` (новый каталог):

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const body = await req.json();
  const { captchaToken, ...booking } = body;

  // 1. Verify Turnstile
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: Deno.env.get('TURNSTILE_SECRET_KEY')!,
      response: captchaToken,
    }),
  }).then(r => r.json());
  if (!verify.success) return new Response(JSON.stringify({ error: 'captcha' }), { status: 403 });

  // 2. Minimal field validation
  if (!booking.date || !booking.time_slot || !booking.name || !booking.phone) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400 });
  }

  // 3. Insert via service role (RLS bypass)
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const { data, error } = await sb.from('bookings').insert(booking).select().single();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true, id: data.id }), { headers: { 'Content-Type': 'application/json' } });
});
```

### 5.2 Секреты функции

```
supabase secrets set TURNSTILE_SECRET_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... # берётся из Project Settings
```

`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` доступны внутри функций автоматически — явно устанавливать не надо, но для ясности указал.

### 5.3 Деплой

```
supabase functions deploy submit-booking
```

### 5.4 Изменения в `js/booking.js`

**Не трогаем:** загрузку reference-фото в Supabase Storage (`booking.js:199-214`) — она остаётся на клиенте, Storage принимает anon-ключ и возвращает publicUrl.

**Меняем:** только шаг финальной вставки записи. Заменить блок с `supabase.from('bookings').insert(bookingData)` на:

```js
const captchaToken = document.querySelector('#booking-form .cf-turnstile input[name="cf-turnstile-response"]')?.value;
if (!captchaToken) { alert('Подтвердите, что вы не робот'); return; }

const { data: { session } } = await supabase.auth.getSession();
if (session?.user) bookingData.user_id = session.user.id;

const { data, error } = await supabase.functions.invoke('submit-booking', {
  body: { ...bookingData, captchaToken },
});
if (error || data?.error) { /* показать ошибку */ }
```

Виджет Turnstile добавляется в `booking.html` (шаг 3 формы, перед submit-кнопкой).

### 5.5 RLS

После деплоя функции — можно **ужесточить RLS на `bookings`**: убрать `INSERT` для anon role (было нужно для прямых вставок). Теперь только service role пишет → anonymous insert блокируется. Это защита от обхода функции.

---

## Section 6 — Фирменные email-шаблоны

Replace 4 Supabase шаблонов: Confirm signup, Magic Link, Change Email Address, Reset Password.

### 6.1 Структура шаблона

Единый дизайн в брендовых цветах REMNANT (чёрный фон, золотой акцент, Cormorant Garamond для заголовков, Inter для тела).

Пример (Confirm Signup):

```html
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>REMNANT</title></head>
<body style="margin:0; background:#080808; font-family:'Inter',Arial,sans-serif; color:#e8e3dc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table role="presentation" width="100%" style="max-width:480px;">
        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-family:Georgia,serif; font-size:1.8rem; letter-spacing:.2em; color:#c4a882;">REMNANT</span>
        </td></tr>
        <tr><td style="padding:32px 24px; background:#0f0f0f; border:1px solid rgba(255,255,255,.08); border-radius:8px;">
          <h1 style="margin:0 0 16px; font-family:Georgia,serif; font-weight:400; font-size:1.5rem;">Подтвердите email</h1>
          <p style="margin:0 0 24px; line-height:1.6; color:#b8b0a8;">
            Чтобы завершить регистрацию в REMNANT, подтвердите свой адрес.
          </p>
          <a href="{{ .ConfirmationURL }}" style="display:inline-block; padding:14px 32px; background:#c4a882; color:#080808; text-decoration:none; letter-spacing:.1em; text-transform:uppercase; font-size:.85rem;">Подтвердить</a>
          <p style="margin:24px 0 0; font-size:.75rem; color:#6e6660;">
            Если вы не регистрировались — просто проигнорируйте это письмо.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:32px 24px; font-size:.7rem; color:#6e6660;">
          REMNANT Tattoo Studio · theremnant.ink
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

Ещё три шаблона — по тому же каркасу, меняется только заголовок / текст / ссылка. Тело шаблонов коммитим в `docs/email-templates/` для истории и code review; в Supabase заливаем копипастой.

### 6.2 Subject-строки

- Confirm signup: `Подтвердите email — REMNANT`
- Magic link: `Вход в REMNANT`
- Change Email: `Новый email для аккаунта REMNANT`
- Reset Password: `Восстановление пароля — REMNANT`

---

## Section 7 — Тесты и самопроверка

После реализации пройти вручную:

1. **Domain & DNS:** `dig theremnant.ink NS` → CF NS; `dig _dmarc.theremnant.ink TXT` → есть DMARC.
2. **Resend:** отправить test email из Resend dashboard на `theremnant.ink@gmail.com` — приходит с `noreply@theremnant.ink`, в заголовках `dkim=pass`, `spf=pass`.
3. **Supabase signup:** зарегистрировать тестовый аккаунт → письмо приходит от `noreply@theremnant.ink` с брендовым шаблоном, клик «Подтвердить» ведёт на рабочий callback.
4. **Google OAuth:** с чистого браузера клик «Войти через Google» → Google consent screen показывает `REMNANT` и `theremnant.ink` → после consent редирект на `/cabinet.html` → показан onboarding-экран с пустым телефоном → заполнить → попадает в кабинет.
5. **Turnstile:** открыть `cabinet.html` в режиме инкогнито → виджет отрисовался → попытка signup без решения виджета возвращает ошибку от Supabase (`captcha_failed`).
6. **Booking через Edge Function:** отправить запись → запись создаётся, токен Turnstile валидируется; отправка без токена или с фейковым токеном возвращает 403.
7. **RLS:** прямой `supabase.from('bookings').insert(...)` из консоли под anon-ключом возвращает ошибку (после ужесточения RLS).
8. **Admin login:** Turnstile появляется в форме админа, вход работает.

---

## Risk / open questions

- **Засвеченный Resend API-ключ** (`re_WXKc4pCr_5wnWr1aqFPdmBPo6y4rt8H7z`) был опубликован пользователем в чате 2026-04-19. Перед началом реализации убедиться, что ключ revoked в Resend dashboard и создан новый.
- **Задержка DNS-распространения** для Resend DKIM/SPF — обычно минуты, редко до 24 часов. Пункты Supabase SMTP и Email Templates делать **после** того, как в Resend все записи verified — иначе письма пойдут в спам.
- **Google OAuth Consent Screen в режиме External + Unverified:** для первых 100 пользователей работает, но показывает предупреждение «Google hasn't verified this app». Для продакшена со временем надо пройти верификацию (занимает 1-4 недели). Не блокирующе.
- **User linking:** если клиент когда-то зарегистрировался через email+password, а потом входит через Google с тем же email — Supabase по умолчанию создаёт **отдельного пользователя**. Нужно в Supabase Auth → Settings включить **«Allow linked identities»** (или аналогичный тоглл) — в новых версиях по умолчанию ON. Проверить при настройке.
- **Phone duplicates:** таблица `profiles` не имеет UNIQUE constraint на `phone`. OAuth-юзер может вбить телефон, который уже есть у другого юзера (старого). Рекомендация: добавить UNIQUE и в onboarding-форме ловить ошибку дубликата → предложить «объединить аккаунты». Включить в спек или отложить?
- **Express dead code** — в этом спеке не трогаем, но может создать путаницу при code review. В session log отметим «Express-бэкенд не используется фронтом, оставляем до отдельного cleanup-проекта».

---

## Files touched

| Файл | Что |
|---|---|
| `cabinet.html` | Кнопки Google OAuth (login + register форма), виджет Turnstile, блок `#onboarding-screen`, скрипт Turnstile в `<head>` |
| `admin.html` | Виджет Turnstile в форме логина, скрипт Turnstile в `<head>` |
| `booking.html` | Виджет Turnstile в шаге 3 формы, скрипт Turnstile в `<head>` |
| `js/cabinet.js` | `login-google`/`register-google` handlers; phone-onboarding flow в `onAuthStateChange`; `captchaToken` в `signUp`/`signIn` |
| `js/admin.js` | `captchaToken` в `signInWithPassword` |
| `js/booking.js` | Замена `supabase.from('bookings').insert` на `supabase.functions.invoke('submit-booking', ...)` + передача `captchaToken` |
| `css/cabinet.css` | `.auth-oauth`, `.auth-divider`, `.onboarding-card` |
| `css/admin.css` | Минорные отступы под виджет Turnstile |
| `supabase/functions/submit-booking/index.ts` | Новый Edge Function |
| `supabase/functions/submit-booking/deno.json` | Deno config (автогенерируется `supabase functions new`) |
| `docs/email-templates/confirm-signup.html` | HTML шаблон для истории |
| `docs/email-templates/magic-link.html` | — |
| `docs/email-templates/change-email.html` | — |
| `docs/email-templates/reset-password.html` | — |
| `server/.env.example` | Добавить `RESEND_API_KEY=`, `TURNSTILE_SECRET_KEY=` как плейсхолдеры (без значений) |

**Не трогаем** (dead code для этого спека): `server/routes/*`, `server/db.js`, `server/index.js`.

---

## Dependencies

До начала реализации:
1. Домен `theremnant.ink` зарегистрирован на Porkbun.
2. Cloudflare-сайт активен, Turnstile site/secret получены.
3. Resend-домен verified (все DNS-записи зелёные).
4. Google Cloud OAuth client создан.
5. Supabase SMTP/Turnstile/Google Provider настроены в dashboard.
6. Новый `RESEND_API_KEY` в `server/.env`, `TURNSTILE_SECRET_KEY` в Supabase secrets.

Эти шаги — не код, делаются пользователем по чек-листу Section 1 (я могу помочь пройти интерактивно).
