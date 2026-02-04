const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { Pool } = require("pg");

const app = express();
const adminApp = express();
const port = process.env.PORT || 3000;
const adminPort = process.env.ADMIN_PORT || 3001;
const jwtSecret = process.env.JWT_SECRET;
if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL environment variable.");
  process.exit(1);
}
if (!jwtSecret) {
  console.error("Missing JWT_SECRET environment variable.");
  process.exit(1);
}

const uploadDir = path.join(__dirname, "uploads");
const iconDir = path.join(__dirname, "public", "icons");
const publicUploadDir = path.join(__dirname, "public", "uploads");
const upload = multer({ dest: uploadDir });
const assetStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, publicUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const name = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
    cb(null, name);
  }
});
const assetUpload = multer({ storage: assetStorage });

const registerAttempts = new Map();
const loginFailures = new Map();
const registerFailures = new Map();
const REGISTER_WINDOW_MS = 10 * 60 * 1000;
const REGISTER_MAX_ATTEMPTS = 8;
const LOGIN_FAIL_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_FAIL_THRESHOLD = 6;
const REGISTER_FAIL_WINDOW_MS = 10 * 60 * 1000;
const REGISTER_FAIL_THRESHOLD = 8;
const AUTO_BLOCK_HOURS = 6;
const DEFAULT_LOGIN_BLOCK_MINUTES = AUTO_BLOCK_HOURS * 60;
let lastLoginLogCleanupKey = "";
let lastBackupDayKey = "";

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(iconDir, { recursive: true });
fs.mkdirSync(publicUploadDir, { recursive: true });

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});

// Public profile short URL support: /:username
// Keep this near the top to avoid any later middleware/route conflicts.
app.use((req, res, next) => {
  if (req.method !== "GET") {
    next();
    return;
  }
  const p = String(req.path || "");
  const match = p.match(/^\/([A-Za-z0-9]+)$/);
  if (!match) {
    next();
    return;
  }
  const reserved = new Set([
    "api",
    "public",
    "icons",
    "guide",
    "login",
    "register",
    "profile",
    "manifest",
    "service-worker",
    "icon",
    "favicon",
    "u"
  ]);
  const username = match[1];
  if (reserved.has(username.toLowerCase())) {
    next();
    return;
  }
  res.sendFile(path.join(__dirname, "index.html"));
});

// Explicit short URL route (same behavior as middleware above) for better compatibility
app.get("/:username", (req, res, next) => {
  const username = String(req.params.username || "").trim();
  if (!/^[A-Za-z0-9]+$/.test(username)) {
    next();
    return;
  }
  const reserved = new Set([
    "api",
    "public",
    "icons",
    "guide",
    "login",
    "register",
    "profile",
    "manifest",
    "service-worker",
    "icon",
    "favicon",
    "u"
  ]);
  if (reserved.has(username.toLowerCase())) {
    next();
    return;
  }
  res.sendFile(path.join(__dirname, "index.html"));
});
adminApp.use(express.json());
adminApp.use((err, req, res, next) => {
  if (err) {
    res.status(400).json({ error: "invalid_json" });
    return;
  }
  next();
});
adminApp.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined
});

pool.on("connect", (client) => {
  client.query("SET client_encoding TO 'UTF8'").catch(() => {});
});
pool.on("error", (err) => {
  console.error("Database connection error:", err.message);
});

async function initDb() {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invite_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT UNIQUE NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      used_by UUID REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      detail JSONB DEFAULT '{}'::jsonb,
      ip TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_login_attempts (
      username TEXT PRIMARY KEY,
      failed_count INTEGER DEFAULT 0,
      locked_until TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_login_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      settings JSONB DEFAULT '{}'::jsonb
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      is_private BOOLEAN DEFAULT FALSE,
      sort_index INTEGER DEFAULT 0,
      UNIQUE (user_id, name)
    )
  `);
  await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID`);
  await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE`);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'categories_user_id_fkey'
          AND table_name = 'categories'
      ) THEN
        ALTER TABLE categories
        ADD CONSTRAINT categories_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT,
      category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
      is_private BOOLEAN DEFAULT FALSE,
      is_dock BOOLEAN DEFAULT FALSE,
      sort_index INTEGER DEFAULT 0,
      position_index INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE links ADD COLUMN IF NOT EXISTS is_dock BOOLEAN DEFAULT FALSE`);
  await pool.query(`ALTER TABLE links ADD COLUMN IF NOT EXISTS position_index INTEGER`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blacklist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      reason TEXT,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS blacklist_type_value ON blacklist (type, value)"
  );

  await ensureAdminUser();

  const usersResult = await pool.query("SELECT id FROM users");
  for (const user of usersResult.rows) {
    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS total FROM links WHERE user_id = $1",
      [user.id]
    );
    if (countResult.rows[0] && countResult.rows[0].total === 0) {
      const defaults = [
        { title: "Google", url: "https://www.google.com" },
        { title: "Gmail", url: "https://mail.google.com" },
        { title: "Calendar", url: "https://calendar.google.com" },
        { title: "Drive", url: "https://drive.google.com" }
      ];
      for (let i = 0; i < defaults.length; i += 1) {
        const item = defaults[i];
        await pool.query(
          "INSERT INTO links (user_id, title, url, is_dock, sort_index, position_index) VALUES ($1, $2, $3, $4, $5, $6)",
          [user.id, item.title, item.url, true, i, i]
        );
      }
    }
    const dockMissing = await pool.query(
      "SELECT id FROM links WHERE user_id = $1 AND is_dock = TRUE AND position_index IS NULL ORDER BY sort_index ASC, created_at ASC",
      [user.id]
    );
    let position = 0;
    for (const row of dockMissing.rows) {
      if (position >= 6) {
        break;
      }
      await pool.query(
        "UPDATE links SET position_index = $1 WHERE id = $2 AND user_id = $3",
        [position, row.id, user.id]
      );
      position += 1;
    }
  }
}

function getFaviconUrl(linkUrl, size = 256) {
  try {
    const parsed = new URL(linkUrl);
    const target = parsed.href;
    return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(
      target
    )}&size=${size}`;
  } catch (err) {
    return null;
  }
}

function getSpecialIconUrl(linkUrl) {
  try {
    const parsed = new URL(linkUrl);
    const host = parsed.hostname.replace(/^www\./, "");
    const map = {
      "mail.google.com": "https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_48dp.png",
      "calendar.google.com":
        "https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png",
      "drive.google.com": "https://www.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png",
      "google.com": "https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png",
      "youtube.com": "https://www.youtube.com/s/desktop/7d4f3b7a/img/favicon_144x144.png"
    };
    return map[host] || null;
  } catch (err) {
    return null;
  }
}

async function downloadIcon(linkUrl, id) {
  const sizes = [256, 128];
  let buffer = null;
  const specialUrl = getSpecialIconUrl(linkUrl);
  if (specialUrl) {
    try {
      const response = await fetch(specialUrl);
      if (response.ok) {
        const nextBuffer = await response.buffer();
        if (nextBuffer && nextBuffer.length) {
          buffer = nextBuffer;
        }
      }
    } catch (err) {}
  }
  if (buffer) {
    const safeId = String(id).replace(/[^a-zA-Z0-9-]/g, "");
    const fileName = `${safeId}.png`;
    const filePath = path.join(iconDir, fileName);
    await fs.promises.writeFile(filePath, buffer);
    return `/icons/${fileName}`;
  }
  for (const size of sizes) {
    const faviconUrl = getFaviconUrl(linkUrl, size);
    if (!faviconUrl) {
      continue;
    }
    const response = await fetch(faviconUrl);
    if (!response.ok) {
      continue;
    }
    const nextBuffer = await response.buffer();
    if (nextBuffer && nextBuffer.length) {
      buffer = nextBuffer;
      break;
    }
  }
  if (!buffer) {
    try {
      const parsed = new URL(linkUrl);
      const host = parsed.hostname.replace(/^www\./, "");
      const fallbackUrl = `https://icon.horse/icon/${encodeURIComponent(host)}`;
      const response = await fetch(fallbackUrl);
      if (response.ok) {
        const nextBuffer = await response.buffer();
        if (nextBuffer && nextBuffer.length) {
          buffer = nextBuffer;
        }
      }
    } catch (err) {}
  }
  if (!buffer) {
    return null;
  }
  const safeId = String(id).replace(/[^a-zA-Z0-9-]/g, "");
  const fileName = `${safeId}.png`;
  const filePath = path.join(iconDir, fileName);
  await fs.promises.writeFile(filePath, buffer);
  return `/icons/${fileName}`;
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return header.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) {
      return acc;
    }
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = raw ? String(raw).split(",")[0].trim() : req.socket.remoteAddress || "";
  return ip.replace("::ffff:", "");
}

function getDeviceFingerprint(req) {
  const ua = req.headers["user-agent"] || "";
  return String(ua).slice(0, 400);
}

function isValidPublicUsername(value) {
  const text = String(value || "").trim();
  return text.length >= 2 && /^[A-Za-z0-9]+$/.test(text);
}

function ipToLong(ip) {
  const parts = String(ip).split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return null;
  }
  return (
    (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + (parts[3] << 0)
  ) >>> 0;
}

function cidrMatch(ip, cidr) {
  const [base, bitsRaw] = String(cidr).split("/");
  const bits = parseInt(bitsRaw, 10);
  if (!base || Number.isNaN(bits) || bits < 0 || bits > 32) {
    return false;
  }
  const ipLong = ipToLong(ip);
  const baseLong = ipToLong(base);
  if (ipLong === null || baseLong === null) {
    return false;
  }
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipLong & mask) === (baseLong & mask);
}

async function addBlacklistEntry(type, value, reason, hours) {
  if (!type || !value) return;
  const expiresAt = hours ? new Date(Date.now() + hours * 60 * 60 * 1000) : null;
  await pool.query(
    `INSERT INTO blacklist (type, value, reason, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (type, value)
     DO UPDATE SET reason = EXCLUDED.reason, expires_at = EXCLUDED.expires_at, created_at = NOW()`,
    [type, value, reason || "", expiresAt]
  );
}

async function isIpBlacklisted(ip) {
  if (!ip) return null;
  const result = await pool.query(
    "SELECT id, value, reason, expires_at FROM blacklist WHERE type = 'ip' AND (expires_at IS NULL OR expires_at > NOW())"
  );
  const rows = result.rows || [];
  for (const row of rows) {
    if (row.value === ip) {
      return row;
    }
    if (row.value && row.value.includes("/") && cidrMatch(ip, row.value)) {
      return row;
    }
  }
  return null;
}

async function isUserBlacklisted(userId, username) {
  const values = [];
  if (userId) values.push(String(userId));
  if (username) values.push(String(username));
  if (!values.length) return null;
  const result = await pool.query(
    "SELECT id, value, reason, expires_at FROM blacklist WHERE type = 'user' AND value = ANY($1::text[]) AND (expires_at IS NULL OR expires_at > NOW())",
    [values]
  );
  return result.rows[0] || null;
}

async function isDeviceBlacklisted(deviceId) {
  if (!deviceId) return null;
  const result = await pool.query(
    "SELECT id, value, reason, expires_at FROM blacklist WHERE type = 'device' AND value = $1 AND (expires_at IS NULL OR expires_at > NOW())",
    [String(deviceId)]
  );
  return result.rows[0] || null;
}

async function checkBlacklist(req, user, options = {}) {
  if (user) {
    try {
      const isAdmin = await isAdminUserId(user.id);
      if (isAdmin) return null;
    } catch (err) {}
  }
  const ip = getClientIp(req);
  const deviceId = getDeviceFingerprint(req);
  const userHit = user ? await isUserBlacklisted(user.id, user.username) : null;
  if (userHit) return userHit;
  if (!options.skipIp) {
    const ipHit = await isIpBlacklisted(ip);
    if (ipHit) return ipHit;
  }
  const deviceHit = await isDeviceBlacklisted(deviceId);
  if (deviceHit) return deviceHit;
  return null;
}

function recordFailure(map, ip, windowMs, threshold) {
  if (!ip) return { blocked: false };
  const now = Date.now();
  const entry = map.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count += 1;
  map.set(ip, entry);
  return { blocked: entry.count >= threshold, count: entry.count };
}

async function handleLoginFailure(req, reason) {
  const ip = getClientIp(req);
  const policy = await getSecurityPolicy();
  const threshold = Number(policy.loginFailThreshold) || LOGIN_FAIL_THRESHOLD;
  const result = recordFailure(loginFailures, ip, LOGIN_FAIL_WINDOW_MS, threshold);
  const minutes = Number(policy.autoBlockMinutes);
  if (result.blocked && Number.isFinite(minutes) && minutes > 0) {
    await addBlacklistEntry("ip", ip, reason || "login_failures", minutes / 60);
  }
  return result.blocked;
}

async function handleRegisterFailure(req, reason) {
  const ip = getClientIp(req);
  const result = recordFailure(
    registerFailures,
    ip,
    REGISTER_FAIL_WINDOW_MS,
    REGISTER_FAIL_THRESHOLD
  );
  if (result.blocked) {
    await addBlacklistEntry("ip", ip, reason || "register_failures", AUTO_BLOCK_HOURS);
  }
  return result.blocked;
}

async function getAdminSettingsRaw() {
  const adminId = await getAdminId();
  if (!adminId) return { adminId: null, settings: {} };
  const result = await pool.query("SELECT settings FROM user_settings WHERE user_id = $1", [
    adminId
  ]);
  const settings = result.rows[0] && result.rows[0].settings ? result.rows[0].settings : {};
  return { adminId, settings };
}

async function setAdminSettingsRaw(nextSettings) {
  const adminId = await getAdminId();
  if (!adminId) return null;
  await pool.query(
    "INSERT INTO user_settings (user_id, settings) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings",
    [adminId, nextSettings]
  );
  return adminId;
}

async function getSecurityPolicy() {
  const defaults = {
    loginFailThreshold: LOGIN_FAIL_THRESHOLD,
    autoBlockMinutes: DEFAULT_LOGIN_BLOCK_MINUTES,
    loginLogAutoCleanup: true,
    loginLogCleanupDay: 0
  };
  const { settings } = await getAdminSettingsRaw();
  const policy = settings && settings.securityPolicy ? settings.securityPolicy : {};
  return {
    ...defaults,
    ...policy
  };
}

async function updateSecurityPolicy(update) {
  const { settings } = await getAdminSettingsRaw();
  const next = { ...(settings || {}) };
  const current = next.securityPolicy && typeof next.securityPolicy === "object" ? next.securityPolicy : {};
  next.securityPolicy = { ...current, ...update };
  await setAdminSettingsRaw(next);
  return next.securityPolicy;
}

async function recordUserLogin(userId, action, req) {
  if (!userId) return;
  const ip = getClientIp(req);
  const ua = req.headers["user-agent"] || "";
  await pool.query(
    "INSERT INTO user_login_logs (user_id, action, ip, user_agent) VALUES ($1, $2, $3, $4)",
    [userId, action, ip, ua]
  );
}

async function cleanupLoginLogsIfNeeded() {
  const policy = await getSecurityPolicy();
  if (!policy.loginLogAutoCleanup) return;
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let targetDay = Number(policy.loginLogCleanupDay);
  if (!Number.isFinite(targetDay) || targetDay <= 0 || targetDay > 31) {
    targetDay = lastDayOfMonth;
  }
  if (now.getDate() !== targetDay) return;
  const key = `${now.getFullYear()}-${now.getMonth()}-${targetDay}`;
  if (lastLoginLogCleanupKey === key) return;
  await pool.query("DELETE FROM user_login_logs");
  lastLoginLogCleanupKey = key;
}

setInterval(() => {
  cleanupLoginLogsIfNeeded().catch(() => {});
}, 60 * 60 * 1000);

function checkRegisterRateLimit(req, res) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = registerAttempts.get(ip) || { count: 0, resetAt: now + REGISTER_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + REGISTER_WINDOW_MS;
  }
  entry.count += 1;
  registerAttempts.set(ip, entry);
  if (entry.count > REGISTER_MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.status(429).json({ error: "Too many attempts", retryAfter });
    return false;
  }
  return true;
}

function getBackupEmailConfig() {
  const enabledFlag = String(process.env.BACKUP_EMAIL_ENABLED || "").toLowerCase();
  const enabled = ["1", "true", "yes", "on"].includes(enabledFlag);
  const host = process.env.SMTP_HOST || "";
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.BACKUP_EMAIL_FROM || user;
  const to = process.env.BACKUP_EMAIL_TO || "";
  const hour = Number(process.env.BACKUP_EMAIL_HOUR || 3);
  const minute = Number(process.env.BACKUP_EMAIL_MINUTE || 0);
  return {
    enabled,
    host,
    port,
    user,
    pass,
    from,
    to,
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 3,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0
  };
}

function createMailTransport(config) {
  if (!config.host || !config.port || !config.user || !config.pass) return null;
  const secure = Number(config.port) === 465;
  return nodemailer.createTransport({
    host: config.host,
    port: Number(config.port),
    secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}

async function buildFullBackupPayload() {
  const users = await pool.query(
    "SELECT id, username, password_hash, email, is_active, avatar_url, created_at FROM users ORDER BY created_at ASC"
  );
  const settings = await pool.query("SELECT user_id, settings FROM user_settings");
  const categories = await pool.query(
    "SELECT id, user_id, name, is_private, sort_index FROM categories ORDER BY sort_index ASC, name ASC"
  );
  const links = await pool.query(
    "SELECT id, user_id, title, url, icon, category_id, is_private, is_dock, sort_index, position_index, created_at FROM links ORDER BY sort_index ASC, created_at ASC"
  );
  const invites = await pool.query(
    "SELECT id, code, created_by, created_at, expires_at, used_at, used_by FROM invite_codes ORDER BY created_at ASC"
  );
  const blacklist = await pool.query(
    "SELECT id, type, value, reason, expires_at, created_at FROM blacklist ORDER BY created_at ASC"
  );
  const adminLogs = await pool.query(
    "SELECT id, admin_id, action, detail, ip, created_at FROM admin_logs ORDER BY created_at ASC"
  );
  const adminAttempts = await pool.query(
    "SELECT username, failed_count, locked_until, updated_at FROM admin_login_attempts"
  );
  const loginLogs = await pool.query(
    "SELECT id, user_id, action, ip, user_agent, created_at FROM user_login_logs ORDER BY created_at ASC"
  );
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    users: users.rows,
    user_settings: settings.rows,
    categories: categories.rows,
    links: links.rows,
    invite_codes: invites.rows,
    blacklist: blacklist.rows,
    admin_logs: adminLogs.rows,
    admin_login_attempts: adminAttempts.rows,
    user_login_logs: loginLogs.rows
  };
}

async function sendDailyBackupEmail() {
  const config = getBackupEmailConfig();
  if (!config.enabled) return;
  if (!config.to) return;
  const now = new Date();
  if (now.getHours() !== config.hour || now.getMinutes() !== config.minute) return;
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  if (lastBackupDayKey === dayKey) return;
  const transporter = createMailTransport(config);
  if (!transporter) return;
  const payload = await buildFullBackupPayload();
  const filename = `mynavsite-backup-${now.toISOString().slice(0, 10)}.json`;
  await transporter.sendMail({
    from: config.from || config.user,
    to: config.to,
    subject: `MyNavSite 每日备份 ${now.toLocaleDateString("zh-CN")}`,
    text: "系统自动导出备份，直接用于全量恢复。",
    attachments: [
      {
        filename,
        content: JSON.stringify(payload, null, 2),
        contentType: "application/json"
      }
    ]
  });
  lastBackupDayKey = dayKey;
}

setInterval(() => {
  sendDailyBackupEmail().catch(() => {});
}, 60 * 1000);
app.use("/api", async (req, res, next) => {
  try {
    const authUser = await getAuthUser(req);
    req.authUser = authUser || null;
    const blocked = await checkBlacklist(req, authUser || null);
    if (blocked) {
      res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
      return;
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.use("/api", (req, res, next) => {
  // 管理员接口不执行黑名单拦截，确保管理员永远可登录。
  next();
});

async function checkRegistrationAccess() {
  const result = await pool.query("SELECT COUNT(*)::int AS total FROM users");
  const total = result.rows[0] ? Number(result.rows[0].total) : 0;
  if (total === 0) {
    return { allowed: true, reason: "bootstrap" };
  }
  return { allowed: false, reason: "closed" };
}

async function getRegisterWindow() {
  const adminId = await getAdminId();
  if (!adminId) {
    return { open: false, until: null };
  }
  const result = await pool.query("SELECT settings FROM user_settings WHERE user_id = $1", [
    adminId
  ]);
  const settings = result.rows[0] && result.rows[0].settings ? result.rows[0].settings : {};
  const until = settings.registerOpenUntil ? new Date(settings.registerOpenUntil) : null;
  if (!until || Number.isNaN(until.getTime())) {
    return { open: false, until: null };
  }
  return { open: Date.now() < until.getTime(), until };
}

async function setRegisterWindow(open, hours = 12) {
  const adminId = await getAdminId();
  if (!adminId) return null;
  const result = await pool.query("SELECT settings FROM user_settings WHERE user_id = $1", [
    adminId
  ]);
  const current = result.rows[0] && result.rows[0].settings ? result.rows[0].settings : {};
  const next = { ...current };
  if (open) {
    const until = new Date(Date.now() + hours * 60 * 60 * 1000);
    next.registerOpenUntil = until.toISOString();
  } else {
    delete next.registerOpenUntil;
  }
  await pool.query(
    "INSERT INTO user_settings (user_id, settings) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings",
    [adminId, next]
  );
  return next.registerOpenUntil || null;
}

async function getTurnstileConfig() {
  const siteKey = process.env.TURNSTILE_SITE_KEY || "";
  const secretKey = process.env.TURNSTILE_SECRET_KEY || "";
  const enabledFlag = String(process.env.TURNSTILE_ENABLED || "").toLowerCase();
  const enabled = enabledFlag === "true" || enabledFlag === "1" || enabledFlag === "yes";
  return {
    enabled: Boolean(enabled && siteKey && secretKey),
    siteKey,
    secretKey
  };
}

async function verifyTurnstile(token, ip) {
  const config = await getTurnstileConfig();
  if (!config.enabled) {
    return { ok: true, reason: "disabled" };
  }
  if (!config.secretKey) {
    return { ok: false, reason: "missing_secret" };
  }
  if (!token) {
    return { ok: false, reason: "missing_token" };
  }
  const params = new URLSearchParams();
  params.append("secret", config.secretKey);
  params.append("response", token);
  if (ip) {
    params.append("remoteip", ip);
  }
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });
  const data = await response.json().catch(() => ({}));
  return { ok: Boolean(data && data.success), data };
}

function getSecureCookieFlag(req) {
  const forwarded = req.headers["x-forwarded-proto"];
  if (req.secure || forwarded === "https") {
    return "Secure; ";
  }
  return "";
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: "7d" });
}

function signAdminToken(userId) {
  return jwt.sign({ sub: userId, admin: true }, jwtSecret, { expiresIn: "8h" });
}

function signAdminSetupToken(userId, secret) {
  return jwt.sign({ sub: userId, stage: "setup", secret }, jwtSecret, {
    expiresIn: "10m"
  });
}

function signUserSetupToken(userId, secret) {
  return jwt.sign({ sub: userId, stage: "user_setup", secret }, jwtSecret, {
    expiresIn: "10m"
  });
}

async function getAdminAuthUser(req) {
  const cookies = parseCookies(req);
  const token = cookies.admin_token;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (!payload || !payload.sub) return null;
    const isAdmin = await isAdminUserId(payload.sub);
    if (!isAdmin) return null;
    const result = await pool.query(
      "SELECT id, username, avatar_url FROM users WHERE id = $1",
      [payload.sub]
    );
    return result.rows[0] || null;
  } catch (err) {
    return null;
  }
}

async function requireAdmin(req, res, next) {
  try {
    const user = await getAdminAuthUser(req);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const blocked = await checkBlacklist(req, user);
    if (blocked) {
      res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
      return;
    }
    req.admin = user;
    next();
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
}

async function getAuthUser(req) {
  const cookies = parseCookies(req);
  const token = cookies.token;
  if (!token) {
    return null;
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    const userId = payload && payload.sub ? String(payload.sub) : null;
    if (!userId) {
      return null;
    }
    const result = await pool.query(
      "SELECT id, username, avatar_url FROM users WHERE id = $1",
      [userId]
    );
    return result.rows[0] || null;
  } catch (err) {
    return null;
  }
}

async function requireAuth(req, res, next) {
  console.log("User accessing API:", req.session && req.session.userId ? req.session.userId : "none");
  try {
    const user = await getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const blocked = await checkBlacklist(req, user);
    if (blocked) {
      res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
}

function normalizeSettings(settings, fallbackName) {
  const safe = settings && typeof settings === "object" ? settings : {};
  const contactSource = safe.contact && typeof safe.contact === "object" ? safe.contact : {};
  let contactItems = [];
  if (Array.isArray(contactSource.items)) {
    contactItems = contactSource.items
      .map((item) => ({
        platform: item && item.platform ? String(item.platform) : "",
        value: item && item.value ? String(item.value) : ""
      }))
      .filter((item) => item.platform || item.value);
  } else if (contactSource.platform || contactSource.value) {
    contactItems = [
      {
        platform: contactSource.platform ? String(contactSource.platform) : "",
        value: contactSource.value ? String(contactSource.value) : ""
      }
    ];
  }
  const contactEnabled = Boolean(contactSource.enabled) || contactItems.length > 0;
  return {
    siteName: safe.siteName || "我的 iOS 风格导航",
    siteLogo: safe.siteLogo || "",
    backgroundColor: safe.backgroundColor || "",
    iconScale: typeof safe.iconScale === "number" ? safe.iconScale : 100,
    userName: safe.userName || fallbackName || "Admin",
    userAvatar: safe.userAvatar || "",
    userTotpEnabled: Boolean(safe.userTotpEnabled),
    contact: {
      enabled: contactEnabled,
      items: contactItems
    }
  };
}

async function getSettingsForUser(userId, fallbackName) {
  const result = await pool.query(
    "SELECT settings FROM user_settings WHERE user_id = $1",
    [userId]
  );
  if (!result.rowCount) {
    return normalizeSettings({}, fallbackName);
  }
  return normalizeSettings(result.rows[0].settings, fallbackName);
}

async function getAdminTotpSecret(adminId) {
  const result = await pool.query(
    "SELECT settings FROM user_settings WHERE user_id = $1",
    [adminId]
  );
  const settings = result.rows[0] && result.rows[0].settings ? result.rows[0].settings : {};
  return settings.adminTotpSecret ? String(settings.adminTotpSecret) : "";
}

async function setAdminTotpSecret(adminId, secret) {
  await updateUserSettings(adminId, { adminTotpSecret: secret });
}

async function getUserTotpSettings(userId) {
  const result = await pool.query(
    "SELECT settings FROM user_settings WHERE user_id = $1",
    [userId]
  );
  const settings = result.rows[0] && result.rows[0].settings ? result.rows[0].settings : {};
  return {
    enabled: Boolean(settings.userTotpEnabled),
    secret: settings.userTotpSecret ? String(settings.userTotpSecret) : ""
  };
}

async function setUserTotpSecret(userId, secret) {
  await updateUserSettings(userId, { userTotpSecret: secret, userTotpEnabled: true });
}

async function clearUserTotp(userId) {
  await updateUserSettings(userId, { userTotpSecret: "", userTotpEnabled: false });
}

async function getAdminId() {
  const result = await pool.query("SELECT id FROM users ORDER BY created_at ASC LIMIT 1");
  return result.rows[0] ? result.rows[0].id : null;
}

async function isAdminUserId(userId) {
  if (!userId) return false;
  const adminId = await getAdminId();
  return adminId && String(adminId) === String(userId);
}

async function updateUserSettings(userId, updates) {
  const result = await pool.query(
    "SELECT settings FROM user_settings WHERE user_id = $1",
    [userId]
  );
  const current = result.rows[0] && result.rows[0].settings ? result.rows[0].settings : {};
  const next = { ...current, ...updates };
  await pool.query(
    "INSERT INTO user_settings (user_id, settings) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings",
    [userId, next]
  );
  return next;
}

async function logAdminAction(adminId, action, detail, req) {
  try {
    const ip = getClientIp(req);
    await pool.query(
      "INSERT INTO admin_logs (admin_id, action, detail, ip) VALUES ($1, $2, $3, $4)",
      [adminId || null, action, detail || {}, ip || null]
    );
  } catch (err) {
    // ignore log errors
  }
}

async function getAdminLockState(username) {
  const result = await pool.query(
    "SELECT failed_count, locked_until FROM admin_login_attempts WHERE username = $1",
    [username]
  );
  if (!result.rowCount) {
    return { locked: false, failed: 0 };
  }
  const row = result.rows[0];
  const lockedUntil = row.locked_until ? new Date(row.locked_until) : null;
  if (lockedUntil && lockedUntil > new Date()) {
    const remainingMs = lockedUntil.getTime() - Date.now();
    return { locked: true, remainingMs };
  }
  return { locked: false, failed: Number(row.failed_count) || 0 };
}

async function recordAdminLoginFailure(username) {
  const result = await pool.query(
    `
      INSERT INTO admin_login_attempts (username, failed_count, locked_until, updated_at)
      VALUES ($1, 1, NULL, NOW())
      ON CONFLICT (username)
      DO UPDATE SET
        failed_count = admin_login_attempts.failed_count + 1,
        locked_until = CASE
          WHEN admin_login_attempts.failed_count + 1 >= 5 THEN NOW() + INTERVAL '10 minutes'
          ELSE NULL
        END,
        updated_at = NOW()
      RETURNING failed_count, locked_until
    `,
    [username]
  );
  const row = result.rows[0];
  const lockedUntil = row.locked_until ? new Date(row.locked_until) : null;
  return {
    failed: Number(row.failed_count) || 0,
    lockedUntil
  };
}

async function clearAdminLoginFailures(username) {
  await pool.query("DELETE FROM admin_login_attempts WHERE username = $1", [username]);
}

async function getPublicUser() {
  const result = await pool.query(
    "SELECT id, username, avatar_url FROM users WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1"
  );
  return result.rows[0] || null;
}

async function getUserByUsername(username) {
  const clean = String(username || "").trim();
  if (!clean) {
    return null;
  }
  const result = await pool.query(
    "SELECT id, username, avatar_url FROM users WHERE username = $1 AND is_active = TRUE",
    [clean]
  );
  return result.rows[0] || null;
}

async function ensureAdminUser() {
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return;
  }
  const safeUsername = String(process.env.ADMIN_USERNAME).trim();
  const safePassword = String(process.env.ADMIN_PASSWORD);
  if (!safeUsername || !safePassword) {
    return;
  }
  const forceUpdate = String(process.env.ADMIN_FORCE_UPDATE || "").toLowerCase();
  const resetTotp = String(process.env.ADMIN_TOTP_RESET || "").toLowerCase();
  const shouldForceUpdate = ["1", "true", "yes", "on"].includes(forceUpdate);
  const shouldResetTotp = ["1", "true", "yes", "on"].includes(resetTotp);
  const adminId = await getAdminId();
  if (!adminId) {
    const hash = await bcrypt.hash(safePassword, 10);
    const inserted = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id",
      [safeUsername, hash]
    );
    const newAdminId = inserted.rows[0].id;
    await pool.query(
      "INSERT INTO user_settings (user_id, settings) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
      [
        newAdminId,
        {
          siteName: "我的 iOS 风格导航",
          backgroundColor: "",
          iconScale: 100,
          siteLogo: "",
          userName: safeUsername,
          userAvatar: ""
        }
      ]
    );
    return;
  }
  if (shouldForceUpdate) {
    const exists = await pool.query(
      "SELECT id FROM users WHERE username = $1 AND id <> $2",
      [safeUsername, adminId]
    );
    if (!exists.rowCount) {
      const hash = await bcrypt.hash(safePassword, 10);
      await pool.query("UPDATE users SET username = $1, password_hash = $2 WHERE id = $3", [
        safeUsername,
        hash,
        adminId
      ]);
      await updateUserSettings(adminId, { userName: safeUsername });
    }
  }
    if (shouldResetTotp) {
      await updateUserSettings(adminId, { adminTotpSecret: "" });
    }
    if (shouldForceUpdate || shouldResetTotp) {
      try {
        await pool.query("DELETE FROM admin_login_attempts WHERE username = $1", [safeUsername]);
        await pool.query(
          "DELETE FROM blacklist WHERE type = 'user' AND (value = $1 OR value = $2)",
          [String(adminId), safeUsername]
        );
      } catch (err) {}
    }
  }

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function bufferToBase32(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32ToBuffer(input) {
  const clean = String(input || "")
    .toUpperCase()
    .replace(/=+$/, "")
    .replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateTotpToken(secret, counter) {
  const key = base32ToBuffer(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter & 0xffffffff, 4);
  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, "0");
}

function verifyTotp(token, secret, window = 1) {
  const clean = String(token || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const step = 30;
  const counter = Math.floor(Date.now() / 1000 / step);
  for (let offset = -window; offset <= window; offset += 1) {
    if (generateTotpToken(secret, counter + offset) === clean) {
      return true;
    }
  }
  return false;
}

function buildOtpAuth(secret, label = "Admin") {
  const issuer = "MyNavSite";
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
    label
  )}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

async function ensureCategory(client, userId, name) {
  const clean = String(name || "").trim();
  if (!clean) {
    return null;
  }
  const result = await client.query(
    "INSERT INTO categories (user_id, name, sort_index) VALUES ($1, $2, 0) ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
    [userId, clean]
  );
  return result.rows[0].id;
}

async function getCategoryInfo(client, userId, name) {
  const clean = String(name || "").trim();
  if (!clean) {
    return { id: null, is_private: false };
  }
  const result = await client.query(
    "SELECT id, is_private FROM categories WHERE user_id = $1 AND name = $2",
    [userId, clean]
  );
  if (result.rowCount) {
    return { id: result.rows[0].id, is_private: Boolean(result.rows[0].is_private) };
  }
  const id = await ensureCategory(client, userId, clean);
  return { id, is_private: false };
}

async function getCategoryId(client, userId, name) {
  const info = await getCategoryInfo(client, userId, name);
  return info.id;
}

app.get("/api/public/:username", async (req, res) => {
  try {
    const username = String(req.params.username || "").trim();
    if (!username) {
      res.status(400).json({ error: "missing_username" });
      return;
    }
    if (!/^[A-Za-z0-9]+$/.test(username)) {
      res.status(400).json({ error: "invalid_username" });
      return;
    }
    const userResult = await pool.query(
      "SELECT id, username FROM users WHERE username = $1 AND is_active = TRUE",
      [username]
    );
    if (!userResult.rowCount) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const userId = userResult.rows[0].id;
    const categoriesResult = await pool.query(
      "SELECT id, name, is_private, sort_index FROM categories WHERE user_id = $1 AND is_private = FALSE ORDER BY sort_index ASC, name ASC",
      [userId]
    );
    const linksResult = await pool.query(
      `SELECT links.id, links.title, links.url, links.icon, links.is_private, links.is_dock, links.sort_index, links.position_index,
              categories.name AS category,
              COALESCE(categories.is_private, FALSE) AS category_private
       FROM links
       LEFT JOIN categories ON links.category_id = categories.id
       WHERE links.user_id = $1 AND links.is_private = FALSE AND COALESCE(categories.is_private, FALSE) = FALSE
       ORDER BY COALESCE(categories.sort_index, 9999) ASC,
                CASE WHEN links.is_dock THEN COALESCE(links.position_index, 9999) ELSE links.sort_index END ASC,
                links.created_at ASC`,
      [userId]
    );
    res.json({
      owner: userResult.rows[0].username,
      categories: categoriesResult.rows,
      icons: linksResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Database error", detail: err.message });
  }
});

app.get("/api/links", async (req, res) => {
  try {
    const authUser = req.authUser || (await getAuthUser(req));
    res.setHeader("X-Logged-In", authUser ? "1" : "0");
    let user = authUser;
    if (!user) {
      const queryUser = req.query.user;
      if (queryUser) {
        user = await getUserByUsername(queryUser);
        if (!user) {
          res.json([]);
          return;
        }
      } else {
        user = await getPublicUser();
      }
    }
    if (!user) {
      res.json([]);
      return;
    }
    const params = [user.id];
    let where = "WHERE links.user_id = $1";
    if (!authUser) {
      where += " AND links.is_private = FALSE AND COALESCE(categories.is_private, FALSE) = FALSE";
    }
    const result = await pool.query(
      `SELECT links.id, links.title, links.url, links.icon, links.is_private, links.is_dock, links.sort_index, links.position_index,
              categories.name AS category,
              COALESCE(categories.is_private, FALSE) AS category_private
       FROM links
       LEFT JOIN categories ON links.category_id = categories.id
       ${where}
       ORDER BY COALESCE(categories.sort_index, 9999) ASC,
                CASE WHEN links.is_dock THEN COALESCE(links.position_index, 9999) ELSE links.sort_index END ASC,
                links.created_at ASC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Database error", detail: err.message });
  }
});

app.post("/api/links/reorder", requireAuth, async (req, res) => {
  const items = req.body && Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) {
    res.status(400).json({ error: "No items" });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of items) {
      const id = String(item.id || "");
      const sortIndex = Number(item.sort_index);
      const categoryName = item.category ? String(item.category) : "";
      const isDock = Boolean(item.is_dock);
      const positionIndex = Number(item.position_index);
      if (!id || Number.isNaN(sortIndex)) {
        continue;
      }
      const categoryId = isDock ? null : await getCategoryId(client, req.user.id, categoryName);
      await client.query(
        "UPDATE links SET sort_index = $1, category_id = $2, is_dock = $3, position_index = $4 WHERE id = $5 AND user_id = $6",
        [sortIndex, categoryId, isDock, isDock && !Number.isNaN(positionIndex) ? positionIndex : null, id, req.user.id]
      );
    }
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
  }
});

app.post("/api/categories/reorder", requireAuth, async (req, res) => {
  const items = req.body && Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) {
    res.status(400).json({ error: "No categories" });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of items) {
      if (!item || !item.name) {
        continue;
      }
      const name = String(item.name).trim();
      if (!name) {
        continue;
      }
      await client.query(
        "INSERT INTO categories (user_id, name, sort_index) VALUES ($1, $2, $3) ON CONFLICT (user_id, name) DO UPDATE SET sort_index = EXCLUDED.sort_index",
        [req.user.id, name, Number(item.sort_index) || 0]
      );
    }
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
  }
});

app.post("/api/editing/save", requireAuth, async (req, res) => {
  const categories = Array.isArray(req.body?.categories) ? req.body.categories : [];
  const links = Array.isArray(req.body?.links) ? req.body.links : [];
  const renames = Array.isArray(req.body?.renames) ? req.body.renames : [];
  const linkTitles = Array.isArray(req.body?.linkTitles) ? req.body.linkTitles : [];
  if (!categories.length && !links.length && !renames.length && !linkTitles.length) {
    res.status(400).json({ error: "No changes" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const rename of renames) {
      const from = String(rename?.from || "").trim();
      const to = String(rename?.to || "").trim();
      if (!from || !to || from === to) {
        continue;
      }
      const source = await client.query(
        "SELECT id FROM categories WHERE user_id = $1 AND name = $2",
        [req.user.id, from]
      );
      if (!source.rowCount) {
        continue;
      }
      const target = await client.query(
        "SELECT id FROM categories WHERE user_id = $1 AND name = $2",
        [req.user.id, to]
      );
      if (target.rowCount) {
        await client.query(
          "UPDATE links SET category_id = $1 WHERE user_id = $2 AND category_id = $3",
          [target.rows[0].id, req.user.id, source.rows[0].id]
        );
        await client.query("DELETE FROM categories WHERE user_id = $1 AND id = $2", [
          req.user.id,
          source.rows[0].id
        ]);
      } else {
        await client.query(
          "UPDATE categories SET name = $1 WHERE user_id = $2 AND id = $3",
          [to, req.user.id, source.rows[0].id]
        );
      }
    }

    for (const item of categories) {
      const name = String(item?.name || "").trim();
      if (!name) {
        continue;
      }
      await client.query(
        "INSERT INTO categories (user_id, name, sort_index) VALUES ($1, $2, $3) ON CONFLICT (user_id, name) DO UPDATE SET sort_index = EXCLUDED.sort_index",
        [req.user.id, name, Number(item.sort_index) || 0]
      );
    }

    for (const item of links) {
      const id = String(item?.id || "");
      const sortIndex = Number(item?.sort_index);
      const categoryName = item?.category ? String(item.category).trim() : "";
      const isDock = Boolean(item?.is_dock);
      const positionIndex = Number(item?.position_index);
      if (!id || Number.isNaN(sortIndex)) {
        continue;
      }
      const categoryId = isDock ? null : await getCategoryId(client, req.user.id, categoryName);
      await client.query(
        "UPDATE links SET sort_index = $1, category_id = $2, is_dock = $3, position_index = $4 WHERE id = $5 AND user_id = $6",
        [sortIndex, categoryId, isDock, isDock && !Number.isNaN(positionIndex) ? positionIndex : null, id, req.user.id]
      );
    }

    for (const item of linkTitles) {
      const id = String(item?.id || "");
      const title = String(item?.title || "").trim();
      if (!id || !title) {
        continue;
      }
      await client.query("UPDATE links SET title = $1 WHERE id = $2 AND user_id = $3", [
        title,
        id,
        req.user.id
      ]);
    }

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
  }
});

app.get("/api/categories", requireAuth, async (req, res) => {
  try {
    const userId = (req.user && req.user.id) || (req.session && req.session.userId);
    if (!userId) {
      res.status(401).json({ error: "未登录" });
      return;
    }
    const result = await pool.query(
      "SELECT id, name, is_private FROM categories WHERE user_id = $1 ORDER BY sort_index ASC, name ASC",
      [userId]
    );
    res.json(result.rows.map((row) => ({ id: row.id, name: row.name, is_private: row.is_private })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/categories", requireAuth, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const isPrivate = Boolean(req.body?.is_private);
  if (!name) {
    res.status(400).json({ error: "Invalid name" });
    return;
  }
  const userId = (req.user && req.user.id) || (req.session && req.session.userId);
  if (!userId) {
    res.status(401).json({ error: "未登录" });
    return;
  }
  try {
    const result = await pool.query(
      "INSERT INTO categories (user_id, name, is_private, sort_index) VALUES ($1, $2, $3, 0) ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name, is_private",
      [userId, name, isPrivate]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/categories/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id || "");
  const name = req.body?.name !== undefined ? String(req.body?.name || "").trim() : null;
  const isPrivate =
    req.body?.is_private === undefined ? null : Boolean(req.body?.is_private);
  if (!id || (name !== null && !name)) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const userId = (req.user && req.user.id) || (req.session && req.session.userId);
  if (!userId) {
    res.status(401).json({ error: "未登录" });
    return;
  }
  try {
    const result = await pool.query(
      "UPDATE categories SET name = COALESCE($1, name), is_private = COALESCE($2, is_private) WHERE user_id = $3 AND id = $4 RETURNING id, name, is_private",
      [name, isPrivate, userId, id]
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/categories/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id || "");
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const userId = (req.user && req.user.id) || (req.session && req.session.userId);
  if (!userId) {
    res.status(401).json({ error: "未登录" });
    return;
  }
  const mode = req.query.mode === "delete" ? "delete" : "move";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (mode === "delete") {
      await client.query("DELETE FROM links WHERE user_id = $1 AND category_id = $2", [
        userId,
        id
      ]);
    } else {
      const fallbackId = await ensureCategory(client, userId, "未分类");
      await client.query(
        "UPDATE links SET category_id = $1 WHERE user_id = $2 AND category_id = $3",
        [fallbackId, userId, id]
      );
    }
    const result = await client.query("DELETE FROM categories WHERE user_id = $1 AND id = $2", [
      userId,
      id
    ]);
    await client.query("COMMIT");
    if (!result.rowCount) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get("/api/settings", async (req, res) => {
  try {
    const authUser = await getAuthUser(req);
    let user = authUser;
    const includeSecurity = Boolean(authUser);
    if (!user) {
      const queryUser = req.query.user;
      if (queryUser) {
        user = await getUserByUsername(queryUser);
        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }
      } else {
        user = await getPublicUser();
      }
    }
    if (!user) {
      res.json(normalizeSettings({}, "Admin"));
      return;
    }
    const settings = await getSettingsForUser(user.id, user.username);
    const payload = {
      ...settings,
      userAvatar: user.avatar_url || settings.userAvatar
    };
    const windowState = await getRegisterWindow();
    payload.registerOpenUntil = windowState.open && windowState.until
      ? windowState.until.toISOString()
      : "";
    if (!includeSecurity) {
      delete payload.userTotpEnabled;
    }
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/api/settings", requireAuth, async (req, res) => {
  const { siteName, backgroundColor, userName, iconScale, userTotpEnabled } = req.body || {};
  const updates = {};
  if (siteName !== undefined) updates.siteName = String(siteName);
  if (backgroundColor !== undefined) updates.backgroundColor = String(backgroundColor);
  if (iconScale !== undefined) {
    const scale = Math.max(0, Math.min(100, Number(iconScale)));
    if (!Number.isNaN(scale)) updates.iconScale = scale;
  }
  if (userName !== undefined) {
    const safeUsername = String(userName).trim();
    if (!safeUsername || safeUsername.length < 2) {
      res.status(400).json({ error: "invalid_username" });
      return;
    }
    updates.userName = safeUsername;
  }
  if (userTotpEnabled !== undefined) {
    const enabled = Boolean(userTotpEnabled);
    updates.userTotpEnabled = enabled;
    if (!enabled) {
      updates.userTotpSecret = "";
    }
  }
  if (!Object.keys(updates).length) {
    res.status(400).json({ error: "No updates" });
    return;
  }
  try {
    if (updates.userName) {
      const currentResult = await pool.query("SELECT username FROM users WHERE id = $1", [
        req.user.id
      ]);
      const currentName = currentResult.rows[0] ? currentResult.rows[0].username : "";
      if (String(currentName) !== updates.userName) {
        if (!isValidPublicUsername(updates.userName)) {
          res.status(400).json({ error: "invalid_username" });
          return;
        }
        const exists = await pool.query(
          "SELECT id FROM users WHERE username = $1 AND id <> $2",
          [updates.userName, req.user.id]
        );
        if (exists.rowCount) {
          res.status(409).json({ error: "username_exists" });
          return;
        }
        await pool.query("UPDATE users SET username = $1 WHERE id = $2", [
          updates.userName,
          req.user.id
        ]);
      }
    }
    await updateUserSettings(req.user.id, updates);
    res.json({ ok: true, userName: updates.userName });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/settings/logo", requireAuth, assetUpload.single("logo"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file" });
    return;
  }
  const logoPath = `/public/uploads/${req.file.filename}`;
  try {
    await updateUserSettings(req.user.id, { siteLogo: logoPath });
    res.json({ ok: true, path: logoPath });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/settings/avatar", requireAuth, assetUpload.single("avatar"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file" });
    return;
  }
  const avatarPath = `/public/uploads/${req.file.filename}`;
  try {
    await pool.query("UPDATE users SET avatar_url = $1 WHERE id = $2", [avatarPath, req.user.id]);
    await updateUserSettings(req.user.id, { userAvatar: avatarPath });
    res.json({ ok: true, path: avatarPath });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/me", async (req, res) => {
  try {
    const user = req.authUser || (await getAuthUser(req));
    if (!user) {
      res.json({ loggedIn: false });
      return;
    }
    const blocked = await checkBlacklist(req, user);
    if (blocked) {
      res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
      return;
    }
    const settings = await getSettingsForUser(user.id, user.username);
    const isAdmin = await isAdminUserId(user.id);
    res.json({
      loggedIn: true,
      username: user.username,
      isAdmin,
      userName: settings.userName,
      userAvatar: user.avatar_url || settings.userAvatar
    });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/public-config", async (req, res) => {
  try {
    const config = await getTurnstileConfig();
    res.json({
      turnstileEnabled: Boolean(config.enabled && config.siteKey),
      turnstileSiteKey: config.siteKey || ""
    });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

async function handleRegister(req, res) {
  const { username, password, email, inviteCode, code, company } = req.body || {};
  if (!username || !password || !email) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  if (company) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  try {
    const blocked = await checkBlacklist(req);
    if (blocked) {
      res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
      return;
    }
    if (!checkRegisterRateLimit(req, res)) {
      return;
    }
    const windowState = await getRegisterWindow();
    if (!windowState.open) {
      res.status(403).json({ error: "registration_closed" });
      return;
    }
    const turnstileToken = req.body?.turnstileToken || req.body?.cfToken || "";
    const turnstileResult = await verifyTurnstile(turnstileToken, getClientIp(req));
    if (!turnstileResult.ok) {
      if (await handleRegisterFailure(req, "turnstile_failed")) {
        res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
        return;
      }
      res.status(403).json({ error: "turnstile_failed", detail: turnstileResult.reason || "" });
      return;
    }
    const safeUsername = String(username).trim();
    const safeEmail = String(email).trim().toLowerCase();
    if (!isValidPublicUsername(safeUsername)) {
      if (await handleRegisterFailure(req, "invalid_username")) {
        res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
        return;
      }
      res.status(400).json({ error: "Username must contain only letters and numbers, length >= 2" });
      return;
    }
    if (String(password).length < 6) {
      if (await handleRegisterFailure(req, "weak_password")) {
        res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
        return;
      }
      res.status(400).json({ error: "Password too short" });
      return;
    }
    if (!safeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
      if (await handleRegisterFailure(req, "invalid_email")) {
        res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
        return;
      }
      res.status(400).json({ error: "Invalid email" });
      return;
    }
    const rawInvite = String(inviteCode || code || "").trim();
    if (!rawInvite) {
      if (await handleRegisterFailure(req, "invite_required")) {
        res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
        return;
      }
      res.status(400).json({ error: "invite_required" });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inviteResult = await client.query(
        "SELECT id FROM invite_codes WHERE code = $1 AND used_at IS NULL AND expires_at > NOW()",
        [rawInvite]
      );
      if (!inviteResult.rowCount) {
        await client.query("ROLLBACK");
        if (await handleRegisterFailure(req, "invalid_invite")) {
          res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
          return;
        }
        res.status(403).json({ error: "invalid_invite" });
        return;
      }
      const hash = await bcrypt.hash(password, 10);
      const userResult = await client.query(
        "INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id",
        [safeUsername, hash, safeEmail]
      );
      await client.query("INSERT INTO user_settings (user_id, settings) VALUES ($1, $2)", [
        userResult.rows[0].id,
        {
          siteName: "我的 iOS 风格导航",
          backgroundColor: "",
          iconScale: 100,
          siteLogo: "",
          userName: safeUsername,
          userAvatar: ""
        }
      ]);
      const updateInvite = await client.query(
        "UPDATE invite_codes SET used_at = NOW(), used_by = $1 WHERE id = $2 AND used_at IS NULL",
        [userResult.rows[0].id, inviteResult.rows[0].id]
      );
      if (!updateInvite.rowCount) {
        await client.query("ROLLBACK");
        if (await handleRegisterFailure(req, "invalid_invite")) {
          res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
          return;
        }
        res.status(403).json({ error: "invalid_invite" });
        return;
      }
      await client.query("COMMIT");
      await recordUserLogin(userResult.rows[0].id, "register", req);
      res.status(201).json({ ok: true, id: userResult.rows[0].id });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err && err.code === "23505") {
      res.status(409).json({ error: "Username already exists" });
      return;
    }
    res.status(500).json({ error: "Database error" });
  }
}

app.post("/register", handleRegister);
app.post("/api/auth/register", handleRegister);

app.get("/register.html", async (req, res) => {
  try {
    const windowState = await getRegisterWindow();
    if (!windowState.open) {
      res.status(404).send("Not found");
      return;
    }
    res.sendFile(path.join(__dirname, "register.html"));
  } catch (err) {
    res.status(500).send("Server error");
  }
});

async function handleLogin(req, res) {
  const { username, password, totp } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  try {
    const safeUsername = String(username).trim();
    const result = await pool.query(
      "SELECT id, password_hash, is_active FROM users WHERE username = $1",
      [safeUsername]
    );
    if (!result.rowCount) {
      if (await handleLoginFailure(req, "invalid_credentials")) {
        res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
        return;
      }
      const blocked = await checkBlacklist(req);
      if (blocked) {
        res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
        return;
      }
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const user = result.rows[0];
    const isAdmin = await isAdminUserId(user.id);
    if (!isAdmin) {
      const userBlocked = await checkBlacklist(req, user);
      if (userBlocked) {
        res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
        return;
      }
    }
    if (user.is_active === false) {
      if (isAdmin) {
        await pool.query("UPDATE users SET is_active = TRUE WHERE id = $1", [user.id]);
        user.is_active = true;
      } else {
      if (await handleLoginFailure(req, "account_disabled")) {
        res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
        return;
      }
      res.status(403).json({ error: "Account disabled" });
      return;
      }
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      if (await handleLoginFailure(req, "invalid_credentials")) {
        res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
        return;
      }
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const totpState = await getUserTotpSettings(user.id);
    if (totpState.enabled) {
      if (!totpState.secret) {
        const newSecret = bufferToBase32(crypto.randomBytes(20));
        const otpauth = buildOtpAuth(newSecret, safeUsername);
        const setupToken = signUserSetupToken(user.id, newSecret);
        const secure = getSecureCookieFlag(req);
        res.setHeader(
          "Set-Cookie",
          `user_setup=${setupToken}; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=600`
        );
        res.json({ setupRequired: true, secret: newSecret, otpauth });
        return;
      }
      if (!totp) {
        res.json({ totpRequired: true });
        return;
      }
      if (!verifyTotp(totp, totpState.secret)) {
        if (await handleLoginFailure(req, "invalid_totp")) {
          res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
          return;
        }
        res.status(401).json({ error: "invalid_totp" });
        return;
      }
    }
    await recordUserLogin(user.id, "login", req);
    const token = signToken(user.id);
    const secure = getSecureCookieFlag(req);
    res.setHeader(
      "Set-Cookie",
      `token=${token}; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=604800`
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
}

app.post("/login", handleLogin);
app.post("/api/login", handleLogin);

app.post("/api/auth/totp/setup", async (req, res) => {
  const { code } = req.body || {};
  const cookies = parseCookies(req);
  const token = cookies.user_setup;
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (!payload || payload.stage !== "user_setup") {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const userId = String(payload.sub || "");
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const secret = payload.secret;
    if (!secret || !verifyTotp(code, secret)) {
      res.status(401).json({ error: "invalid_totp" });
      return;
    }
    await setUserTotpSecret(userId, secret);
    const userToken = signToken(userId);
    const secure = getSecureCookieFlag(req);
    res.setHeader("Set-Cookie", [
      `token=${userToken}; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=604800`,
      `user_setup=; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=0`
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

  adminApp.post("/api/admin/login", async (req, res) => {
    const { username, password, totp } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }
    try {
      const safeUsername = String(username).trim();
      const result = await pool.query(
        "SELECT id, password_hash, is_active FROM users WHERE username = $1",
        [safeUsername]
      );
      if (!result.rowCount) {
        await handleLoginFailure(req, "admin_login_failed");
        await recordAdminLoginFailure(safeUsername);
        await logAdminAction(null, "admin_login_failed", { username: safeUsername }, req);
        const blocked = await checkBlacklist(req);
        if (blocked) {
          res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
          return;
        }
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const user = result.rows[0];
      const adminId = await getAdminId();
      const isAdminAccount = adminId && String(adminId) === String(user.id);
      if (!isAdminAccount) {
        const lockState = await getAdminLockState(safeUsername);
        if (lockState.locked) {
          const minutes = Math.ceil((lockState.remainingMs || 0) / 60000);
          res.status(429).json({ error: "admin_locked", retry_after_minutes: minutes });
          return;
        }
      }
      if (user.is_active === false) {
        if (isAdminAccount) {
          await pool.query("UPDATE users SET is_active = TRUE WHERE id = $1", [user.id]);
          user.is_active = true;
        } else {
          await handleLoginFailure(req, "admin_login_disabled");
          await recordAdminLoginFailure(safeUsername);
          await logAdminAction(user.id, "admin_login_failed", { reason: "disabled" }, req);
          res.status(403).json({ error: "Account disabled" });
          return;
        }
      }
      if (!isAdminAccount) {
        await handleLoginFailure(req, "admin_login_not_admin");
        await recordAdminLoginFailure(safeUsername);
        await logAdminAction(user.id, "admin_login_failed", { reason: "not_admin" }, req);
        res.status(403).json({ error: "forbidden" });
        return;
      }
      const blocked = await checkBlacklist(req, { id: user.id, username: safeUsername }, { skipIp: true });
      if (blocked) {
        res.status(403).json({ error: "blocked", message: "你的访问已被限制，请联系管理员" });
        return;
      }
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        if (!isAdminAccount) {
          await handleLoginFailure(req, "admin_login_bad_password");
          await recordAdminLoginFailure(safeUsername);
          await logAdminAction(user.id, "admin_login_failed", { reason: "bad_password" }, req);
        } else {
          await logAdminAction(user.id, "admin_login_failed", { reason: "bad_password" }, req);
        }
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
    const secret = await getAdminTotpSecret(user.id);
      if (secret) {
        if (!totp) {
          res.json({ totpRequired: true });
          return;
        }
        if (!verifyTotp(totp, secret)) {
          if (!isAdminAccount) {
            await recordAdminLoginFailure(safeUsername);
          }
          await logAdminAction(user.id, "admin_login_failed", { reason: "invalid_totp" }, req);
          res.status(401).json({ error: "invalid_totp" });
          return;
        }
      const token = signAdminToken(user.id);
      const secure = getSecureCookieFlag(req);
      res.setHeader(
        "Set-Cookie",
        `admin_token=${token}; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=28800`
      );
      await clearAdminLoginFailures(safeUsername);
      await logAdminAction(user.id, "admin_login_success", {}, req);
      res.json({ ok: true });
      return;
    }
    const newSecret = bufferToBase32(crypto.randomBytes(20));
    const otpauth = buildOtpAuth(newSecret, safeUsername);
    const setupToken = signAdminSetupToken(user.id, newSecret);
    const secure = getSecureCookieFlag(req);
    res.setHeader(
      "Set-Cookie",
      `admin_setup=${setupToken}; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=600`
    );
    await clearAdminLoginFailures(safeUsername);
    await logAdminAction(user.id, "admin_login_setup_required", {}, req);
    res.json({ setupRequired: true, secret: newSecret, otpauth });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.post("/api/admin/totp/setup", async (req, res) => {
  const { code } = req.body || {};
  const cookies = parseCookies(req);
  const token = cookies.admin_setup;
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (!payload || payload.stage !== "setup") {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const adminId = await getAdminId();
    if (!adminId || String(adminId) !== String(payload.sub)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const secret = payload.secret;
    if (!secret || !verifyTotp(code, secret)) {
      res.status(401).json({ error: "invalid_totp" });
      return;
    }
    await setAdminTotpSecret(adminId, secret);
    const adminToken = signAdminToken(adminId);
    const secure = getSecureCookieFlag(req);
    res.setHeader("Set-Cookie", [
      `admin_token=${adminToken}; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=28800`,
      `admin_setup=; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=0`
    ]);
    await logAdminAction(adminId, "admin_totp_enabled", {}, req);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.post("/api/admin/logout", (req, res) => {
  const secure = getSecureCookieFlag(req);
  getAdminAuthUser(req)
    .then((admin) => {
      if (admin) {
        logAdminAction(admin.id, "admin_logout", {}, req);
      }
    })
    .finally(() => {
      res.setHeader("Set-Cookie", [
        `admin_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; ${secure}`,
        `admin_setup=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; ${secure}`
      ]);
      res.json({ ok: true });
    });
});

adminApp.get("/api/admin/me", async (req, res) => {
  try {
    const admin = await getAdminAuthUser(req);
    if (!admin) {
      res.json({ loggedIn: false });
      return;
    }
    res.json({ loggedIn: true, username: admin.username });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.get("/api/admin/logs", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query?.page) || 1);
    const pageSize = Math.max(10, Math.min(100, Number(req.query?.pageSize) || 10));
    const offset = (page - 1) * pageSize;
    const countResult = await pool.query("SELECT COUNT(*)::int AS total FROM admin_logs");
    const total = countResult.rows[0] ? Number(countResult.rows[0].total) : 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const result = await pool.query(
      `SELECT id, admin_id, action, detail, ip, created_at
       FROM admin_logs
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );
    res.json({ items: result.rows, page, totalPages });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/logout", (req, res) => {
  const secure = getSecureCookieFlag(req);
  res.setHeader(
    "Set-Cookie",
    `token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; ${secure}`
  );
  res.json({ ok: true });
});

app.post("/api/auth/update-password", requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  try {
    const result = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [req.user.id]
    );
    if (!result.rowCount) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const ok = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
    if (!ok) {
      res.status(401).json({ error: "Incorrect password" });
      return;
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.get("/api/admin/invites", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, code, expires_at, used_at FROM invite_codes WHERE used_at IS NULL ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.post("/api/admin/invites", requireAdmin, async (req, res) => {
  try {
    const count = Math.max(1, Math.min(50, Number(req.body?.count) || 1));
    const expiresHours = Math.max(1, Math.min(168, Number(req.body?.expiresHours) || 12));
    const codes = [];
    for (let i = 0; i < count; i += 1) {
      const code = crypto.randomBytes(5).toString("hex").toUpperCase();
      const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000);
      const result = await pool.query(
        "INSERT INTO invite_codes (code, created_by, expires_at) VALUES ($1, $2, $3) RETURNING id, code, expires_at",
        [code, req.admin.id, expiresAt.toISOString()]
      );
      codes.push(result.rows[0]);
    }
    await logAdminAction(req.admin.id, "invite_generate", { count, expiresHours }, req);
    res.json({ ok: true, codes });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.delete("/api/admin/invites/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await pool.query("DELETE FROM invite_codes WHERE id = $1", [id]);
    await logAdminAction(req.admin.id, "invite_revoke", { id }, req);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.post("/api/admin/register-window", requireAdmin, async (req, res) => {
  try {
    const open = Boolean(req.body?.open);
    const hours = Math.max(1, Math.min(48, Number(req.body?.hours) || 12));
    const until = await setRegisterWindow(open, hours);
    await logAdminAction(req.admin.id, "register_window", { open, hours }, req);
    res.json({ ok: true, open, until });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const adminId = await getAdminId();
    const result = await pool.query(
      `
        SELECT
          u.id,
          u.username,
          u.email,
          u.is_active,
          u.created_at,
          COALESCE((s.settings->>'userTotpEnabled')::boolean, false) AS totp_enabled
        FROM users u
        LEFT JOIN user_settings s ON s.user_id = u.id
        ORDER BY u.created_at ASC
      `
    );
    const users = result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      is_active: row.is_active,
      created_at: row.created_at,
      totp_enabled: Boolean(row.totp_enabled),
      is_admin: adminId && String(row.id) === String(adminId)
    }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.post("/api/admin/users/:id/disable", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const adminId = await getAdminId();
    if (!id || (adminId && String(adminId) === id)) {
      res.status(400).json({ error: "Invalid user" });
      return;
    }
    await pool.query("UPDATE users SET is_active = FALSE WHERE id = $1", [id]);
    await logAdminAction(req.admin.id, "user_disable", { id }, req);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.post("/api/admin/users/:id/enable", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ error: "Invalid user" });
      return;
    }
    await pool.query("UPDATE users SET is_active = TRUE WHERE id = $1", [id]);
    await logAdminAction(req.admin.id, "user_enable", { id }, req);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.post("/api/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const adminId = await getAdminId();
    if (!id || (adminId && String(adminId) === id)) {
      res.status(400).json({ error: "Invalid user" });
      return;
    }
    const newPassword =
      String(req.body?.password || "") ||
      crypto.randomBytes(6).toString("hex");
    if (newPassword.length < 6) {
      res.status(400).json({ error: "Password too short" });
      return;
    }
    const hash = await bcrypt.hash(newPassword, 10);
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, id]);
      await logAdminAction(
        req.admin.id,
        "user_reset_password",
        { id, password: req.body?.password ? "custom" : newPassword },
        req
      );
      res.json({ ok: true, password: req.body?.password ? null : newPassword });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.post("/api/admin/users/:id/clear-2fa", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ error: "Invalid user" });
      return;
    }
    await clearUserTotp(id);
    await logAdminAction(req.admin.id, "user_clear_2fa", { id }, req);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.get("/api/admin/contact/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ error: "Invalid user" });
      return;
    }
    const settingsResult = await pool.query(
      "SELECT settings FROM user_settings WHERE user_id = $1",
      [id]
    );
    const settings =
      settingsResult.rows[0] && settingsResult.rows[0].settings
        ? settingsResult.rows[0].settings
        : {};
    const contact = settings.contact || {};
    let items = [];
    if (Array.isArray(contact.items)) {
      items = contact.items
        .map((item) => ({
          platform: item && item.platform ? String(item.platform) : "",
          value: item && item.value ? String(item.value) : ""
        }))
        .filter((item) => item.platform || item.value);
    } else if (contact.platform || contact.value) {
      items = [
        {
          platform: contact.platform ? String(contact.platform) : "",
          value: contact.value ? String(contact.value) : ""
        }
      ];
    }
    res.json({
      enabled: Boolean(contact.enabled),
      items
    });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.post("/api/admin/contact", requireAdmin, async (req, res) => {
  try {
    const { userId, applyAll, enabled, items, platform, value } = req.body || {};
    const legacyItems =
      platform || value
        ? [
            {
              platform: platform ? String(platform) : "",
              value: value ? String(value) : ""
            }
          ]
        : [];
    const safeItems = Array.isArray(items)
      ? items
          .map((item) => ({
            platform: item && item.platform ? String(item.platform) : "",
            value: item && item.value ? String(item.value) : ""
          }))
          .filter((item) => item.platform || item.value)
      : legacyItems;
    const contact = {
      enabled: Boolean(enabled),
      items: safeItems
    };
    if (applyAll) {
      const usersResult = await pool.query("SELECT id FROM users");
      for (const row of usersResult.rows) {
        await updateUserSettings(row.id, { contact });
      }
      await logAdminAction(req.admin.id, "contact_update_all", contact, req);
      res.json({ ok: true });
      return;
    }
    if (!userId) {
      res.status(400).json({ error: "Invalid user" });
      return;
    }
    await updateUserSettings(String(userId), { contact });
    await logAdminAction(req.admin.id, "contact_update_user", { userId, contact }, req);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.get("/api/admin/blacklist", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, type, value, reason, expires_at, created_at FROM blacklist WHERE expires_at IS NULL OR expires_at > NOW() ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.post("/api/admin/blacklist", requireAdmin, async (req, res) => {
  try {
    const { type, value, reason, hours } = req.body || {};
    const safeType = String(type || "").trim();
    const safeValue = String(value || "").trim();
    if (!safeType || !safeValue) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }
    const expiresHours = hours !== undefined && hours !== null && String(hours) !== ""
      ? Math.max(1, Number(hours))
      : null;
    await addBlacklistEntry(safeType, safeValue, reason || "", expiresHours);
    await logAdminAction(req.admin.id, "blacklist_add", { type: safeType, value: safeValue }, req);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.delete("/api/admin/blacklist/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ error: "Invalid blacklist" });
      return;
    }
    await pool.query("DELETE FROM blacklist WHERE id = $1", [id]);
    await logAdminAction(req.admin.id, "blacklist_remove", { id }, req);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.get("/api/admin/security-policy", requireAdmin, async (req, res) => {
  try {
    const policy = await getSecurityPolicy();
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.post("/api/admin/security-policy", requireAdmin, async (req, res) => {
  try {
    const { loginFailThreshold, autoBlockMinutes, loginLogAutoCleanup, loginLogCleanupDay } =
      req.body || {};
    const update = {};
    if (loginFailThreshold !== undefined) {
      const value = Math.max(1, Number(loginFailThreshold));
      if (!Number.isNaN(value)) update.loginFailThreshold = value;
    }
    if (autoBlockMinutes !== undefined) {
      const value = Math.max(0, Number(autoBlockMinutes));
      if (!Number.isNaN(value)) update.autoBlockMinutes = value;
    }
    if (loginLogAutoCleanup !== undefined) {
      update.loginLogAutoCleanup = Boolean(loginLogAutoCleanup);
    }
    if (loginLogCleanupDay !== undefined) {
      const value = Number(loginLogCleanupDay);
      if (!Number.isNaN(value)) update.loginLogCleanupDay = value;
    }
    const policy = await updateSecurityPolicy(update);
    await logAdminAction(req.admin.id, "security_policy_update", update, req);
    res.json({ ok: true, policy });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.get("/api/admin/backup/export-all", requireAdmin, async (req, res) => {
  try {
    const payload = await buildFullBackupPayload();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"mynavsite-full-backup-${Date.now()}.json\"`
    );
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.post(
  "/api/admin/backup/import-all",
  requireAdmin,
  upload.single("backup"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file" });
      return;
    }
    try {
      const raw = await fs.promises.readFile(req.file.path, "utf8");
      const data = JSON.parse(raw);
      const users = Array.isArray(data?.users) ? data.users : [];
      const settings = Array.isArray(data?.user_settings) ? data.user_settings : [];
      const categories = Array.isArray(data?.categories) ? data.categories : [];
      const links = Array.isArray(data?.links) ? data.links : [];
      const invites = Array.isArray(data?.invite_codes) ? data.invite_codes : [];
      const blacklist = Array.isArray(data?.blacklist) ? data.blacklist : [];
      const adminLogs = Array.isArray(data?.admin_logs) ? data.admin_logs : [];
      const adminAttempts = Array.isArray(data?.admin_login_attempts)
        ? data.admin_login_attempts
        : [];
      const loginLogs = Array.isArray(data?.user_login_logs) ? data.user_login_logs : [];

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("DELETE FROM links");
        await client.query("DELETE FROM categories");
        await client.query("DELETE FROM user_settings");
        await client.query("DELETE FROM invite_codes");
        await client.query("DELETE FROM blacklist");
        await client.query("DELETE FROM admin_logs");
        await client.query("DELETE FROM admin_login_attempts");
        await client.query("DELETE FROM user_login_logs");
        await client.query("DELETE FROM users");

        for (const user of users) {
          await client.query(
            "INSERT INTO users (id, username, password_hash, email, is_active, avatar_url, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [
              user.id,
              user.username,
              user.password_hash,
              user.email || null,
              user.is_active !== false,
              user.avatar_url || null,
              user.created_at || new Date().toISOString()
            ]
          );
        }

        for (const item of settings) {
          await client.query(
            "INSERT INTO user_settings (user_id, settings) VALUES ($1, $2)",
            [item.user_id, item.settings || {}]
          );
        }

        for (const item of categories) {
          await client.query(
            "INSERT INTO categories (id, user_id, name, is_private, sort_index) VALUES ($1, $2, $3, $4, $5)",
            [
              item.id,
              item.user_id,
              item.name,
              Boolean(item.is_private),
              Number(item.sort_index) || 0
            ]
          );
        }

        for (const item of links) {
          await client.query(
            "INSERT INTO links (id, user_id, title, url, icon, category_id, is_private, is_dock, sort_index, position_index, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
            [
              item.id,
              item.user_id,
              item.title,
              item.url,
              item.icon || null,
              item.category_id || null,
              Boolean(item.is_private),
              Boolean(item.is_dock),
              Number(item.sort_index) || 0,
              item.position_index !== undefined && item.position_index !== null
                ? Number(item.position_index)
                : null,
              item.created_at || new Date().toISOString()
            ]
          );
        }

        for (const item of invites) {
          await client.query(
            "INSERT INTO invite_codes (id, code, created_by, created_at, expires_at, used_at, used_by) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [
              item.id,
              item.code,
              item.created_by || null,
              item.created_at || new Date().toISOString(),
              item.expires_at,
              item.used_at || null,
              item.used_by || null
            ]
          );
        }

        for (const item of blacklist) {
          await client.query(
            "INSERT INTO blacklist (id, type, value, reason, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
            [
              item.id,
              item.type,
              item.value,
              item.reason || "",
              item.expires_at || null,
              item.created_at || new Date().toISOString()
            ]
          );
        }

        for (const item of adminLogs) {
          await client.query(
            "INSERT INTO admin_logs (id, admin_id, action, detail, ip, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
            [
              item.id,
              item.admin_id || null,
              item.action,
              item.detail || {},
              item.ip || null,
              item.created_at || new Date().toISOString()
            ]
          );
        }

        for (const item of adminAttempts) {
          await client.query(
            "INSERT INTO admin_login_attempts (username, failed_count, locked_until, updated_at) VALUES ($1, $2, $3, $4)",
            [
              item.username,
              Number(item.failed_count) || 0,
              item.locked_until || null,
              item.updated_at || new Date().toISOString()
            ]
          );
        }

        for (const item of loginLogs) {
          await client.query(
            "INSERT INTO user_login_logs (id, user_id, action, ip, user_agent, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
            [
              item.id,
              item.user_id || null,
              item.action,
              item.ip || null,
              item.user_agent || null,
              item.created_at || new Date().toISOString()
            ]
          );
        }

        await client.query("COMMIT");
        res.json({ ok: true });
      } catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: "Database error" });
      } finally {
        client.release();
      }
    } catch (err) {
      res.status(400).json({ error: "Invalid JSON" });
    } finally {
      fs.unlink(req.file.path, () => {});
    }
  }
);

adminApp.get("/api/admin/user-logins", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize) || 10));
    const userId = String(req.query.userId || "").trim();
    const params = [];
    let where = "";
    if (userId) {
      params.push(userId);
      where = "WHERE l.user_id = $1";
    }
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM user_login_logs l ${where}`,
      params
    );
    const total = countResult.rows[0] ? Number(countResult.rows[0].total) : 0;
    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);
    const dataResult = await pool.query(
      `SELECT l.id, l.user_id, u.username, l.action, l.ip, l.user_agent, l.created_at
       FROM user_login_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({
      page,
      pageSize,
      total,
      items: dataResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

async function handleAdminCredentialsUpdate(req, res) {
  try {
    const {
      currentUsername,
      currentPassword,
      newUsername,
      newPassword,
      confirmPassword
    } = req.body || {};
    const adminId = await getAdminId();
    if (!adminId || String(adminId) !== String(req.admin.id)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    if (!currentUsername || !currentPassword) {
      res.status(400).json({ error: "missing_current_credentials" });
      return;
    }
    const currentResult = await pool.query(
      "SELECT username, password_hash FROM users WHERE id = $1",
      [adminId]
    );
    if (!currentResult.rowCount) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const current = currentResult.rows[0];
    if (String(current.username) !== String(currentUsername).trim()) {
      res.status(401).json({ error: "invalid_current_credentials" });
      return;
    }
    const ok = await bcrypt.compare(String(currentPassword), current.password_hash);
    if (!ok) {
      res.status(401).json({ error: "invalid_current_credentials" });
      return;
    }
    const updates = [];
    const values = [];
    let idx = 1;
    if (newUsername !== undefined && String(newUsername || "").trim()) {
      const safeUsername = String(newUsername || "").trim();
      if (!isValidPublicUsername(safeUsername)) {
        res.status(400).json({ error: "invalid_new_username" });
        return;
      }
      const exists = await pool.query(
        "SELECT id FROM users WHERE username = $1 AND id <> $2",
        [safeUsername, adminId]
      );
      if (exists.rowCount) {
        res.status(409).json({ error: "username_exists" });
        return;
      }
      updates.push(`username = $${idx}`);
      values.push(safeUsername);
      idx += 1;
    }
    if (newPassword !== undefined && String(newPassword || "")) {
      const safePassword = String(newPassword || "");
      if (safePassword !== String(confirmPassword || "")) {
        res.status(400).json({ error: "password_mismatch" });
        return;
      }
      const hasLetter = /[A-Za-z]/.test(safePassword);
      const hasNumber = /[0-9]/.test(safePassword);
      if (safePassword.length < 8 || !hasLetter || !hasNumber) {
        res.status(400).json({ error: "weak_password" });
        return;
      }
      const hash = await bcrypt.hash(safePassword, 10);
      updates.push(`password_hash = $${idx}`);
      values.push(hash);
      idx += 1;
    }
    if (!updates.length) {
      res.status(400).json({ error: "no_updates" });
      return;
    }
    values.push(adminId);
    await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = $${idx}`, values);
    if (newUsername !== undefined && String(newUsername || "").trim()) {
      await updateUserSettings(adminId, { userName: String(newUsername || "").trim() });
    }
    await logAdminAction(
      adminId,
      "admin_credentials_update",
      {
        username_changed: Boolean(newUsername && String(newUsername || "").trim()),
        password_changed: Boolean(newPassword && String(newPassword || ""))
      },
      req
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
}

adminApp.post("/api/admin/credentials", requireAdmin, handleAdminCredentialsUpdate);
app.post("/api/admin/credentials", requireAdmin, handleAdminCredentialsUpdate);

adminApp.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const adminId = await getAdminId();
    if (!id || (adminId && String(adminId) === id)) {
      res.status(400).json({ error: "Invalid user" });
      return;
    }
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    await logAdminAction(req.admin.id, "user_delete", { id }, req);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

adminApp.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});


app.post("/api/links", requireAuth, async (req, res) => {
  const { title, url, icon, category, is_private, is_dock, position_index } = req.body || {};
  if (!title || !url) {
    res.status(400).json({ error: "Title and url are required" });
    return;
  }
  const safeTitle = String(title).trim();
  const safeUrl = String(url).trim();
  const safeCategory = category ? String(category) : "";
  const dockValue = Boolean(is_dock);
  const positionIndex = Number(position_index);
  try {
    const categoryInfo = dockValue
      ? { id: null, is_private: false }
      : await getCategoryInfo(pool, req.user.id, safeCategory);
    const privateValue = categoryInfo.is_private ? true : Boolean(is_private);
    const categoryId = categoryInfo.id;
    const result = await pool.query(
      "INSERT INTO links (user_id, title, url, icon, category_id, is_private, is_dock, position_index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
      [
        req.user.id,
        safeTitle,
        safeUrl,
        icon || null,
        categoryId,
        privateValue,
        dockValue,
        dockValue && !Number.isNaN(positionIndex) ? positionIndex : null
      ]
    );
    const id = result.rows[0].id;
    try {
      const localIcon = await downloadIcon(safeUrl, id);
      if (localIcon) {
        await pool.query("UPDATE links SET icon = $1 WHERE id = $2 AND user_id = $3", [
          localIcon,
          id,
          req.user.id
        ]);
      }
    } catch (downloadErr) {
      // Ignore icon download failures
    }
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/api/links/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id || "");
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { title, url, icon, category, is_private, is_dock, position_index } = req.body || {};
  if (!title || !url) {
    res.status(400).json({ error: "Title and url are required" });
    return;
  }
  const safeTitle = String(title).trim();
  const safeUrl = String(url).trim();
  const safeCategory = category ? String(category) : "";
  const positionIndex = Number(position_index);
  try {
    const current = await pool.query(
      "SELECT url, icon, is_dock FROM links WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (!current.rowCount) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const row = current.rows[0];
    let nextIcon = row.icon || null;
    const urlChanged = row.url !== safeUrl;
    const dockValue = is_dock === undefined ? row.is_dock : Boolean(is_dock);
    if (urlChanged) {
      try {
        const localIcon = await downloadIcon(safeUrl, id);
        if (localIcon) {
          nextIcon = localIcon;
        }
      } catch (downloadErr) {
        // Keep existing icon on download failure
      }
    }
    const categoryInfo = dockValue
      ? { id: null, is_private: false }
      : await getCategoryInfo(pool, req.user.id, safeCategory);
    const privateValue = categoryInfo.is_private ? true : Boolean(is_private);
    const categoryId = categoryInfo.id;
    await pool.query(
      "UPDATE links SET title = $1, url = $2, icon = $3, category_id = $4, is_private = $5, is_dock = $6, position_index = $7 WHERE id = $8 AND user_id = $9",
      [
        safeTitle,
        safeUrl,
        icon || nextIcon,
        categoryId,
        privateValue,
        dockValue,
        dockValue && !Number.isNaN(positionIndex) ? positionIndex : null,
        id,
        req.user.id
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/api/links/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id || "");
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const current = await pool.query(
      "SELECT icon FROM links WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    const iconValue = current.rows[0] && current.rows[0].icon ? current.rows[0].icon : "";
    let iconPath = null;
    if (iconValue) {
      const normalized = iconValue.replace(/^\/+/, "");
      if (normalized.startsWith("icons/")) {
        iconPath = path.join(__dirname, "public", normalized);
      } else if (normalized.startsWith("public/icons/")) {
        iconPath = path.join(__dirname, normalized);
      } else {
        iconPath = path.join(__dirname, normalized);
      }
    }
    await pool.query("DELETE FROM links WHERE id = $1 AND user_id = $2", [id, req.user.id]);
    if (iconPath && iconPath.startsWith(iconDir)) {
      fs.unlink(iconPath, () => {});
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/backup/export", requireAuth, async (req, res) => {
  try {
    const settingsResult = await pool.query(
      "SELECT settings FROM user_settings WHERE user_id = $1",
      [req.user.id]
    );
    const settings = settingsResult.rows[0] ? settingsResult.rows[0].settings : {};
    const categoriesResult = await pool.query(
      "SELECT id, name, is_private, sort_index FROM categories WHERE user_id = $1 ORDER BY sort_index ASC, name ASC",
      [req.user.id]
    );
    const linksResult = await pool.query(
      `SELECT links.id, links.title, links.url, links.icon, links.is_private, links.is_dock, links.sort_index, links.position_index,
              categories.name AS category,
              COALESCE(categories.is_private, FALSE) AS category_private
       FROM links
       LEFT JOIN categories ON links.category_id = categories.id
       WHERE links.user_id = $1
       ORDER BY links.sort_index ASC, links.created_at ASC`,
      [req.user.id]
    );
    const payload = {
      version: 1,
      exported_at: new Date().toISOString(),
      settings,
      categories: categoriesResult.rows,
      links: linksResult.rows
    };
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"mynavsite-backup-${Date.now()}.json\"`
    );
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/backup/import", requireAuth, upload.single("backup"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file" });
    return;
  }
  try {
    const raw = await fs.promises.readFile(req.file.path, "utf8");
    const data = JSON.parse(raw);
    const settings = data && typeof data.settings === "object" ? data.settings : {};
    const categories = Array.isArray(data?.categories) ? data.categories : [];
    const links = Array.isArray(data?.links) ? data.links : [];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM links WHERE user_id = $1", [req.user.id]);
      await client.query("DELETE FROM categories WHERE user_id = $1", [req.user.id]);

      const categoryMap = new Map();
      for (const item of categories) {
        const name = String(item?.name || "").trim();
        if (!name) continue;
        const isPrivate = Boolean(item?.is_private);
        const result = await client.query(
          "INSERT INTO categories (user_id, name, is_private, sort_index) VALUES ($1, $2, $3, $4) RETURNING id",
          [req.user.id, name, isPrivate, Number(item.sort_index) || 0]
        );
        categoryMap.set(name, result.rows[0].id);
      }

      for (const item of links) {
        const title = String(item?.title || "").trim();
        const url = String(item?.url || "").trim();
        if (!title || !url) continue;
        const categoryName = item?.category ? String(item.category).trim() : "";
        let categoryId = categoryName ? categoryMap.get(categoryName) || null : null;
        if (categoryName && !categoryId) {
          const isPrivate = Boolean(item?.category_private);
          const result = await client.query(
            "INSERT INTO categories (user_id, name, is_private, sort_index) VALUES ($1, $2, $3, $4) RETURNING id",
            [req.user.id, categoryName, isPrivate, 0]
          );
          categoryId = result.rows[0].id;
          categoryMap.set(categoryName, categoryId);
        }
        const dockValue = Boolean(item.is_dock);
        const positionIndex = Number(item.position_index);
        await client.query(
          "INSERT INTO links (user_id, title, url, icon, category_id, is_private, is_dock, sort_index, position_index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
          [
            req.user.id,
            title,
            url,
            item.icon || null,
            categoryId,
            Boolean(item.is_private),
            dockValue,
            Number(item.sort_index) || 0,
            dockValue && !Number.isNaN(positionIndex) ? positionIndex : null
          ]
        );
      }

      await client.query(
        "INSERT INTO user_settings (user_id, settings) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings",
        [req.user.id, settings]
      );

      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: "Database error" });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(400).json({ error: "Invalid JSON" });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Public profile short URL: /:username (must be before static)
app.get("/:username", (req, res, next) => {
  const username = String(req.params.username || "").trim();
  if (!/^[A-Za-z0-9]+$/.test(username)) {
    next();
    return;
  }
  const reserved = new Set([
    "api",
    "public",
    "icons",
    "guide",
    "login",
    "register",
    "profile",
    "manifest",
    "service-worker",
    "icon",
    "favicon",
    "u"
  ]);
  if (reserved.has(username.toLowerCase())) {
    next();
    return;
  }
  res.sendFile(path.join(__dirname, "index.html"));
});

// Serve static files from the project root (after API routes)
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/icons", express.static(path.join(__dirname, "public", "icons")));
app.use(express.static(path.join(__dirname, "public")));

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/profile.html", (req, res) => {
  res.sendFile(path.join(__dirname, "profile.html"));
});

app.get("/guide/user", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "user-guide.html"));
});

app.get("/guide/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-guide.html"));
});

app.get("/guide/deploy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "deployment-guide.html"));
});

adminApp.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

adminApp.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

adminApp.get("/admin/", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

adminApp.get("/admin/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

adminApp.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

adminApp.get("/guide/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-guide.html"));
});

adminApp.get("/guide/deploy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "deployment-guide.html"));
});

app.get("/manifest.json", (req, res) => {
  res.sendFile(path.join(__dirname, "manifest.json"));
});

app.get("/service-worker.js", (req, res) => {
  res.sendFile(path.join(__dirname, "service-worker.js"));
});

app.get("/icon.svg", (req, res) => {
  res.sendFile(path.join(__dirname, "icon.svg"));
});

app.get("/u/:username", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// SPA fallback: for non-API routes (e.g. /username) always return index.html
app.get("*", (req, res, next) => {
  const p = String(req.path || "");
  if (
    p.startsWith("/api/") ||
    p.startsWith("/public/") ||
    p.startsWith("/icons/") ||
    p.startsWith("/guide/") ||
    p === "/manifest.json" ||
    p === "/service-worker.js" ||
    p === "/icon.svg"
  ) {
    next();
    return;
  }
  res.sendFile(path.join(__dirname, "index.html"));
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
    adminApp.listen(adminPort, () => {
      console.log(`Admin panel running at http://localhost:${adminPort}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database", err);
    process.exit(1);
  });

