import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { get, run } from '../db.js';
import { sendPushToAll } from './admin.js';

const JWT_SECRET = process.env.JWT_SECRET || 'remnant-secret-change-me';

const router = Router();

const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || '';
const TG_CHAT_ID = process.env.TG_CHAT_ID || '';

async function notifyTelegram(booking) {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
  const text =
    `📋 Новая заявка REMNANT\n\n` +
    `👤 ${booking.name}\n` +
    `📞 ${booking.phone}\n` +
    (booking.email ? `📧 ${booking.email}\n` : '') +
    `📅 ${booking.date} · ${booking.time_slot}\n` +
    (booking.location ? `📍 ${booking.location}\n` : '') +
    (booking.style ? `🎨 ${booking.style}\n` : '') +
    (booking.size ? `📏 ${booking.size}\n` : '') +
    (booking.description ? `\n💬 ${booking.description}` : '');

  try {
    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (e) {
    console.error('Telegram notification failed:', e.message);
  }
}

router.post('/bookings', async (req, res) => {
  const { name, phone, email, location, style, size, description, date, time_slot } = req.body || {};

  if (!name || !phone || !date || !time_slot) {
    return res.status(400).json({ error: 'Заполните обязательные поля: имя, телефон, дата, время' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Неверный формат даты' });
  }

  // Attach client_id if request comes from logged-in client
  let clientId = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
      if (payload.type === 'client') clientId = payload.id;
    } catch {}
  }

  try {
    const existing = await get(
      `SELECT id FROM bookings WHERE date = ? AND time_slot = ? AND status != 'cancelled'`,
      [date, time_slot]
    );

    if (existing) {
      return res.status(409).json({ error: 'Этот слот уже занят. Выберите другое время.' });
    }

    const result = await run(
      `INSERT INTO bookings (name, phone, email, location, style, size, description, date, time_slot, client_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, email || '', location || '', style || '', size || '', description || '', date, time_slot, clientId]
    );

    const booking = { id: result.insertId, name, phone, email, location, style, size, description, date, time_slot };
    notifyTelegram(booking);
    sendPushToAll({
      type: 'new_booking',
      title: 'REMNANT — Новая запись',
      body: `${name} · ${date} в ${time_slot}`,
      id: result.insertId,
      date,
    });

    res.status(201).json({ ok: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при сохранении заявки' });
  }
});

export default router;
