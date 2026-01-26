const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;
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

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(iconDir, { recursive: true });
fs.mkdirSync(publicUploadDir, { recursive: true });

app.use(express.json());
app.use((req, res, next) => {
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
      avatar_url TEXT,
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
      sort_index INTEGER DEFAULT 0,
      UNIQUE (user_id, name)
    )
  `);
  await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID`);
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

  const existing = await pool.query("SELECT id FROM users LIMIT 1");
  if (!existing.rowCount && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id",
      [process.env.ADMIN_USERNAME, hash]
    );
    await pool.query("INSERT INTO user_settings (user_id, settings) VALUES ($1, $2)", [
      result.rows[0].id,
      {
        siteName: "我的 iOS 风格导航",
        backgroundColor: "",
        siteLogo: "",
        userName: process.env.ADMIN_USERNAME,
        userAvatar: ""
      }
    ]);
    console.log("Seeded admin user from environment variables.");
  }

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

function getFaviconUrl(linkUrl) {
  try {
    const parsed = new URL(linkUrl);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=128`;
  } catch (err) {
    return null;
  }
}

async function downloadIcon(linkUrl, id) {
  const faviconUrl = getFaviconUrl(linkUrl);
  if (!faviconUrl) {
    return null;
  }
  const response = await fetch(faviconUrl);
  if (!response.ok) {
    return null;
  }
  const buffer = await response.buffer();
  const safeId = String(id).replace(/[^a-zA-Z0-9-]/g, "");
  const fileName = `${safeId}.png`;
  const filePath = path.join(iconDir, fileName);
  await fs.promises.writeFile(filePath, buffer);
  return `/public/icons/${fileName}`;
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

function signToken(userId) {
  return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: "7d" });
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

function requireAuth(req, res, next) {
  console.log("User accessing API:", req.session && req.session.userId ? req.session.userId : "none");
  getAuthUser(req)
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      req.user = user;
      next();
    })
    .catch(() => {
      res.status(500).json({ error: "Database error" });
    });
}

function normalizeSettings(settings, fallbackName) {
  const safe = settings && typeof settings === "object" ? settings : {};
  return {
    siteName: safe.siteName || "我的 iOS 风格导航",
    siteLogo: safe.siteLogo || "",
    backgroundColor: safe.backgroundColor || "",
    userName: safe.userName || fallbackName || "Admin",
    userAvatar: safe.userAvatar || ""
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

async function getPublicUser() {
  const result = await pool.query(
    "SELECT id, username, avatar_url FROM users ORDER BY created_at ASC LIMIT 1"
  );
  return result.rows[0] || null;
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

async function getCategoryId(client, userId, name) {
  const clean = String(name || "").trim();
  if (!clean) {
    return null;
  }
  const result = await client.query(
    "SELECT id FROM categories WHERE user_id = $1 AND name = $2",
    [userId, clean]
  );
  if (result.rowCount) {
    return result.rows[0].id;
  }
  return ensureCategory(client, userId, clean);
}

app.get("/api/links", async (req, res) => {
  try {
    const authUser = await getAuthUser(req);
    const user = authUser || (await getPublicUser());
    if (!user) {
      res.json([]);
      return;
    }
    const params = [user.id];
    let where = "WHERE links.user_id = $1";
    if (!authUser) {
      where += " AND links.is_private = FALSE";
    }
    const result = await pool.query(
      `SELECT links.id, links.title, links.url, links.icon, links.is_private, links.is_dock, links.sort_index, links.position_index,
              categories.name AS category
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
      "SELECT id, name FROM categories WHERE user_id = $1 ORDER BY sort_index ASC, name ASC",
      [userId]
    );
    res.json(result.rows.map((row) => ({ id: row.id, name: row.name })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/categories", requireAuth, async (req, res) => {
  const name = String(req.body?.name || "").trim();
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
      "INSERT INTO categories (user_id, name, sort_index) VALUES ($1, $2, 0) ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name",
      [userId, name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/categories/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id || "");
  const name = String(req.body?.name || "").trim();
  if (!id || !name) {
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
      "UPDATE categories SET name = $1 WHERE user_id = $2 AND id = $3 RETURNING id, name",
      [name, userId, id]
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
    const user = authUser || (await getPublicUser());
    if (!user) {
      res.json(normalizeSettings({}, "Admin"));
      return;
    }
    const settings = await getSettingsForUser(user.id, user.username);
    res.json({
      ...settings,
      userAvatar: user.avatar_url || settings.userAvatar
    });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/api/settings", requireAuth, async (req, res) => {
  const { siteName, backgroundColor, userName } = req.body || {};
  const updates = {};
  if (siteName !== undefined) updates.siteName = String(siteName);
  if (backgroundColor !== undefined) updates.backgroundColor = String(backgroundColor);
  if (userName !== undefined) updates.userName = String(userName);
  if (!Object.keys(updates).length) {
    res.status(400).json({ error: "No updates" });
    return;
  }
  try {
    await updateUserSettings(req.user.id, updates);
    res.json({ ok: true });
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
    const user = await getAuthUser(req);
    if (!user) {
      res.json({ loggedIn: false });
      return;
    }
    const settings = await getSettingsForUser(user.id, user.username);
    res.json({
      loggedIn: true,
      userName: settings.userName,
      userAvatar: user.avatar_url || settings.userAvatar
    });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

async function handleRegister(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  try {
    const safeUsername = String(username).trim();
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id",
      [safeUsername, hash]
    );
    await pool.query("INSERT INTO user_settings (user_id, settings) VALUES ($1, $2)", [
      result.rows[0].id,
      {
        siteName: "我的 iOS 风格导航",
        backgroundColor: "",
        siteLogo: "",
        userName: safeUsername,
        userAvatar: ""
      }
    ]);
    res.status(201).json({ ok: true, id: result.rows[0].id });
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

async function handleLogin(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  try {
    const safeUsername = String(username).trim();
    const result = await pool.query(
      "SELECT id, password_hash FROM users WHERE username = $1",
      [safeUsername]
    );
    if (!result.rowCount) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken(user.id);
    const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
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

app.post("/api/logout", (req, res) => {
  res.setHeader("Set-Cookie", "token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
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

app.post("/api/links", requireAuth, async (req, res) => {
  const { title, url, icon, category, is_private, is_dock, position_index } = req.body || {};
  if (!title || !url) {
    res.status(400).json({ error: "Title and url are required" });
    return;
  }
  const safeTitle = String(title).trim();
  const safeUrl = String(url).trim();
  const safeCategory = category ? String(category) : "";
  const privateValue = Boolean(is_private);
  const dockValue = Boolean(is_dock);
  const positionIndex = Number(position_index);
  try {
    const categoryId = dockValue ? null : await getCategoryId(pool, req.user.id, safeCategory);
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
  const privateValue = Boolean(is_private);
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
    const categoryId = dockValue ? null : await getCategoryId(pool, req.user.id, safeCategory);
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
    const iconPath = iconValue ? path.join(__dirname, iconValue.replace(/^\/+/, "")) : null;
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
      "SELECT id, name, sort_index FROM categories WHERE user_id = $1 ORDER BY sort_index ASC, name ASC",
      [req.user.id]
    );
    const linksResult = await pool.query(
      `SELECT links.id, links.title, links.url, links.icon, links.is_private, links.is_dock, links.sort_index, links.position_index,
              categories.name AS category
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
        const result = await client.query(
          "INSERT INTO categories (user_id, name, sort_index) VALUES ($1, $2, $3) RETURNING id",
          [req.user.id, name, Number(item.sort_index) || 0]
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
          const result = await client.query(
            "INSERT INTO categories (user_id, name, sort_index) VALUES ($1, $2, $3) RETURNING id",
            [req.user.id, categoryName, 0]
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

// Serve static files from the project root (after API routes)
app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database", err);
    process.exit(1);
  });
