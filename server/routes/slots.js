import { Router } from 'express';
import { get, query } from '../db.js';

const router = Router();

function generateSlots(startTime, endTime, slotMinutes) {
  const slots = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let cur = sh * 60 + sm;
  const end = eh * 60 + em;
  while (cur + slotMinutes <= end) {
    const h = String(Math.floor(cur / 60)).padStart(2, '0');
    const m = String(cur % 60).padStart(2, '0');
    const h2 = String(Math.floor((cur + slotMinutes) / 60)).padStart(2, '0');
    const m2 = String((cur + slotMinutes) % 60).padStart(2, '0');
    slots.push({ start: `${h}:${m}`, end: `${h2}:${m2}` });
    cur += slotMinutes;
  }
  return slots;
}

router.get('/slots', async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Укажите дату в формате YYYY-MM-DD' });
  }

  try {
    const d = new Date(date + 'T00:00:00');
    const dow = d.getDay();

    const blocked = await get('SELECT 1 FROM blocked_dates WHERE date = ?', [date]);
    if (blocked) {
      return res.json({ date, slots: [], blocked: true });
    }

    const override = await get('SELECT * FROM date_overrides WHERE date = ?', [date]);
    const sched = override || await get('SELECT * FROM availability WHERE day_of_week = ?', [dow]);

    if (!sched) {
      return res.json({ date, slots: [], blocked: false, message: 'Нерабочий день' });
    }

    const allSlots = generateSlots(sched.start_time, sched.end_time, sched.slot_minutes);
    const bookedRows = await query(
      `SELECT time_slot FROM bookings WHERE date = ? AND status != 'cancelled'`,
      [date]
    );
    const booked = bookedRows.map((r) => r.time_slot);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = d.getTime() === today.getTime();
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const slots = allSlots.map((s) => {
      const [sh, sm] = s.start.split(':').map(Number);
      const slotMin = sh * 60 + sm;
      const isPast = isToday && slotMin <= nowMinutes;
      return { ...s, available: !booked.includes(s.start) && !isPast };
    });

    res.json({ date, slots, blocked: false });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки слотов' });
  }
});

router.get('/availability', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM availability ORDER BY day_of_week');
    const blocked = await query('SELECT date, reason FROM blocked_dates ORDER BY date');
    res.json({ availability: rows, blocked_dates: blocked });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки расписания' });
  }
});

export default router;
