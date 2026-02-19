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

/* ------------------ setup ------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
console.log("BOOT VERSION: v1000 ✅");

/* ------------------ CORS ------------------ */
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://mini-youtube-tawny.vercel.app", // ✅ YOUR FRONTEND
];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow curl / render health checks
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("CORS blocked: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

/* ------------------ middleware ------------------ */
app.use(express.json());

app.get("/", (_, res) => res.status(200).send("ok"));

/* ------------------ uploads ------------------ */
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}__${safe}`);
  },
});
const upload = multer({ storage });

/* ------------------ DB ------------------ */
let db;

async function initDb() {
  db = await open({
    filename: path.join(__dirname, "db.sqlite"),
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT,
      created_at TEXT,
      points INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      filename TEXT,
      mimetype TEXT,
      size INTEGER,
      created_at TEXT,
      user_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      video_id INTEGER,
      created_at TEXT,
      UNIQUE(user_id, video_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      video_id INTEGER,
      text TEXT,
      created_at TEXT
    );
  `);
}

await initDb();

/* ------------------ auth helpers ------------------ */
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

function makeToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!t) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(t, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Bad token" });
  }
}

/* ------------------ health ------------------ */
app.get("/api/health", (_, res) => res.json({ ok: true }));

/* ------------------ AUTH ------------------ */
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const r = await db.run(
      "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
      username.trim(),
      hash,
      new Date().toISOString()
    );

    const user = { id: r.lastID, username };
    return res.json({ token: makeToken(user), user });
  } catch {
    return res.status(400).json({ error: "Username taken" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const row = await db.get(
    "SELECT * FROM users WHERE username=?",
    username.trim()
  );

  if (!row) return res.status(401).json({ error: "Invalid login" });

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid login" });

  const user = { id: row.id, username: row.username };
  return res.json({ token: makeToken(user), user });
});

app.get("/api/auth/me", auth, async (req, res) => {
  const u = await db.get(
    "SELECT id, username, points FROM users WHERE id=?",
    req.user.id
  );
  return res.json({ user: u });
});

/* ------------------ START ------------------ */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("LISTENING ON PORT", PORT);
});
