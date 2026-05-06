import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import webpush from 'web-push';
import { get, query, run } from '../db.js';
import {
  isEmail,
  normalizePhone,
  isStrongPassword,
  sanitizeText,
  generateConfirmationCode,
} from '../utils/validation.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'remnant-secret-change-me';
const VAPID_PUBLIC = process.env.VAPID_PUBLIC || 'BHzpv_sieYRh-IF5UCJ7Ac7vfOcEV8PgyC71_bGg10oOeytsfgE3tVtQgQ9V25SLKpzp3fQCOOjL89RL8qKTe-o';

// Loyalty tiers — must match frontend
export const LOYALTY_TIERS = [
  { id: 'novice',   label: 'Новичок',  threshold: 0,  benefit: 'Добро пожаловать. Первая консультация бесплатно.' },
  { id: 'bronze',   label: 'Бронза',   threshold: 1,  benefit: 'Персональная карта клиента и доступ к закрытым анонсам.' },
  { id: 'silver',   label: 'Серебро',  threshold: 3,  benefit: 'Скидка 5% на следующий сеанс и приоритетная запись.' },
  { id: 'gold',     label: 'Золото',   threshold: 5,  benefit: 'Скидка 10% и поздравительный подарок от студии.' },
  { id: 'platinum', label: 'Платина',  threshold: 10, benefit: 'Скидка 15%, бесплатная коррекция в первый год.' },
  { id: 'legend',   label: 'Легенда',  threshold: 20, benefit: 'Скидка 20% и персональный эксклюзивный дизайн.' },
];

export function tierForVisits(visits) {
  let cur = LOYALTY_TIERS[0];
  for (const t of LOYALTY_TIERS) if (visits >= t.threshold) cur = t;
  return cur;
}

export function nextTier(currentId) {
  const idx = LOYALTY_TIERS.findIndex((t) => t.id === currentId);
  return idx >= 0 && idx < LOYALTY_TIERS.length - 1 ? LOYALTY_TIERS[idx + 1] : null;
}

export function clientAuthMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Не авторизован' });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    if (payload.type !== 'client') return res.status(403).json({ error: 'Доступ запрещён' });
    req.clientId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}

// Confirmation code TTL (15 minutes)
const CODE_TTL_MIN = 15;

/* ─────────────────────────────────────────────────────────────
   Registration step 1 — request confirmation code
   POST /api/client/register
   ───────────────────────────────────────────────────────────── */
router.post('/register', async (req, res) => {
  const name = sanitizeText(req.body?.name, 100);
  const rawPhone = req.body?.phone;
  const email = sanitizeText(req.body?.email, 254);
  const password = req.body?.password;

  if (!name || name.length < 2) return res.status(400).json({ error: 'Введите имя (минимум 2 символа)' });
  const phone = normalizePhone(rawPhone);
  if (!phone) return res.status(400).json({ error: 'Некорректный номер телефона' });
  if (email && !isEmail(email)) return res.status(400).json({ error: 'Некорректный email' });
  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: 'Пароль минимум 8 символов, должен содержать буквы и цифры' });
  }

  try {
    const existing = await get('SELECT id FROM clients WHERE phone = ?', [phone]);
    if (existing) return res.status(409).json({ error: 'Этот номер уже зарегистрирован' });

    const passwordHash = bcrypt.hashSync(password, 10);
    const code = generateConfirmationCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000)
      .toISOString().slice(0, 19).replace('T', ' ');

    await run(
      `INSERT INTO registration_confirmations (phone, email, name, password_hash, code, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         email = VALUES(email),
         name = VALUES(name),
         password_hash = VALUES(password_hash),
         code = VALUES(code),
         attempts = 0,
         expires_at = VALUES(expires_at),
         created_at = CURRENT_TIMESTAMP`,
      [phone, email || '', name, passwordHash, code, expiresAt]
    );

    // In a real production setup, the code would be sent over SMS/email here.
    // For the demo we log it to the server console; in dev mode also surface it
    // to the response so reviewers can complete the flow without an SMS gateway.
    console.log(`[register] confirmation code for ${phone}: ${code}`);
    const devEcho = process.env.NODE_ENV !== 'production' ? { devCode: code } : {};

    res.status(202).json({
      ok: true,
      pending: true,
      phone,
      message: 'Код подтверждения отправлен. Введите его на следующем шаге.',
      ...devEcho,
    });
  } catch (e) {
    console.error('Register error:', e.message);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

/* ─────────────────────────────────────────────────────────────
   Registration step 2 — confirm code, create account
   POST /api/client/register/confirm
   ───────────────────────────────────────────────────────────── */
router.post('/register/confirm', async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').trim();
  if (!phone || !code) return res.status(400).json({ error: 'Введите телефон и код' });

  try {
    const pending = await get('SELECT * FROM registration_confirmations WHERE phone = ?', [phone]);
    if (!pending) return res.status(404).json({ error: 'Регистрация не найдена. Запросите код заново.' });

    if (new Date(pending.expires_at) < new Date()) {
      await run('DELETE FROM registration_confirmations WHERE phone = ?', [phone]);
      return res.status(410).json({ error: 'Код истёк. Запросите новый.' });
    }

    if (pending.attempts >= 5) {
      await run('DELETE FROM registration_confirmations WHERE phone = ?', [phone]);
      return res.status(429).json({ error: 'Превышено число попыток. Запросите новый код.' });
    }

    if (pending.code !== code) {
      await run('UPDATE registration_confirmations SET attempts = attempts + 1 WHERE phone = ?', [phone]);
      return res.status(400).json({ error: 'Неверный код' });
    }

    // Re-check phone uniqueness in case of race
    const dup = await get('SELECT id FROM clients WHERE phone = ?', [phone]);
    if (dup) {
      await run('DELETE FROM registration_confirmations WHERE phone = ?', [phone]);
      return res.status(409).json({ error: 'Этот номер уже зарегистрирован' });
    }

    const result = await run(
      `INSERT INTO clients (name, phone, email, password, email_verified)
       VALUES (?, ?, ?, ?, ?)`,
      [pending.name, pending.phone, pending.email, pending.password_hash, pending.email ? 1 : 0]
    );
    await run('DELETE FROM registration_confirmations WHERE phone = ?', [phone]);

    // Link existing anonymous bookings by normalized phone
    const digits = phone.replace(/\D/g, '');
    run(
      `UPDATE bookings SET client_id = ?
       WHERE client_id IS NULL AND REGEXP_REPLACE(phone, '[^0-9]', '') = ?`,
      [result.insertId, digits]
    ).catch(() => {});

    const token = jwt.sign({ id: result.insertId, type: 'client' }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ ok: true, token, name: pending.name, id: result.insertId });
  } catch (e) {
    console.error('Confirm error:', e.message);
    res.status(500).json({ error: 'Ошибка подтверждения' });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/client/login
   ───────────────────────────────────────────────────────────── */
router.post('/login', async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const password = req.body?.password;
  if (!phone || !password) return res.status(400).json({ error: 'Введите телефон и пароль' });

  const client = await get('SELECT * FROM clients WHERE phone = ?', [phone]);
  if (!client || !bcrypt.compareSync(password, client.password)) {
    return res.status(401).json({ error: 'Неверный телефон или пароль' });
  }

  // Link any bookings made before registration
  const digits = client.phone.replace(/\D/g, '');
  run(
    `UPDATE bookings SET client_id = ?
     WHERE client_id IS NULL AND REGEXP_REPLACE(phone, '[^0-9]', '') = ?`,
    [client.id, digits]
  ).catch(() => {});

  const token = jwt.sign({ id: client.id, type: 'client' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ ok: true, token, name: client.name, id: client.id });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/client/profile  (with loyalty data)
   ───────────────────────────────────────────────────────────── */
router.get('/profile', clientAuthMiddleware, async (req, res) => {
  const client = await get(
    `SELECT id, name, phone, email, visit_count, loyalty_tier, email_verified, created_at
     FROM clients WHERE id = ?`,
    [req.clientId]
  );
  if (!client) return res.status(404).json({ error: 'Профиль не найден' });

  const tier = tierForVisits(client.visit_count);
  const next = nextTier(tier.id);
  const medals = await query(
    'SELECT medal_id, earned_at FROM client_medals WHERE client_id = ? ORDER BY earned_at',
    [req.clientId]
  );

  res.json({
    ...client,
    loyalty: {
      tier,
      next,
      remaining: next ? Math.max(0, next.threshold - client.visit_count) : 0,
      progress: next
        ? Math.min(100, Math.round(((client.visit_count - tier.threshold) / (next.threshold - tier.threshold)) * 100))
        : 100,
      medals: medals.map((m) => m.medal_id),
      tiers: LOYALTY_TIERS,
    },
  });
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/client/profile
   ───────────────────────────────────────────────────────────── */
router.patch('/profile', clientAuthMiddleware, async (req, res) => {
  const name = sanitizeText(req.body?.name, 100);
  const email = sanitizeText(req.body?.email, 254);
  const phoneInput = req.body?.phone;
  const password = req.body?.password;
  const newPassword = req.body?.newPassword;

  if (email && !isEmail(email)) return res.status(400).json({ error: 'Некорректный email' });

  let phone = null;
  if (phoneInput) {
    phone = normalizePhone(phoneInput);
    if (!phone) return res.status(400).json({ error: 'Некорректный номер телефона' });
  }

  try {
    if (newPassword) {
      if (!isStrongPassword(newPassword)) {
        return res.status(400).json({ error: 'Пароль минимум 8 символов, должен содержать буквы и цифры' });
      }
      if (!password) return res.status(400).json({ error: 'Введите текущий пароль' });
      const cur = await get('SELECT password FROM clients WHERE id = ?', [req.clientId]);
      if (!bcrypt.compareSync(password, cur.password)) {
        return res.status(400).json({ error: 'Неверный текущий пароль' });
      }
      const hash = bcrypt.hashSync(newPassword, 10);
      await run('UPDATE clients SET password = ? WHERE id = ?', [hash, req.clientId]);
    }

    if (phone) {
      const taken = await get('SELECT id FROM clients WHERE phone = ? AND id != ?', [phone, req.clientId]);
      if (taken) return res.status(409).json({ error: 'Этот номер уже занят' });
      await run('UPDATE clients SET phone = ? WHERE id = ?', [phone, req.clientId]);
    }

    await run(
      'UPDATE clients SET name = COALESCE(NULLIF(?, ""), name), email = ? WHERE id = ?',
      [name, email, req.clientId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('Profile update error:', e.message);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/client/bookings
   ───────────────────────────────────────────────────────────── */
router.get('/bookings', clientAuthMiddleware, async (req, res) => {
  try {
    const client = await get('SELECT phone FROM clients WHERE id = ?', [req.clientId]);
    const phoneDigits = (client?.phone || '').replace(/\D/g, '');
    const bookings = await query(
      `SELECT * FROM bookings
       WHERE client_id = ?
          OR (client_id IS NULL AND REGEXP_REPLACE(phone, '[^0-9]', '') = ?)
       ORDER BY date DESC, time_slot ASC`,
      [req.clientId, phoneDigits]
    );
    if (phoneDigits) {
      run(
        `UPDATE bookings SET client_id = ?
         WHERE client_id IS NULL AND REGEXP_REPLACE(phone, '[^0-9]', '') = ?`,
        [req.clientId, phoneDigits]
      ).catch(() => {});
    }
    res.json({ bookings });
  } catch (e) {
    console.error('Client bookings error:', e.message);
    res.status(500).json({ error: 'Ошибка загрузки записей' });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/client/bookings/:id/cancel
   ───────────────────────────────────────────────────────────── */
router.post('/bookings/:id/cancel', clientAuthMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Некорректный ID' });

  const booking = await get('SELECT * FROM bookings WHERE id = ?', [id]);
  if (!booking) return res.status(404).json({ error: 'Запись не найдена' });
  if (booking.client_id !== req.clientId) {
    return res.status(403).json({ error: 'Эта запись не принадлежит вам' });
  }
  if (booking.status === 'cancelled' || booking.status === 'done') {
    return res.status(400).json({ error: 'Запись уже завершена или отменена' });
  }

  await run('UPDATE bookings SET status = "cancelled" WHERE id = ?', [id]);
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/client/notifications
   ───────────────────────────────────────────────────────────── */
router.get('/notifications', clientAuthMiddleware, async (req, res) => {
  try {
    const notifications = await query(
      `SELECT n.id, n.type, n.message, n.is_read, n.created_at,
              b.date, b.time_slot, b.status as booking_status
       FROM client_notifications n
       LEFT JOIN bookings b ON b.id = n.booking_id
       WHERE n.client_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.clientId]
    );
    const unread = notifications.filter((n) => !n.is_read).length;
    res.json({ notifications, unread });
  } catch (e) {
    console.error('Notifications error:', e.message);
    res.status(500).json({ error: 'Ошибка загрузки уведомлений' });
  }
});

router.post('/notifications/read', clientAuthMiddleware, async (req, res) => {
  await run('UPDATE client_notifications SET is_read = 1 WHERE client_id = ?', [req.clientId]).catch(() => {});
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────────────────────
   Loyalty endpoint (lightweight, used by orbital widget)
   GET /api/client/loyalty
   ───────────────────────────────────────────────────────────── */
router.get('/loyalty', clientAuthMiddleware, async (req, res) => {
  const client = await get('SELECT visit_count FROM clients WHERE id = ?', [req.clientId]);
  if (!client) return res.status(404).json({ error: 'Клиент не найден' });
  const tier = tierForVisits(client.visit_count);
  const next = nextTier(tier.id);
  const medals = await query(
    'SELECT medal_id, earned_at FROM client_medals WHERE client_id = ? ORDER BY earned_at',
    [req.clientId]
  );
  res.json({
    visits: client.visit_count,
    tier,
    next,
    remaining: next ? Math.max(0, next.threshold - client.visit_count) : 0,
    progress: next
      ? Math.min(100, Math.round(((client.visit_count - tier.threshold) / (next.threshold - tier.threshold)) * 100))
      : 100,
    medals: medals.map((m) => m.medal_id),
    tiers: LOYALTY_TIERS,
  });
});

/* ─────────────────────────────────────────────────────────────
   Per-client web push
   ───────────────────────────────────────────────────────────── */
router.get('/push/vapid-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC });
});

router.post('/push/subscribe', clientAuthMiddleware, async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Некорректная подписка' });
  }
  try {
    await run(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, client_id, role)
       VALUES (?, ?, ?, ?, 'client')
       ON DUPLICATE KEY UPDATE
         p256dh = VALUES(p256dh),
         auth = VALUES(auth),
         client_id = VALUES(client_id),
         role = 'client'`,
      [endpoint, keys.p256dh, keys.auth, req.clientId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('Client push subscribe error:', e.message);
    res.status(500).json({ error: 'Ошибка сохранения подписки' });
  }
});

router.delete('/push/unsubscribe', clientAuthMiddleware, async (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) {
    await run('DELETE FROM push_subscriptions WHERE endpoint = ? AND client_id = ?', [endpoint, req.clientId]).catch(() => {});
  }
  res.json({ ok: true });
});

export default router;
