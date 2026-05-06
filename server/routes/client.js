import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, query, run } from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'remnant-secret-change-me';

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

// POST /api/client/register
router.post('/register', async (req, res) => {
  const { name, phone, email, password } = req.body || {};
  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Имя, телефон и пароль обязательны' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль минимум 6 символов' });
  }
  try {
    const existing = await get('SELECT id FROM clients WHERE phone = ?', [phone]);
    if (existing) return res.status(409).json({ error: 'Этот номер уже зарегистрирован' });
    const hash = bcrypt.hashSync(password, 10);
    const result = await run(
      'INSERT INTO clients (name, phone, email, password) VALUES (?, ?, ?, ?)',
      [name, phone, email || '', hash]
    );
    // Link existing bookings by normalized phone
    const digits = phone.replace(/\D/g, '');
    run(`UPDATE bookings SET client_id = ? WHERE client_id IS NULL AND REGEXP_REPLACE(phone, '[^0-9]', '') = ?`, [result.insertId, digits]).catch(() => {});
    const token = jwt.sign({ id: result.insertId, type: 'client' }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ ok: true, token, name, id: result.insertId });
  } catch (e) {
    console.error('Register error:', e.message);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

// POST /api/client/login
router.post('/login', async (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ error: 'Введите телефон и пароль' });
  const client = await get('SELECT * FROM clients WHERE phone = ?', [phone]);
  if (!client || !bcrypt.compareSync(password, client.password)) {
    return res.status(401).json({ error: 'Неверный телефон или пароль' });
  }
  // Link existing bookings by normalized phone
  const digits = client.phone.replace(/\D/g, '');
  run(`UPDATE bookings SET client_id = ? WHERE client_id IS NULL AND REGEXP_REPLACE(phone, '[^0-9]', '') = ?`, [client.id, digits]).catch(() => {});
  const token = jwt.sign({ id: client.id, type: 'client' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ ok: true, token, name: client.name, id: client.id });
});

// GET /api/client/profile
router.get('/profile', clientAuthMiddleware, async (req, res) => {
  const client = await get('SELECT id, name, phone, email, created_at FROM clients WHERE id = ?', [req.clientId]);
  if (!client) return res.status(404).json({ error: 'Профиль не найден' });
  res.json(client);
});

// PATCH /api/client/profile
router.patch('/profile', clientAuthMiddleware, async (req, res) => {
  const { name, email, password, newPassword } = req.body || {};
  try {
    if (newPassword) {
      if (newPassword.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
      if (!password) return res.status(400).json({ error: 'Введите текущий пароль' });
      const client = await get('SELECT password FROM clients WHERE id = ?', [req.clientId]);
      if (!bcrypt.compareSync(password, client.password)) {
        return res.status(400).json({ error: 'Неверный текущий пароль' });
      }
      const hash = bcrypt.hashSync(newPassword, 10);
      await run('UPDATE clients SET name = ?, email = ?, password = ? WHERE id = ?', [name || '', email || '', hash, req.clientId]);
    } else {
      await run('UPDATE clients SET name = ?, email = ? WHERE id = ?', [name || '', email || '', req.clientId]);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('Profile update error:', e.message);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

// GET /api/client/bookings
router.get('/bookings', clientAuthMiddleware, async (req, res) => {
  try {
    const client = await get('SELECT phone FROM clients WHERE id = ?', [req.clientId]);
    // Normalize phone to digits for comparison (handles +7(915)112-78-66 vs +79151127866)
    const phoneDigits = (client?.phone || '').replace(/\D/g, '');
    const bookings = await query(
      `SELECT * FROM bookings
       WHERE client_id = ?
          OR (client_id IS NULL AND REGEXP_REPLACE(phone, '[^0-9]', '') = ?)
       ORDER BY date DESC, time_slot ASC`,
      [req.clientId, phoneDigits]
    );
    // Lazily link any newly found bookings by normalized phone
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

// GET /api/client/notifications
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
    const unread = notifications.filter(n => !n.is_read).length;
    res.json({ notifications, unread });
  } catch (e) {
    console.error('Notifications error:', e.message);
    res.status(500).json({ error: 'Ошибка загрузки уведомлений' });
  }
});

// POST /api/client/notifications/read
router.post('/notifications/read', clientAuthMiddleware, async (req, res) => {
  await run('UPDATE client_notifications SET is_read = 1 WHERE client_id = ?', [req.clientId]).catch(() => {});
  res.json({ ok: true });
});

export default router;
