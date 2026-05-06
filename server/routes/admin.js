import { Router } from 'express';
import webpush from 'web-push';
import { authMiddleware } from './auth.js';
import { get, query, run, transaction } from '../db.js';

// VAPID keys — generated once, stable
const VAPID_PUBLIC  = 'BHzpv_sieYRh-IF5UCJ7Ac7vfOcEV8PgyC71_bGg10oOeytsfgE3tVtQgQ9V25SLKpzp3fQCOOjL89RL8qKTe-o';
const VAPID_PRIVATE = 'JN2E4NwQuDrKDqaE6Rt878J5ZHv6VEs3L-Dzbp321i8';
webpush.setVapidDetails('mailto:admin@remnant.studio', VAPID_PUBLIC, VAPID_PRIVATE);

export { VAPID_PUBLIC };

export async function sendPushToAll(payload) {
  try {
    const subs = await query('SELECT * FROM push_subscriptions');
    const dead = [];
    await Promise.allSettled(subs.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) dead.push(sub.endpoint);
      }
    }));
    for (const ep of dead) {
      await run('DELETE FROM push_subscriptions WHERE endpoint = ?', [ep]).catch(() => {});
    }
  } catch {}
}

const router = Router();
router.use(authMiddleware);

// ── Bookings ──────────────────────────────────────────

router.get('/bookings', async (req, res) => {
  const { status, date, from, to, limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT * FROM bookings WHERE 1=1';
  const params = [];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (date) { sql += ' AND date = ?'; params.push(date); }
  if (from) { sql += ' AND date >= ?'; params.push(from); }
  if (to) { sql += ' AND date <= ?'; params.push(to); }

  const lim = Math.max(1, Math.min(200, parseInt(limit) || 50));
  const off = Math.max(0, parseInt(offset) || 0);
  sql += ` ORDER BY date DESC, time_slot ASC LIMIT ${lim} OFFSET ${off}`;

  try {
    const rows = await query(sql, params);
    const totalRow = await get('SELECT COUNT(*) as c FROM bookings');
    res.json({ bookings: rows, total: totalRow?.c || 0 });
  } catch (error) {
    console.error('GET /bookings error:', error.message);
    res.status(500).json({ error: 'Ошибка загрузки заявок' });
  }
});

router.get('/bookings/:id', async (req, res) => {
  const row = await get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Заявка не найдена' });
  res.json(row);
});

router.patch('/bookings/:id', async (req, res) => {
  const { status } = req.body || {};
  if (!status || !['new', 'confirmed', 'cancelled', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Некорректный статус' });
  }
  const result = await run(
    `UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, req.params.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Заявка не найдена' });

  // Notify client if booking is linked to one
  try {
    const booking = await get('SELECT client_id, date, time_slot FROM bookings WHERE id = ?', [req.params.id]);
    if (booking?.client_id) {
      const STATUS_MSGS = {
        confirmed: `Ваша запись на ${booking.date} в ${booking.time_slot} подтверждена ✓`,
        cancelled: `Запись на ${booking.date} в ${booking.time_slot} отменена`,
        done: `Сеанс ${booking.date} в ${booking.time_slot} завершён. Спасибо, что выбрали REMNANT!`,
      };
      if (STATUS_MSGS[status]) {
        await run(
          'INSERT INTO client_notifications (client_id, booking_id, type, message) VALUES (?, ?, ?, ?)',
          [booking.client_id, req.params.id, 'status_change', STATUS_MSGS[status]]
        );
      }
    }
  } catch {}

  res.json({ ok: true });
});

router.delete('/bookings/:id', async (req, res) => {
  const result = await run('DELETE FROM bookings WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Заявка не найдена' });
  res.json({ ok: true });
});

// ── Stats ─────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const total = (await get('SELECT COUNT(*) as c FROM bookings'))?.c || 0;
    const byStatus = await query('SELECT status, COUNT(*) as count FROM bookings GROUP BY status');
    const upcoming = (
      await get(`SELECT COUNT(*) as c FROM bookings WHERE date >= CURDATE() AND status IN ('new','confirmed')`)
    )?.c || 0;
    res.json({ total, upcoming, byStatus });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки статистики' });
  }
});

// ── Calendar data (for admin calendar view) ───────────

router.get('/calendar', async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: 'Укажите year и month' });

  const y = Number(year);
  const m = Number(month);
  const daysInMonth = new Date(y, m, 0).getDate();
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const to = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  try {
    const availability = await query('SELECT * FROM availability ORDER BY day_of_week');
    const blocked_dates = await query(
      'SELECT date, reason FROM blocked_dates WHERE date BETWEEN ? AND ? ORDER BY date',
      [from, to]
    );
    const date_overrides = await query(
      'SELECT * FROM date_overrides WHERE date BETWEEN ? AND ? ORDER BY date',
      [from, to]
    );
    const booking_counts = await query(
      `SELECT date, COUNT(*) as count FROM bookings
       WHERE date BETWEEN ? AND ? AND status != 'cancelled'
       GROUP BY date`,
      [from, to]
    );
    res.json({ availability, blocked_dates, date_overrides, booking_counts });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки календаря' });
  }
});

// ── Weekly availability ───────────────────────────────

router.get('/availability', async (req, res) => {
  try {
    const availability = await query('SELECT * FROM availability ORDER BY day_of_week');
    const blocked_dates = await query('SELECT date, reason FROM blocked_dates ORDER BY date');
    res.json({ availability, blocked_dates });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки расписания' });
  }
});

router.put('/availability', async (req, res) => {
  const { schedule } = req.body || {};
  if (!Array.isArray(schedule)) return res.status(400).json({ error: 'Некорректные данные' });
  try {
    await transaction(async (tx) => {
      await tx.run('DELETE FROM availability');
      for (const s of schedule) {
        await tx.run(
          'INSERT INTO availability (day_of_week, start_time, end_time, slot_minutes) VALUES (?, ?, ?, ?)',
          [s.day_of_week, s.start_time, s.end_time, s.slot_minutes || 120]
        );
      }
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сохранения расписания' });
  }
});

// ── Blocked dates ─────────────────────────────────────

router.post('/blocked-dates', async (req, res) => {
  const { date, reason } = req.body || {};
  if (!date) return res.status(400).json({ error: 'Укажите дату' });
  try {
    await run('INSERT INTO blocked_dates (date, reason) VALUES (?, ?)', [date, reason || '']);
    res.json({ ok: true });
  } catch (e) {
    res.status(409).json({ error: 'Дата уже заблокирована' });
  }
});

router.delete('/blocked-dates/:date', async (req, res) => {
  await run('DELETE FROM blocked_dates WHERE date = ?', [req.params.date]);
  res.json({ ok: true });
});

// ── Date overrides (special hours for specific dates) ─

router.post('/date-overrides', async (req, res) => {
  const { date, start_time, end_time, slot_minutes } = req.body || {};
  if (!date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Укажите дату, начало и конец' });
  }
  try {
    await run(
      `INSERT INTO date_overrides (date, start_time, end_time, slot_minutes) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), end_time = VALUES(end_time), slot_minutes = VALUES(slot_minutes)`,
      [date, start_time, end_time, slot_minutes || 120]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сохранения' });
  }
});

router.delete('/date-overrides/:date', async (req, res) => {
  await run('DELETE FROM date_overrides WHERE date = ?', [req.params.date]);
  res.json({ ok: true });
});

// ── Web Push subscriptions ────────────────────────────

router.get('/push/vapid-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC });
});

router.post('/push/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Некорректная подписка' });
  }
  try {
    await run(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth)`,
      [endpoint, keys.p256dh, keys.auth]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка сохранения подписки' });
  }
});

router.delete('/push/unsubscribe', async (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) await run('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]).catch(() => {});
  res.json({ ok: true });
});

// ── Notifications (recent new bookings) ───────────────

router.get('/notifications', async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, name, phone, date, time_slot, style, size, status, created_at
       FROM bookings
       ORDER BY created_at DESC
       LIMIT 30`
    );
    res.json({ notifications: rows });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки уведомлений' });
  }
});

export default router;
