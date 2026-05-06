import express from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';
import bookingsRouter from './routes/bookings.js';
import slotsRouter from './routes/slots.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import clientRouter from './routes/client.js';
import { initDatabase } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = process.env.NODE_ENV === 'production'
  ? join(__dirname, '..', 'dist')
  : join(__dirname, '..');
const app = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ── */
app.use(compression());
app.use(cors());
app.use(express.json());

/* ── Security headers ── */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

/* ── Static files with cache headers ── */
app.use(express.static(PUBLIC, {
  maxAge: '7d',
  etag: true,
  setHeaders(res, filePath) {
    if (/\.(html|css|js)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store, must-revalidate');
    }
  }
}));

// In dev mode, also serve public/ directory (images, GLB, textures)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(join(__dirname, '..', 'public'), { maxAge: '7d' }));
}

/* ── Rate limiting ── */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 мин
  max: 100,                   // 100 запросов с одного IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте через 15 минут.' },
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 час
  max: 5,                     // 5 записей в час с одного IP
  message: { error: 'Превышен лимит записей. Попробуйте позже.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,                    // 10 попыток входа за 15 мин
  message: { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
});

/* ── API routes ── */
app.use('/api', apiLimiter);
app.use('/api/bookings', bookingLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/client/login', authLimiter);
app.use('/api/client/register', authLimiter);
app.use('/api', slotsRouter);
app.use('/api', bookingsRouter);
app.use('/api', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/client', clientRouter);

/* ── Clean URLs: /master → master.html ── */
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.includes('.')) {
    return next();
  }
  const htmlPath = resolve(PUBLIC, req.path.slice(1) + '.html');
  if (existsSync(htmlPath)) {
    return res.sendFile(htmlPath);
  }
  next();
});

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`\n  REMNANT Booking API`);
      console.log(`  ───────────────────`);
      console.log(`  Сервер: http://localhost:${PORT}`);
      console.log(`  Админка: http://localhost:${PORT}/admin.html\n`);
    });
  } catch (error) {
    console.error('Ошибка инициализации базы данных:', error.message);
    process.exit(1);
  }
}

startServer();
