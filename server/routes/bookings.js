import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { get, run } from '../db.js';
import { sendPushToAdmins } from './admin.js';
import {
  isISODate,
  isTimeSlot,
  normalizePhone,
  isEmail,
  sanitizeText,
  isStyle,
  isSize,
} from '../utils/validation.js';

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
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text }),
    });
  } catch (e) {
    console.error('Telegram notification failed:', e.message);
  }
}

router.post('/bookings', async (req, res) => {
  const body = req.body || {};
  const name = sanitizeText(body.name, 100);
  const phone = normalizePhone(body.phone);
  const email = sanitizeText(body.email, 254);
  const location = sanitizeText(body.location, 200);
  const style = sanitizeText(body.style, 50);
  const size = sanitizeText(body.size, 30);
  const description = sanitizeText(body.description ?? body.notes, 2000);
  const date = body.date;
  const time_slot = body.time_slot;

  if (!name || name.length < 2) return res.status(400).json({ error: 'Введите имя' });
  if (!phone) return res.status(400).json({ error: 'Некорректный номер телефона' });
  if (email && !isEmail(email)) return res.status(400).json({ error: 'Некорректный email' });
  if (!isISODate(date)) return res.status(400).json({ error: 'Некорректная дата' });
  if (!isTimeSlot(time_slot)) return res.status(400).json({ error: 'Некорректное время' });
  if (!isStyle(style)) return res.status(400).json({ error: 'Некорректный стиль' });
  if (!isSize(size)) return res.status(400).json({ error: 'Некорректный размер' });

  // Forbid bookings in the past
  const slotDate = new Date(date + 'T' + time_slot + ':00');
  if (slotDate.getTime() < Date.now() - 60_000) {
    return res.status(400).json({ error: 'Нельзя записаться в прошлое' });
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
      [name, phone, email, location, style, size, description, date, time_slot, clientId]
    );

    const booking = { id: result.insertId, name, phone, email, location, style, size, description, date, time_slot };
    notifyTelegram(booking);
    sendPushToAdmins({
      type: 'new_booking',
      title: 'REMNANT — Новая запись',
      body: `${name} · ${date} в ${time_slot}`,
      id: result.insertId,
      url: '/admin.html',
      date,
    });

    res.status(201).json({ ok: true, id: result.insertId });
  } catch (error) {
    console.error('Booking insert error:', error.message);
    res.status(500).json({ error: 'Ошибка при сохранении заявки' });
  }
});

export default router;
