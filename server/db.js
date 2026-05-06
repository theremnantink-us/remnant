import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'root';
const DB_NAME = process.env.DB_NAME || 'remnant_bd';

let pool = null;

function ensurePool() {
  if (pool) return;
  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 10,
  });
}

export async function query(sql, params = []) {
  ensurePool();
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function get(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function run(sql, params = []) {
  ensurePool();
  const [result] = await pool.execute(sql, params);
  return result;
}

export async function transaction(work) {
  ensurePool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const tx = {
      query: async (sql, params = []) => {
        const [rows] = await conn.execute(sql, params);
        return rows;
      },
      get: async (sql, params = []) => {
        const [rows] = await conn.execute(sql, params);
        return rows[0] || null;
      },
      run: async (sql, params = []) => {
        const [result] = await conn.execute(sql, params);
        return result;
      },
    };
    await work(tx);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function initDatabase() {
  const bootstrap = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
  });
  await bootstrap.execute(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrap.end();
  ensurePool();

  await run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255) DEFAULT '',
      location VARCHAR(255) DEFAULT '',
      style VARCHAR(100) DEFAULT '',
      size VARCHAR(50) DEFAULT '',
      description TEXT DEFAULT NULL,
      date DATE NOT NULL,
      time_slot VARCHAR(10) NOT NULL,
      status ENUM('new','confirmed','cancelled','done') NOT NULL DEFAULT 'new',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS availability (
      id INT AUTO_INCREMENT PRIMARY KEY,
      day_of_week TINYINT NOT NULL,
      start_time VARCHAR(5) NOT NULL DEFAULT '12:00',
      end_time VARCHAR(5) NOT NULL DEFAULT '21:00',
      slot_minutes INT NOT NULL DEFAULT 120,
      UNIQUE KEY uniq_day_of_week (day_of_week)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS blocked_dates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      reason VARCHAR(255) DEFAULT ''
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS date_overrides (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      start_time VARCHAR(5) NOT NULL,
      end_time VARCHAR(5) NOT NULL,
      slot_minutes INT NOT NULL DEFAULT 120
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const defaultAvail = await get('SELECT COUNT(*) AS c FROM availability');
  if (!defaultAvail || Number(defaultAvail.c) === 0) {
    for (let d = 0; d <= 6; d++) {
      await run(
        'INSERT INTO availability (day_of_week, start_time, end_time, slot_minutes) VALUES (?, ?, ?, ?)',
        [d, '12:00', '21:00', 120]
      );
    }
  }

  await run(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_endpoint (endpoint(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Clients table
  await run(`
    CREATE TABLE IF NOT EXISTS clients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255) DEFAULT '',
      password VARCHAR(255) NOT NULL,
      avatar_initials VARCHAR(5) DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Client notifications table
  await run(`
    CREATE TABLE IF NOT EXISTS client_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      booking_id INT NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'status_change',
      message TEXT NOT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Add client_id to bookings if not exists
  try {
    await run('ALTER TABLE bookings ADD COLUMN client_id INT DEFAULT NULL');
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }

  const adminExists = await get('SELECT id FROM admins WHERE username = ?', ['admin']);
  if (!adminExists) {
    const hash = bcrypt.hashSync('remnant2025', 10);
    await run('INSERT INTO admins (username, password) VALUES (?, ?)', ['admin', hash]);
  }

  const rootExists = await get('SELECT id FROM admins WHERE username = ?', ['root']);
  if (!rootExists) {
    const hash = bcrypt.hashSync('root', 10);
    await run('INSERT INTO admins (username, password) VALUES (?, ?)', ['root', hash]);
  }
}
