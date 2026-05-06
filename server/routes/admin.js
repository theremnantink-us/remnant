import { Router } from 'express';
import webpush from 'web-push';
import { authMiddleware } from './auth.js';
import { get, query, run, transaction } from '../db.js';
import { LOYALTY_TIERS, tierForVisits } from './client.js';
import { isISODate, isTimeSlot, isBookingStatus } from '../utils/validation.js';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC ||
  'BHzpv_sieYRh-IF5UCJ7Ac7vfOcEV8PgyC71_bGg10oOeytsfgE3tVtQgQ9V25SLKpzp3fQCOOjL89RL8qKTe-o';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE ||
  'JN2E4NwQuDrKDqaE6Rt878J5ZHv6VEs3L-Dzbp321i8';
webpush.setVapidDetails('mailto:admin@remnant.studio', VAPID_PUBLIC, VAPID_PRIVATE);

export { VAPID_PUBLIC };

// Send a push notification to a specific role or specific client
async function sendPushTo(filter, payload) {
  try {
    let subs;
    if (filter.role && !filter.client_id) {
      subs = await query('SELECT * FROM push_subscriptions WHERE role = ?', [filter.role]);
    } else if (filter.client_id) {
      subs = await query('SELECT * FROM push_subscriptions WHERE client_id = ?', [filter.client_id]);
    } else {
      subs = await query('SELECT * FROM push_subscriptions');
    }
    const dead = [];
    await Promise.allSettled(subs.map(async (sub) => {
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
  } catch (e) {
    console.error('[push] send error:', e.message);
  }
}

// Backwards-compat helper used by bookings router (admin-targeted broadcast)
export function sendPushToAdmins(payload) {
  return sendPushTo({ role: 'admin' }, payload);
}
export const sendPushToAll = sendPushToAdmins;
export function sendPushToClient(clientId, payload) {
  return sendPushTo({ client_id: clientId }, payload);
}

// Award medals for milestones; idempotent thanks to UNIQUE constraint.
async function awardMedalsForVisits(clientId, visits) {
  const milestones = [
    { id: 'first_visit', at: 1 },
    { id: 'three_visits', at: 3 },
    { id: 'five_visits', at: 5 },
    { id: 'ten_visits', at: 10 },
    { id: 'twenty_visits', at: 20 },
  ];
  const earned = [];
  for (const m of milestones) {
    if (visits >= m.at) {
      const result = await run(
        'INSERT IGNORE INTO client_medals (client_id, medal_id) VALUES (?, ?)',
        [clientId, m.id]
      );
      if (result.affectedRows > 0) earned.push(m.id);
    }
  }
  return earned;
}

// Update tier in DB and return change info
async function refreshClientTier(clientId, visits) {
  const tier = tierForVisits(visits);
  await run('UPDATE clients SET loyalty_tier = ? WHERE id = ?', [tier.id, clientId]);
  return tier;
}

const router = Router();
router.use(authMiddleware);

// ── Bookings ──────────────────────────────────────────

router.get('/bookings', async (req, res) => {
  const { status, date, from, to, limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT * FROM bookings WHERE 1=1';
  const params = [];

  if (status) {
    if (!isBookingStatus(status)) return res.status(400).json({ error: 'Некорректный статус' });
    sql += ' AND status = ?';
    params.push(status);
  }
  if (date) {
    if (!isISODate(date)) return res.status(400).json({ error: 'Некорректная дата' });
    sql += ' AND date = ?';
    params.push(date);
  }
  if (from) {
    if (!isISODate(from)) return res.status(400).json({ error: 'Некорректная дата from' });
    sql += ' AND date >= ?';
    params.push(from);
  }
  if (to) {
    if (!isISODate(to)) return res.status(400).json({ error: 'Некорректная дата to' });
    sql += ' AND date <= ?';
    params.push(to);
  }

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
  if (!isBookingStatus(status)) {
    return res.status(400).json({ error: 'Некорректный статус' });
  }

  // Read current state up-front (needed for transitions and side effects)
  const before = await get('SELECT id, status, client_id, date, time_slot FROM bookings WHERE id = ?', [req.params.id]);
  if (!before) return res.status(404).json({ error: 'Заявка не найдена' });

  await run(
    `UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, req.params.id]
  );

  // Loyalty side effects for transitions into 'done' (and rollback on undo)
  let earnedMedals = [];
  let newTier = null;
  if (before.client_id) {
    if (status === 'done' && before.status !== 'done') {
      const result = await run('UPDATE clients SET visit_count = visit_count + 1 WHERE id = ?', [before.client_id]);
      if (result.affectedRows) {
        const updated = await get('SELECT visit_count FROM clients WHERE id = ?', [before.client_id]);
        if (updated) {
          earnedMedals = await awardMedalsForVisits(before.client_id, updated.visit_count);
          newTier = await refreshClientTier(before.client_id, updated.visit_count);
        }
      }
    } else if (before.status === 'done' && status !== 'done') {
      // Rollback if admin reverts a 'done' booking
      await run('UPDATE clients SET visit_count = GREATEST(visit_count - 1, 0) WHERE id = ?', [before.client_id]);
      const updated = await get('SELECT visit_count FROM clients WHERE id = ?', [before.client_id]);
      if (updated) await refreshClientTier(before.client_id, updated.visit_count);
    }
  }

  // In-app notification + per-client push
  if (before.client_id) {
    const STATUS_MSGS = {
      confirmed: `Ваша запись на ${before.date} в ${before.time_slot} подтверждена ✓`,
      cancelled: `Запись на ${before.date} в ${before.time_slot} отменена`,
      done: `Сеанс ${before.date} в ${before.time_slot} завершён. Спасибо, что выбрали REMNANT!`,
    };
    const message = STATUS_MSGS[status];
    if (message) {
      try {
        await run(
          'INSERT INTO client_notifications (client_id, booking_id, type, message) VALUES (?, ?, ?, ?)',
          [before.client_id, req.params.id, 'status_change', message]
        );
      } catch (e) {
        console.error('[notify] insert failed:', e.message);
      }
      sendPushToClient(before.client_id, {
        type: 'status_change',
        title: 'REMNANT',
        body: message,
        url: '/cabinet.html',
      });
    }

    // If a new medal was earned, send a celebratory notification too
    for (const medalId of earnedMedals) {
      const text = `Поздравляем! Вы получили медаль «${medalId}». Уровень: ${newTier?.label || ''}`;
      await run(
        'INSERT INTO client_notifications (client_id, booking_id, type, message) VALUES (?, ?, ?, ?)',
        [before.client_id, req.params.id, 'medal', text]
      ).catch(() => {});
      sendPushToClient(before.client_id, {
        type: 'medal',
        title: 'REMNANT — новая медаль',
        body: text,
        url: '/cabinet.html',
      });
    }
  }

  res.json({ ok: true, earnedMedals, newTier });
});

router.delete('/bookings/:id', async (req, res) => {
  const result = await run('DELETE FROM bookings WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Заявка не найдена' });
  res.json({ ok: true });
});

// ── Stats ─────────────────────────────────────────────

router.get('/stats', async (_req, res) => {
  try {
    const total = (await get('SELECT COUNT(*) as c FROM bookings'))?.c || 0;
    const byStatus = await query('SELECT status, COUNT(*) as count FROM bookings GROUP BY status');
    const upcoming = (
      await get(`SELECT COUNT(*) as c FROM bookings WHERE date >= CURDATE() AND status IN ('new','confirmed')`)
    )?.c || 0;
    const totalClients = (await get('SELECT COUNT(*) as c FROM clients'))?.c || 0;
    res.json({ total, upcoming, byStatus, totalClients });
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
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    return res.status(400).json({ error: 'Некорректный год/месяц' });
  }
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

router.get('/availability', async (_req, res) => {
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
  for (const s of schedule) {
    if (!isTimeSlot(s.start_time) || !isTimeSlot(s.end_time)) {
      return res.status(400).json({ error: 'Некорректное время' });
    }
    const dow = Number(s.day_of_week);
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
      return res.status(400).json({ error: 'Некорректный день недели' });
    }
  }
  try {
    await transaction(async (tx) => {
      await tx.run('DELETE FROM availability');
      for (const s of schedule) {
        await tx.run(
          'INSERT INTO availability (day_of_week, start_time, end_time, slot_minutes) VALUES (?, ?, ?, ?)',
          [s.day_of_week, s.start_time, s.end_time, Number(s.slot_minutes) || 120]
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
  if (!isISODate(date)) return res.status(400).json({ error: 'Некорректная дата' });
  try {
    await run(
      `INSERT INTO blocked_dates (date, reason) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
      [date, reason || '']
    );
    res.json({ ok: true });
  } catch {
    res.status(409).json({ error: 'Не удалось сохранить блокировку даты' });
  }
});

router.delete('/blocked-dates/:date', async (req, res) => {
  if (!isISODate(req.params.date)) return res.status(400).json({ error: 'Некорректная дата' });
  await run('DELETE FROM blocked_dates WHERE date = ?', [req.params.date]);
  res.json({ ok: true });
});

// ── Date overrides (special hours for specific dates) ─

router.post('/date-overrides', async (req, res) => {
  const { date, start_time, end_time, slot_minutes } = req.body || {};
  if (!isISODate(date) || !isTimeSlot(start_time) || !isTimeSlot(end_time)) {
    return res.status(400).json({ error: 'Укажите корректные дату, начало и конец' });
  }
  try {
    await run(
      `INSERT INTO date_overrides (date, start_time, end_time, slot_minutes) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), end_time = VALUES(end_time), slot_minutes = VALUES(slot_minutes)`,
      [date, start_time, end_time, Number(slot_minutes) || 120]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сохранения' });
  }
});

router.delete('/date-overrides/:date', async (req, res) => {
  if (!isISODate(req.params.date)) return res.status(400).json({ error: 'Некорректная дата' });
  await run('DELETE FROM date_overrides WHERE date = ?', [req.params.date]);
  res.json({ ok: true });
});

// ── Web Push subscriptions (admin role) ───────────────

router.get('/push/vapid-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC });
});

router.post('/push/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Некорректная подписка' });
  }
  try {
    await run(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, role) VALUES (?, ?, ?, 'admin')
       ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth), role = 'admin'`,
      [endpoint, keys.p256dh, keys.auth]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('admin push subscribe error:', e.message);
    res.status(500).json({ error: 'Ошибка сохранения подписки' });
  }
});

router.delete('/push/unsubscribe', async (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) await run('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]).catch(() => {});
  res.json({ ok: true });
});

// ── Clients management (read-only listing) ───────────

router.get('/clients', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT c.id, c.name, c.phone, c.email, c.visit_count, c.loyalty_tier, c.created_at,
             (SELECT COUNT(*) FROM client_medals m WHERE m.client_id = c.id) AS medals
      FROM clients c
      ORDER BY c.created_at DESC
      LIMIT 500
    `);
    res.json({ clients: rows, tiers: LOYALTY_TIERS });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка загрузки клиентов' });
  }
});

// ── Notifications (recent new bookings, used for the bell) ──

router.get('/notifications', async (_req, res) => {
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
