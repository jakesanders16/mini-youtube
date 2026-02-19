// server/index.js — VIDEOS + FORM CHECK FORUM (no login), Render-safe, CORS-safe, Express5-safe
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
console.log("BOOT VERSION: v4200 (VIDEOS + FORUM) ✅");

app.use(express.json({ limit: "2mb" }));

/* ------------------ CORS ------------------ */
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://mini-youtube-tawny.vercel.app",
  "https://mini-youtube-api-rgd4.onrender.com",
  "https://mini-youtubes.onrender.com",
  "https://mini-youtube-h6ex.onrender.com",
];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("CORS blocked: " + origin));
  },
  credentials: false,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
// ✅ Express 5 / path-to-regexp safe preflight (DO NOT use "*")
app.options(/.*/, cors(corsOptions));

/* ------------------ sanity routes ------------------ */
app.get("/", (_, res) => res.status(200).send("API OK ✅ (videos + forum)"));
app.get("/api/health", (_, res) => res.json({ ok: true }));

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

    /* videos */
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      mimetype TEXT,
      size INTEGER,
      created_at TEXT NOT NULL
    );

    /* forum posts */
    CREATE TABLE IF NOT EXISTS forum_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      video_url TEXT,      -- optional: direct url (ex: /uploads/xxx or full url)
      video_id INTEGER     -- optional: link to uploaded video by id
    );

    /* forum replies */
    CREATE TABLE IF NOT EXISTS forum_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at);
    CREATE INDEX IF NOT EXISTS idx_forum_replies_post_id ON forum_replies(post_id);
  `);
}

/* ------------------ helpers ------------------ */
function clampInt(n, def, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return def;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

function cleanText(s, maxLen) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function normalizeVideoUrl(v) {
  const u = String(v || "").trim();
  if (!u) return "";
  // allow relative /uploads/.. or full http(s)
  if (u.startsWith("/uploads/")) return u;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return "";
}

/* ------------------ VIDEOS ------------------ */
app.get("/api/videos", async (req, res) => {
  const limit = clampInt(req.query.limit, 200, 1, 500);

  const rows = await db.all(
    `SELECT id, title, filename, mimetype, size, created_at
     FROM videos
     ORDER BY id DESC
     LIMIT ?`,
    limit
  );

  const videos = rows.map((v) => ({
    ...v,
    url: `/uploads/${v.filename}`,
  }));

  res.json({ videos });
});

// upload (public) — FormData: title, video
app.post("/api/videos", upload.single("video"), async (req, res) => {
  const title = cleanText(req.body?.title, 120);
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

/* ------------------ FORM CHECK FORUM ------------------ */

// list posts (newest first)
app.get("/api/forum/posts", async (req, res) => {
  const limit = clampInt(req.query.limit, 50, 1, 200);

  const posts = await db.all(
    `SELECT p.id, p.title, p.body, p.created_at, p.video_url, p.video_id,
            (SELECT COUNT(1) FROM forum_replies r WHERE r.post_id = p.id) AS reply_count
     FROM forum_posts p
     ORDER BY p.id DESC
     LIMIT ?`,
    limit
  );

  res.json({ posts });
});

// create post
// JSON: { title, body, video_url?: string, video_id?: number }
app.post("/api/forum/posts", async (req, res) => {
  const title = cleanText(req.body?.title, 120);
  const body = cleanText(req.body?.body, 2000);
  const videoIdRaw = req.body?.video_id;
  const video_id = Number.isFinite(Number(videoIdRaw)) ? Number(videoIdRaw) : null;

  let video_url = normalizeVideoUrl(req.body?.video_url);

  // If they pass a video_id, auto-fill video_url from your uploads
  if (video_id) {
    const v = await db.get("SELECT filename FROM videos WHERE id = ?", video_id);
    if (!v) return res.status(400).json({ error: "video_id not found" });
    video_url = `/uploads/${v.filename}`;
  }

  if (!title) return res.status(400).json({ error: "Missing title" });
  if (!body) return res.status(400).json({ error: "Missing body" });

  const now = new Date().toISOString();

  const r = await db.run(
    `INSERT INTO forum_posts (title, body, created_at, video_url, video_id)
     VALUES (?, ?, ?, ?, ?)`,
    title,
    body,
    now,
    video_url || null,
    video_id || null
  );

  res.json({
    ok: true,
    post: {
      id: r.lastID,
      title,
      body,
      created_at: now,
      video_url: video_url || null,
      video_id: video_id || null,
      reply_count: 0,
    },
  });
});

// get one post + replies
app.get("/api/forum/posts/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });

  const post = await db.get(
    `SELECT id, title, body, created_at, video_url, video_id
     FROM forum_posts
     WHERE id = ?`,
    id
  );
  if (!post) return res.status(404).json({ error: "Not found" });

  const replies = await db.all(
    `SELECT id, post_id, body, created_at
     FROM forum_replies
     WHERE post_id = ?
     ORDER BY id ASC
     LIMIT 500`,
    id
  );

  res.json({ post, replies });
});

// reply to post
// JSON: { body }
app.post("/api/forum/posts/:id/replies", async (req, res) => {
  const post_id = Number(req.params.id);
  if (!Number.isFinite(post_id)) return res.status(400).json({ error: "Bad id" });

  const post = await db.get("SELECT id FROM forum_posts WHERE id = ?", post_id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const body = cleanText(req.body?.body, 1500);
  if (!body) return res.status(400).json({ error: "Missing body" });

  const now = new Date().toISOString();

  const r = await db.run(
    `INSERT INTO forum_replies (post_id, body, created_at) VALUES (?, ?, ?)`,
    post_id,
    body,
    now
  );

  res.json({
    ok: true,
    reply: { id: r.lastID, post_id, body, created_at: now },
  });
});

/* ------------------ API 404 ------------------ */
app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found" }));

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
