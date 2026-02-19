import express from "express";
import cors from "cors";
import multer from "multer";
import { fileURLToPath } from "url";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
console.log("BOOT VERSION: v999 ✅");

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://mini-youtube-h6ex.onrender.com"
  ],
  credentials: true
}));

app.use(express.json());   // 👈 THIS WAS MISSING



const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// ---------- Rank helper ----------
function getRank(points = 0) {
  if (points >= 1500) return "Legend";
  if (points >= 700) return "Elite";
  if (points >= 300) return "Beast";
  if (points >= 100) return "Grinder";
  return "Rookie";
}

// ---------- Upload storage ----------
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}__${safe}`);
  },
});
const upload = multer({ storage });

// ---------- DB ----------
let db;
async function initDb() {
  db = await open({
    filename: path.join(__dirname, "db.sqlite"),
    driver: sqlite3.Database,
  });

  // Base tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      points INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      video_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, video_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      video_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Safe migrations if you had an older DB without points
  try {
    await db.exec(`ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0;`);
  } catch {}
}
await initDb();

// ---------- Auth helpers ----------
function makeToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!t) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(t, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Bad token" });
  }
}

// ---------- Health ----------
app.get("/api/health", (_, res) => res.json({ ok: true }));

// ---------- AUTH ----------
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username?.trim() || !password || password.length < 6) {
    return res.status(400).json({ error: "username + password(6+) required" });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const r = await db.run(
      "INSERT INTO users (username, password_hash, created_at, points) VALUES (?, ?, ?, ?)",
      username.trim(),
      hash,
      new Date().toISOString(),
      0
    );
    const user = { id: r.lastID, username: username.trim() };
    res.json({ token: makeToken(user), user });
  } catch {
    res.status(400).json({ error: "username already taken" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username?.trim() || !password) {
    return res.status(400).json({ error: "username + password required" });
  }

  const row = await db.get(
    "SELECT id, username, password_hash FROM users WHERE username=?",
    username.trim()
  );
  if (!row) return res.status(401).json({ error: "invalid login" });

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: "invalid login" });

  const user = { id: row.id, username: row.username };
  res.json({ token: makeToken(user), user });
});

app.get("/api/auth/me", auth, async (req, res) => {
  const u = await db.get("SELECT id, username, points FROM users WHERE id=?", req.user.id);
  res.json({
    user: {
      id: u.id,
      username: u.username,
      points: u.points || 0,
      rank: getRank(u.points || 0),
    },
  });
});

// ---------- VIDEOS ----------
app.get("/api/videos", async (_, res) => {
  const rows = await db.all(`
    SELECT v.id, v.title, v.created_at,
           u.id as user_id, u.username, u.points
    FROM videos v
    LEFT JOIN users u ON u.id = v.user_id
    ORDER BY v.id DESC
  `);

  res.json(
    rows.map((r) => ({
      ...r,
      rank: getRank(r.points || 0),
    }))
  );
});

// ---------- UPLOAD (gives +10 points) ----------
app.post("/api/upload", auth, upload.single("video"), async (req, res) => {
  const { title } = req.body || {};
  if (!title?.trim() || !req.file) {
    return res.status(400).json({ error: "Missing title or file" });
  }

  const result = await db.run(
    "INSERT INTO videos (title, filename, mimetype, size, created_at, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    title.trim(),
    req.file.filename,
    req.file.mimetype,
    req.file.size,
    new Date().toISOString(),
    req.user.id
  );

  // +10 points for uploading
  await db.run("UPDATE users SET points = points + 10 WHERE id=?", req.user.id);

  res.json({ id: result.lastID });
});

// ---------- STREAM ----------
app.get("/api/stream/:id", async (req, res) => {
  const row = await db.get("SELECT * FROM videos WHERE id=?", req.params.id);
  if (!row) return res.status(404).end();

  const filePath = path.join(UPLOAD_DIR, row.filename);
  if (!fs.existsSync(filePath)) return res.status(404).end();

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (!range) {
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Type", row.mimetype);
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
  const start = parseInt(startStr, 10);
  const end = endStr ? parseInt(endStr, 10) : stat.size - 1;

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    "Accept-Ranges": "bytes",
    "Content-Length": end - start + 1,
    "Content-Type": row.mimetype,
  });

  fs.createReadStream(filePath, { start, end }).pipe(res);
});

// ---------- LIKES ----------
app.post("/api/videos/:id/like", auth, async (req, res) => {
  const videoId = req.params.id;
  const userId = req.user.id;

  const existing = await db.get(
    "SELECT id FROM likes WHERE video_id=? AND user_id=?",
    videoId,
    userId
  );

  if (existing) {
    await db.run("DELETE FROM likes WHERE id=?", existing.id);
    return res.json({ liked: false });
  }

  await db.run(
    "INSERT INTO likes (user_id, video_id, created_at) VALUES (?, ?, ?)",
    userId,
    videoId,
    new Date().toISOString()
  );
  res.json({ liked: true });
});

app.get("/api/videos/:id/likes", async (req, res) => {
  const row = await db.get(
    "SELECT COUNT(*) AS count FROM likes WHERE video_id=?",
    req.params.id
  );
  res.json({ likes: row?.count || 0 });
});

// ---------- COMMENTS ----------
app.get("/api/videos/:id/comments", async (req, res) => {
  const rows = await db.all(
    `
    SELECT c.id, c.text, c.created_at, u.username
    FROM comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.video_id=?
    ORDER BY c.id DESC
    LIMIT 100
  `,
    req.params.id
  );
  res.json(rows);
});

app.post("/api/videos/:id/comments", auth, async (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: "Empty comment" });

  const r = await db.run(
    "INSERT INTO comments (user_id, video_id, text, created_at) VALUES (?, ?, ?, ?)",
    req.user.id,
    req.params.id,
    text.trim(),
    new Date().toISOString()
  );
  res.json({ id: r.lastID });
});

// ---------- Start ----------


app.get("/api/leaderboard", async (_, res) => {
  const rows = await db.all(
    "SELECT id, username, points FROM users ORDER BY points DESC, id ASC LIMIT 25"
  );

  res.json(
    rows.map((u, i) => ({
      place: i + 1,
      id: u.id,
      username: u.username,
      points: u.points || 0,
      rank: getRank(u.points || 0),
    }))
  );
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("LISTEN VERSION: v999 ✅ PORT =", PORT);
});
