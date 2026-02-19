// index.js (Render backend) — clean, working, CORS-safe for Render + Vercel + localhost
import express from "express";
import cors from "cors";
import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

/* ------------------ setup ------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
console.log("BOOT VERSION: v3000 ✅");

/* ------------------ middleware ------------------ */
app.use(express.json());

/* ------------------ CORS (IMPORTANT) ------------------ */
// ✅ add BOTH your frontends here
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://mini-youtube-tawny.vercel.app",   // Vercel frontend
  "https://mini-youtube-h6ex.onrender.com",  // Render frontend (if you use it)
];

const corsOptions = {
  origin: (origin, cb) => {
    // allow server-to-server / curl / Render health checks
    if (!origin) return cb(null, true);

    // allow exact matches only
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);

    return cb(new Error("CORS blocked: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ✅ MUST be before routes
app.use(cors(corsOptions));
// ✅ preflight for ALL routes with SAME options
app.options("*", cors(corsOptions));

/* ------------------ quick sanity routes ------------------ */
app.get("/", (req, res) => res.status(200).send("API OK ✅"));
app.get("/api/health", (req, res) => res.json({ ok: true }));

/* ------------------ uploads ------------------ */
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const safe = (file.originalname || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}__${safe}`);
  },
});
const upload = multer({ storage });

// serve uploaded files
app.use("/uploads", express.static(UPLOAD_DIR));

/* ------------------ DB ------------------ */
let db;

async function initDb() {
  db = await open({
    filename: path.join(__dirname, "db.sqlite"),
    driver: sqlite3.Database,
  });

  await db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      points INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      mimetype TEXT,
      size INTEGER,
      created_at TEXT NOT NULL,
      user_id INTEGER NOT NULL
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
}

/* ------------------ auth helpers ------------------ */
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function makeToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Bad token" });
  }
}

/* ------------------ AUTH routes ------------------ */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const u = (username || "").trim();

    if (!u || !password || password.length < 6) {
      return res.status(400).json({ error: "Username + 6+ char password required" });
    }

    const hash = await bcrypt.hash(password, 10);

    const r = await db.run(
      "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
      u,
      hash,
      new Date().toISOString()
    );

    const user = { id: r.lastID, username: u };
    return res.json({ token: makeToken(user), user });
  } catch (e) {
    return res.status(400).json({ error: "Username taken" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const u = (username || "").trim();

    if (!u || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const row = await db.get("SELECT * FROM users WHERE username = ?", u);
    if (!row) return res.status(401).json({ error: "Invalid login" });

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid login" });

    const user = { id: row.id, username: row.username };
    return res.json({ token: makeToken(user), user });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
});

// ✅ this is what your frontend is calling ("loading gains..." stuck)
app.get("/api/auth/me", auth, async (req, res) => {
  const u = await db.get(
    "SELECT id, username, points FROM users WHERE id = ?",
    req.user.id
  );
  return res.json({ user: u || null });
});

/* ------------------ VIDEO routes (basic) ------------------ */
app.get("/api/videos", async (req, res) => {
  const rows = await db.all(`
    SELECT v.id, v.title, v.filename, v.mimetype, v.size, v.created_at, v.user_id,
           u.username
    FROM videos v
    JOIN users u ON u.id = v.user_id
    ORDER BY v.id DESC
    LIMIT 100
  `);

  const out = rows.map((r) => ({
    ...r,
    url: `/uploads/${r.filename}`,
  }));

  return res.json({ videos: out });
});

app.post("/api/videos", auth, upload.single("video"), async (req, res) => {
  const title = (req.body?.title || "").trim();
  const f = req.file;

  if (!title) return res.status(400).json({ error: "Missing title" });
  if (!f) return res.status(400).json({ error: "Missing file field 'video'" });

  const now = new Date().toISOString();

  const r = await db.run(
    `INSERT INTO videos (title, filename, mimetype, size, created_at, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    title,
    f.filename,
    f.mimetype || "",
    f.size || 0,
    now,
    req.user.id
  );

  return res.json({
    ok: true,
    video: {
      id: r.lastID,
      title,
      filename: f.filename,
      url: `/uploads/${f.filename}`,
      created_at: now,
      user_id: req.user.id,
    },
  });
});

app.delete("/api/videos/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });

  const row = await db.get("SELECT * FROM videos WHERE id = ?", id);
  if (!row) return res.status(404).json({ error: "Not found" });

  // simple owner check
  if (row.user_id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // delete db record
  await db.run("DELETE FROM videos WHERE id = ?", id);

  // best-effort delete file
  const filepath = path.join(UPLOAD_DIR, row.filename);
  try {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  } catch {}

  return res.json({ ok: true });
});

/* ------------------ 404 fallback for API ------------------ */
app.use("/api", (req, res) => {
  return res.status(404).json({ error: "API route not found" });
});

/* ------------------ start ------------------ */
async function main() {
  await initDb();

  const PORT = process.env.PORT || 10000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log("LISTENING ON", PORT);
  });
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
