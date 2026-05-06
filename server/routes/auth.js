import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, run } from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'remnant-secret-change-me';

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Введите логин и пароль' });
  }

  try {
    const admin = await get('SELECT * FROM admins WHERE username = ?', [username]);
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ ok: true, token });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

router.post('/auth/change-password', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    const { current_password, new_password } = req.body || {};

    const admin = await get('SELECT * FROM admins WHERE id = ?', [payload.id]);
    if (!admin || !bcrypt.compareSync(current_password, admin.password)) {
      return res.status(400).json({ error: 'Неверный текущий пароль' });
    }

    const hash = bcrypt.hashSync(new_password, 10);
    await run('UPDATE admins SET password = ? WHERE id = ?', [hash, payload.id]);
    res.json({ ok: true });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
