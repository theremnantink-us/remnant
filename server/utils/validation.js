// Lightweight input validators. No external deps to keep stack lean.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_DIGITS_RE = /^\d{10,15}$/;
const STATUS_VALUES = ['new', 'confirmed', 'cancelled', 'done'];
const STYLE_VALUES = ['fineline', 'graphics', 'geometry', 'ornament', 'other', ''];
const SIZE_VALUES = ['small', 'medium', 'large', ''];

export function isEmail(v) {
  return typeof v === 'string' && EMAIL_RE.test(v) && v.length <= 254;
}

export function normalizePhone(v) {
  if (typeof v !== 'string') return null;
  const digits = v.replace(/\D/g, '');
  if (!PHONE_DIGITS_RE.test(digits)) return null;
  // Russian numbers: convert leading 8 to 7
  const normalized = digits.length === 11 && digits.startsWith('8') ? '7' + digits.slice(1) : digits;
  return '+' + normalized;
}

export function isStrongPassword(v) {
  if (typeof v !== 'string' || v.length < 8 || v.length > 128) return false;
  // At least one letter and one digit
  return /[A-Za-zА-Яа-я]/.test(v) && /\d/.test(v);
}

export function isISODate(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + 'T00:00:00');
  return !Number.isNaN(d.getTime());
}

export function isTimeSlot(v) {
  return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
}

export function isBookingStatus(v) {
  return STATUS_VALUES.includes(v);
}

export function sanitizeText(v, maxLen = 1000) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, maxLen);
}

export function isStyle(v) {
  return v == null || STYLE_VALUES.includes(v);
}

export function isSize(v) {
  return v == null || SIZE_VALUES.includes(v);
}

// 6-digit numeric code for SMS/email confirmation
export function generateConfirmationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
