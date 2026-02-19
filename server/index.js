// server/index.js — VIDEOS ONLY (no login), Render-safe, CORS-safe, Express5-safe
import express from "express";
import cors from "cors";
import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

/* ------------------ setup ------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
console.log("BOOT VERSION: v4000 (VIDEOS ONLY) ✅");

app.use(express.json());

/* ------------------ CORS ------------------ */
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://mini-youtube-tawny.vercel.app",
  "https://mini-youtubes.onrender.com",
  "https://mini-youtube-h6ex.onrender.com",
];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("CORS blocked: " + origin));
  },
  credentials: false, // no login/cookies
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
// ✅ Express 5 / path-to-regexp safe preflight (DO NOT use "*")
app.options(/.*/, cors(corsOptions));

/* ------------------ sanity routes ------------------ */
app.get("/", (req, res) => res.status(200).send("API OK ✅ (videos only)"));
app.get("/api/health", (req, res) => res.json({ ok: true }));

/* ------------------ uploads ------------------ */
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// serve uploaded files
app.use("/uploads", express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const safe = (file.originalname || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
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
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      mimetype TEXT,
      size INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

/* ------------------ VIDEOS ------------------ */
app.get("/api/videos", async (req, res) => {
  const rows = await db.all(`
    SELECT id, title, filename, mimetype, size, created_at
    FROM videos
    ORDER BY id DESC
    LIMIT 200
  `);

  const videos = rows.map((v) => ({
    ...v,
    url: `/uploads/${v.filename}`,
  }));

  res.json({ videos });
});

// upload (public)
app.post("/api/videos", upload.single("video"), async (req, res) => {
  const title = (req.body?.title || "").trim();
  const f = req.file;

  if (!title) return res.status(400).json({ error: "Missing title" });
  if (!f) return res.status(400).json({ error: "Missing file field 'video'" });

  const now = new Date().toISOString();

  const r = await db.run(
    `INSERT INTO videos (title, filename, mimetype, size, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    title,
    f.filename,
    f.mimetype || "",
    f.size || 0,
    now
  );

  res.json({
    ok: true,
    video: {
      id: r.lastID,
      title,
      filename: f.filename,
      url: `/uploads/${f.filename}`,
      mimetype: f.mimetype || "",
      size: f.size || 0,
      created_at: now,
    },
  });
});

// delete (public — add a secret later if you want)
app.delete("/api/videos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });

  const row = await db.get("SELECT * FROM videos WHERE id = ?", id);
  if (!row) return res.status(404).json({ error: "Not found" });

  await db.run("DELETE FROM videos WHERE id = ?", id);

  const filepath = path.join(UPLOAD_DIR, row.filename);
  try {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  } catch {}

  res.json({ ok: true });
});

/* ------------------ COMMENTS (optional, public) ------------------ */
app.get("/api/videos/:id/comments", async (req, res) => {
  const videoId = Number(req.params.id);
  if (!Number.isFinite(videoId)) return res.status(400).json({ error: "Bad id" });

  const rows = await db.all(
    `SELECT id, video_id, text, created_at
     FROM comments
     WHERE video_id = ?
     ORDER BY id DESC
     LIMIT 200`,
    videoId
  );

  res.json({ comments: rows });
});

app.post("/api/videos/:id/comments", async (req, res) => {
  const videoId = Number(req.params.id);
  if (!Number.isFinite(videoId)) return res.status(400).json({ error: "Bad id" });

  const text = (req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Missing text" });

  const now = new Date().toISOString();

  const r = await db.run(
    `INSERT INTO comments (video_id, text, created_at) VALUES (?, ?, ?)`,
    videoId,
    text,
    now
  );

  res.json({ ok: true, comment: { id: r.lastID, video_id: videoId, text, created_at: now } });
});

/* ------------------ API 404 ------------------ */
app.use("/api", (req, res) => res.status(404).json({ error: "API route not found" }));

/* ------------------ start ------------------ */
async function main() {
  await initDb();
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, "0.0.0.0", () => console.log("LISTENING ON", PORT));
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
