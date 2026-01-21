const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const port = 3000;

const dbPath = path.join(__dirname, "data.db");
const uploadDir = path.join(__dirname, "uploads");
const iconDir = path.join(__dirname, "public", "icons");
const upload = multer({ dest: uploadDir });
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
let db = null;

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(iconDir, { recursive: true });

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});

function openDb() {
  const database = new sqlite3.Database(dbPath);
  database.serialize(() => {
    database.run(
      `CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        icon TEXT,
        category TEXT,
        is_private INTEGER DEFAULT 0
      )`
    );
    database.run(
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )`
    );
  });
  return database;
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
  const fileName = `${id}.png`;
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

function isAuthed(req) {
  const cookies = parseCookies(req);
  return cookies.auth === "1";
}

function requireAuth(req, res, next) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

db = openDb();

// Serve static files from the project root
app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/links", (req, res) => {
  const where = isAuthed(req) ? "" : "WHERE is_private = 0";
  db.all(
    `SELECT id, title, url, icon, category, is_private FROM links ${where} ORDER BY category ASC, id ASC`,
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: "Database error" });
        return;
      }
      res.json(rows);
    }
  );
});

app.get("/api/categories", requireAuth, (req, res) => {
  db.all(
    "SELECT DISTINCT category FROM links WHERE category IS NOT NULL AND TRIM(category) != '' ORDER BY category ASC",
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: "Database error" });
        return;
      }
      const categories = rows.map((row) => row.category);
      res.json(categories);
    }
  );
});

app.get("/api/settings", (req, res) => {
  db.get("SELECT value FROM settings WHERE key = ?", ["siteName"], (err, row) => {
    if (err) {
      res.status(500).json({ error: "Database error" });
      return;
    }
    res.json({ siteName: row && row.value ? row.value : "我的 iOS 风格导航" });
  });
});

app.put("/api/settings", requireAuth, (req, res) => {
  const { siteName } = req.body || {};
  if (!siteName) {
    res.status(400).json({ error: "siteName is required" });
    return;
  }
  db.run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ["siteName", siteName],
    function onUpdate(err) {
      if (err) {
        res.status(500).json({ error: "Database error" });
        return;
      }
      res.json({ ok: true });
    }
  );
});

app.get("/api/me", (req, res) => {
  res.json({ loggedIn: isAuthed(req) });
});

app.post("/api/login", (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== adminPassword) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  res.setHeader("Set-Cookie", "auth=1; Path=/; HttpOnly; SameSite=Lax");
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  res.setHeader("Set-Cookie", "auth=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
  res.json({ ok: true });
});

app.post("/api/links", requireAuth, (req, res) => {
  const { title, url, icon, category, is_private } = req.body || {};
  if (!title || !url) {
    res.status(400).json({ error: "Title and url are required" });
    return;
  }
  const privateValue = is_private ? 1 : 0;
  db.run(
    "INSERT INTO links (title, url, icon, category, is_private) VALUES (?, ?, ?, ?, ?)",
    [title, url, icon || null, category || null, privateValue],
    async function onInsert(err) {
      if (err) {
        res.status(500).json({ error: "Database error" });
        return;
      }
      const id = this.lastID;
      try {
        const localIcon = await downloadIcon(url, id);
        if (localIcon) {
          db.run("UPDATE links SET icon = ? WHERE id = ?", [localIcon, id]);
        }
      } catch (downloadErr) {
        // Ignore icon download failures
      }
      res.status(201).json({ id });
    }
  );
});

app.put("/api/links/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { title, url, icon, category, is_private } = req.body || {};
  if (!title || !url) {
    res.status(400).json({ error: "Title and url are required" });
    return;
  }
  const privateValue = is_private ? 1 : 0;
  db.get("SELECT url, icon FROM links WHERE id = ?", [id], async (selectErr, row) => {
    if (selectErr || !row) {
      res.status(500).json({ error: "Database error" });
      return;
    }
    let nextIcon = row.icon || null;
    const urlChanged = row.url !== url;
    if (urlChanged) {
      try {
        const localIcon = await downloadIcon(url, id);
        if (localIcon) {
          nextIcon = localIcon;
        }
      } catch (downloadErr) {
        // Keep existing icon on download failure
      }
    }
    db.run(
      "UPDATE links SET title = ?, url = ?, icon = ?, category = ?, is_private = ? WHERE id = ?",
      [title, url, icon || nextIcon, category || null, privateValue, id],
      function onUpdate(err) {
        if (err) {
          res.status(500).json({ error: "Database error" });
          return;
        }
        res.json({ ok: true, updated: this.changes });
      }
    );
  });
});

app.delete("/api/links/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  db.get("SELECT icon FROM links WHERE id = ?", [id], (selectErr, row) => {
    if (selectErr) {
      res.status(500).json({ error: "Database error" });
      return;
    }
    db.run("DELETE FROM links WHERE id = ?", [id], function onDelete(err) {
      if (err) {
        res.status(500).json({ error: "Database error" });
        return;
      }
      const iconValue = row && row.icon ? row.icon.replace(/^\/+/, "") : "";
      const iconPath = iconValue ? path.join(__dirname, iconValue) : null;
      if (iconPath && iconPath.startsWith(iconDir)) {
        fs.unlink(iconPath, () => {});
      }
      res.json({ ok: true, deleted: this.changes });
    });
  });
});

app.get("/api/backup/export", requireAuth, (req, res) => {
  res.download(dbPath, "data.db");
});

app.post("/api/backup/import", requireAuth, upload.single("db"), (req, res) => {
  if (!req.file || !req.file.path) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const tempPath = req.file.path;
  db.close((closeErr) => {
    if (closeErr) {
      res.status(500).json({ error: "Database close error" });
      return;
    }
    fs.copyFile(tempPath, dbPath, (copyErr) => {
      fs.unlink(tempPath, () => {});
      if (copyErr) {
        res.status(500).json({ error: "Import failed" });
        return;
      }
      db = openDb();
      res.json({ ok: true });
    });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
