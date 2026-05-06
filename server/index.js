import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
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

/* ── JWT_SECRET hard requirement in production ── */
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in production.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.warn('[security] JWT_SECRET is not set — using dev fallback. Set it in .env before deploying.');
}

/* ── Middleware ── */
app.use(compression());

// CORS — restrict to configured origins; default to same-origin behavior
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    // Same-origin requests (no Origin header) and explicit allow-list
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0) return cb(null, true); // dev-friendly default
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
  credentials: false,
  maxAge: 600,
}));

// Body size limits — protect against payload-flood DoS
app.use(express.json({ limit: '256kb' }));

/* ── Security headers via helmet ── */
app.use(helmet({
  // Content Security Policy is defined explicitly below to permit fonts/3D/Three.js loads
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      'font-src': ["'self'", "https://fonts.gstatic.com", 'data:'],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'media-src': ["'self'", 'blob:', 'data:'],
      'connect-src': ["'self'", 'https:'],
      'worker-src': ["'self'", 'blob:'],
      'frame-ancestors': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  crossOriginEmbedderPolicy: false, // GLB/Three.js needs flexibility
  // HSTS only when behind HTTPS (typically reverse proxy). Disable in dev.
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
}));

app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
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

/* ── Rate limiting (DDoS / brute-force defense) ── */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте через 15 минут.' },
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => ipKeyGenerator(req),
  message: { error: 'Превышен лимит записей. Попробуйте позже.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Превышен лимит регистраций. Попробуйте через час.' },
});

/* ── API routes ── */
app.use('/api', apiLimiter);
app.use('/api/bookings', bookingLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/client/login', authLimiter);
app.use('/api/client/register', registerLimiter);
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

/* ── Error handler — don't leak stack in production ── */
app.use((err, req, res, _next) => {
  if (err?.message === 'CORS: origin not allowed') {
    return res.status(403).json({ error: 'CORS: запрещённый источник' });
  }
  console.error('[server error]', err?.message);
  const expose = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: 'Внутренняя ошибка сервера',
    ...(expose && err?.message ? { detail: err.message } : {}),
  });
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
