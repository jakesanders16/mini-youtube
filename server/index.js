// RepRoom — server/index.js v7000
// Points: likes only (10 likes = 1pt). Monthly reset. Challenges = 25pt pot.

import express from "express";
import cors from "cors";
import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const app = express();
console.log("RepRoom API v7000 🏋️");
app.set("trust proxy", 1);
app.use(express.json());

const ALLOWED = ["http://localhost:5173","http://localhost:5174","https://mini-youtube-h6ex.onrender.com","capacitor://localhost","ionic://localhost"];
const corsOpts = { origin:(o,cb)=>(!o||ALLOWED.includes(o))?cb(null,true):cb(new Error("CORS: "+o)), credentials:true, methods:["GET","POST","PUT","DELETE","OPTIONS"], allowedHeaders:["Content-Type","Authorization"] };
app.use(cors(corsOpts));
app.options(/.*/, cors(corsOpts));

const UPLOAD_DIR = path.join(__dirname,"uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR,{recursive:true});
app.use("/uploads", express.static(UPLOAD_DIR));
const storage = multer.diskStorage({ destination:(_,__,cb)=>cb(null,UPLOAD_DIR), filename:(_,file,cb)=>cb(null,`${Date.now()}__${(file.originalname||"file").replace(/[^a-zA-Z0-9._-]/g,"_")}`) });
const upload  = multer({storage, limits:{fileSize:500*1024*1024}});

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret";
const VOTE_SALT  = process.env.VOTE_SALT  || "dev-vote-salt";

let db;
async function initDb() {
  db = await open({filename:path.join(__dirname,"db.sqlite"),driver:sqlite3.Database});
  await db.exec(`
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT NOT NULL UNIQUE,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,bio TEXT DEFAULT '',avatar_filename TEXT,points INTEGER DEFAULT 0,points_alltime INTEGER DEFAULT 0,is_pro INTEGER DEFAULT 0,pro_expires_at TEXT,gym_id INTEGER,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS gyms(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,city TEXT,state TEXT,verified INTEGER DEFAULT 0,partner INTEGER DEFAULT 0,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS videos(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,title TEXT NOT NULL,filename TEXT NOT NULL,mimetype TEXT,size INTEGER,lift_type TEXT,weight_lbs REAL,tags TEXT,like_count INTEGER DEFAULT 0,view_count INTEGER DEFAULT 0,comment_count INTEGER DEFAULT 0,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS video_likes(id INTEGER PRIMARY KEY AUTOINCREMENT,video_id INTEGER NOT NULL,voter_key TEXT NOT NULL,user_id INTEGER,created_at TEXT NOT NULL,UNIQUE(video_id,voter_key));
    CREATE TABLE IF NOT EXISTS comments(id INTEGER PRIMARY KEY AUTOINCREMENT,video_id INTEGER NOT NULL,user_id INTEGER,text TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS personal_bests(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,lift_type TEXT NOT NULL,weight_lbs REAL NOT NULL,video_id INTEGER,set_at TEXT NOT NULL,UNIQUE(user_id,lift_type));
    CREATE TABLE IF NOT EXISTS challenges(id INTEGER PRIMARY KEY AUTOINCREMENT,challenger_id INTEGER NOT NULL,opponent_id INTEGER NOT NULL,lift_type TEXT NOT NULL,duration_days INTEGER NOT NULL,pot_pts INTEGER DEFAULT 50,status TEXT DEFAULT 'pending',winner_id INTEGER,challenger_video_id INTEGER,opponent_video_id INTEGER,expires_at TEXT,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS monthly_points(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,month TEXT NOT NULL,points INTEGER DEFAULT 0,UNIQUE(user_id,month));
    CREATE TABLE IF NOT EXISTS saves(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,video_id INTEGER NOT NULL,created_at TEXT NOT NULL,UNIQUE(user_id,video_id));
    CREATE TABLE IF NOT EXISTS follows(id INTEGER PRIMARY KEY AUTOINCREMENT,follower_id INTEGER NOT NULL,following_id INTEGER NOT NULL,created_at TEXT NOT NULL,UNIQUE(follower_id,following_id));
    CREATE INDEX IF NOT EXISTS idx_vid_user ON videos(user_id);
    CREATE INDEX IF NOT EXISTS idx_vid_likes ON videos(like_count DESC);
    CREATE INDEX IF NOT EXISTS idx_likes_vid ON video_likes(video_id);
    CREATE INDEX IF NOT EXISTS idx_cmt_vid ON comments(video_id);
    CREATE INDEX IF NOT EXISTS idx_pb_user ON personal_bests(user_id);
    CREATE INDEX IF NOT EXISTS idx_ch_chal ON challenges(challenger_id);
    CREATE INDEX IF NOT EXISTS idx_ch_opp ON challenges(opponent_id);
  `);
  const g = await db.get("SELECT id FROM gyms LIMIT 1");
  if (!g) await db.run("INSERT INTO gyms(name,city,state,verified,partner,created_at) VALUES(?,?,?,1,1,?)","LA Fitness","Port Chester","NY",new Date().toISOString());
}

/* ── helpers ── */
const makeJWT    = u => jwt.sign({id:u.id,username:u.username,email:u.email},JWT_SECRET,{expiresIn:"30d"});
const requireAuth = (req,res,next) => { const h=req.headers["authorization"]||""; const t=h.startsWith("Bearer ")?h.slice(7):null; if(!t) return res.status(401).json({error:"Not authenticated"}); try{req.user=jwt.verify(t,JWT_SECRET);next();}catch{return res.status(401).json({error:"Invalid token"});} };
const optAuth    = (req,_,next) => { const h=req.headers["authorization"]||""; const t=h.startsWith("Bearer ")?h.slice(7):null; if(t){try{req.user=jwt.verify(t,JWT_SECRET);}catch{}} next(); };
const voterKey   = req => { const ip=(req.headers["x-forwarded-for"]||req.ip||"").split(",")[0].trim(); const ua=req.headers["user-agent"]||""; return crypto.createHash("sha256").update(`${ip}::${ua}::${VOTE_SALT}`).digest("hex"); };
const safeUser   = u => ({id:u.id,username:u.username,email:u.email,bio:u.bio,points:u.points,points_alltime:u.points_alltime,is_pro:u.is_pro,gym_id:u.gym_id,avatar_url:u.avatar_filename?`/uploads/${u.avatar_filename}`:null,created_at:u.created_at});
const fmtVideo   = v => ({...v,url:`/uploads/${v.filename}`,avatar_url:v.avatar_filename?`/uploads/${v.avatar_filename}`:null});
const curMonth   = () => new Date().toISOString().slice(0,7);
const daysLeft   = () => { const n=new Date(),e=new Date(n.getFullYear(),n.getMonth()+1,1); return Math.ceil((e-n)/86400000); };

async function addPts(userId,pts) {
  await db.run("UPDATE users SET points=points+?,points_alltime=points_alltime+? WHERE id=?",pts,pts,userId);
  await db.run("INSERT INTO monthly_points(user_id,month,points) VALUES(?,?,?) ON CONFLICT(user_id,month) DO UPDATE SET points=points+excluded.points",userId,curMonth(),pts);
}
async function subPts(userId,pts) {
  await db.run("UPDATE users SET points=MAX(0,points-?),points_alltime=MAX(0,points_alltime-?) WHERE id=?",pts,pts,userId);
}
async function recalcPts(userId) {
  const rows = await db.all("SELECT like_count FROM videos WHERE user_id=?",userId);
  const total = rows.reduce((s,v)=>s+Math.floor(v.like_count/10),0);
  await db.run("UPDATE users SET points=? WHERE id=?",total,userId);
  await db.run("INSERT INTO monthly_points(user_id,month,points) VALUES(?,?,?) ON CONFLICT(user_id,month) DO UPDATE SET points=excluded.points",userId,curMonth(),total);
}

/* sanity */
app.get("/",           (_,res)=>res.send("RepRoom API v7000 🏋️"));
app.get("/api/health", (_,res)=>res.json({ok:true}));

/* ── AUTH ── */
app.post("/api/auth/register", async (req,res) => {
  const {username="",email="",password="",gym_id=null} = req.body||{};
  const u=username.trim(), e=email.trim().toLowerCase(), p=password;
  if(u.length<3) return res.status(400).json({error:"Username 3+ chars"});
  if(!e.includes("@")) return res.status(400).json({error:"Invalid email"});
  if(p.length<6) return res.status(400).json({error:"Password 6+ chars"});
  if(await db.get("SELECT id FROM users WHERE email=? OR username=?",e,u)) return res.status(409).json({error:"Email or username taken"});
  const hash=await bcrypt.hash(p,10), now=new Date().toISOString();
  const r=await db.run("INSERT INTO users(username,email,password_hash,points,points_alltime,gym_id,created_at) VALUES(?,?,?,0,0,?,?)",u,e,hash,gym_id,now);
  const user={id:r.lastID,username:u,email:e,points:0,points_alltime:0,is_pro:0};
  res.json({ok:true,token:makeJWT(user),user});
});

app.post("/api/auth/login", async (req,res) => {
  const e=(req.body?.email||"").trim().toLowerCase(), p=req.body?.password||"";
  const user=await db.get("SELECT * FROM users WHERE email=?",e);
  if(!user||!await bcrypt.compare(p,user.password_hash)) return res.status(401).json({error:"Invalid credentials"});
  res.json({ok:true,token:makeJWT(user),user:safeUser(user)});
});

app.get("/api/auth/me", requireAuth, async (req,res) => {
  const user=await db.get("SELECT * FROM users WHERE id=?",req.user.id);
  if(!user) return res.status(404).json({error:"Not found"});
  res.json({user:safeUser(user)});
});

app.put("/api/auth/me", requireAuth, upload.single("avatar"), async (req,res) => {
  const ups=[],vals=[];
  if(req.body?.bio!==undefined){ups.push("bio=?");vals.push(req.body.bio.trim());}
  if(req.body?.username){ups.push("username=?");vals.push(req.body.username.trim());}
  if(req.body?.gym_id){ups.push("gym_id=?");vals.push(Number(req.body.gym_id));}
  if(req.file){ups.push("avatar_filename=?");vals.push(req.file.filename);}
  if(!ups.length) return res.status(400).json({error:"Nothing to update"});
  vals.push(req.user.id);
  await db.run(`UPDATE users SET ${ups.join(",")} WHERE id=?`,...vals);
  res.json({ok:true,user:safeUser(await db.get("SELECT * FROM users WHERE id=?",req.user.id))});
});

/* public profile */
app.get("/api/users/:id", async (req,res) => {
  const user=await db.get("SELECT * FROM users WHERE id=?",Number(req.params.id));
  if(!user) return res.status(404).json({error:"Not found"});
  const [videos,pbs,{fc},{fg}] = await Promise.all([
    db.all("SELECT * FROM videos WHERE user_id=? ORDER BY created_at DESC LIMIT 30",user.id),
    db.all("SELECT * FROM personal_bests WHERE user_id=? ORDER BY lift_type",user.id),
    db.get("SELECT COUNT(*) fc FROM follows WHERE following_id=?",user.id),
    db.get("SELECT COUNT(*) fg FROM follows WHERE follower_id=?",user.id),
  ]);
  res.json({user:{...safeUser(user),followers:fc,following:fg},videos:videos.map(fmtVideo),pbs});
});

/* ── GYMS ── */
app.get("/api/gyms", async (_,res) => res.json({gyms:await db.all("SELECT * FROM gyms ORDER BY partner DESC,name")}));

app.get("/api/gyms/battle", async (_,res) => {
  const month=curMonth();
  const gyms=await db.all(`SELECT g.id,g.name,g.city,COALESCE(SUM(m.points),0) pts FROM gyms g LEFT JOIN users u ON u.gym_id=g.id LEFT JOIN monthly_points m ON m.user_id=u.id AND m.month=? GROUP BY g.id ORDER BY pts DESC LIMIT 10`,month);
  res.json({gyms,month});
});

app.get("/api/gyms/:id", async (req,res) => {
  const gym=await db.get("SELECT * FROM gyms WHERE id=?",Number(req.params.id));
  if(!gym) return res.status(404).json({error:"Not found"});
  const month=curMonth();
  const members=await db.all(`SELECT u.id,u.username,u.avatar_filename,COALESCE(m.points,0) pts,u.points_alltime FROM users u LEFT JOIN monthly_points m ON m.user_id=u.id AND m.month=? WHERE u.gym_id=? ORDER BY pts DESC LIMIT 50`,month,gym.id);
  res.json({gym,members:members.map((m,i)=>({...m,rank:i+1,avatar_url:m.avatar_filename?`/uploads/${m.avatar_filename}`:null}))});
});

/* ── VIDEOS ── */
app.get("/api/videos", optAuth, async (req,res) => {
  const {user_id,lift_type,feed,limit=20,offset=0}=req.query;
  let q=`SELECT v.*,u.username,u.avatar_filename,u.is_pro,g.name gym_name FROM videos v JOIN users u ON u.id=v.user_id LEFT JOIN gyms g ON g.id=u.gym_id WHERE 1=1`;
  const p=[];
  if(user_id){q+=" AND v.user_id=?";p.push(Number(user_id));}
  if(lift_type){q+=" AND v.lift_type=?";p.push(lift_type);}
  if(feed==="following"&&req.user){q+=" AND v.user_id IN(SELECT following_id FROM follows WHERE follower_id=?)";p.push(req.user.id);}
  q+=` ORDER BY v.created_at DESC LIMIT ? OFFSET ?`;p.push(Number(limit),Number(offset));
  res.json({videos:(await db.all(q,...p)).map(fmtVideo)});
});

app.get("/api/videos/trending", async (_,res) => {
  const since=new Date();since.setDate(1);
  res.json({videos:(await db.all(`SELECT v.*,u.username,u.avatar_filename,u.is_pro,g.name gym_name FROM videos v JOIN users u ON u.id=v.user_id LEFT JOIN gyms g ON g.id=u.gym_id WHERE v.created_at>=? ORDER BY v.like_count DESC,v.view_count DESC LIMIT 50`,since.toISOString())).map(fmtVideo)});
});

app.get("/api/videos/:id", optAuth, async (req,res) => {
  const v=await db.get(`SELECT v.*,u.username,u.avatar_filename,u.is_pro,g.name gym_name FROM videos v JOIN users u ON u.id=v.user_id LEFT JOIN gyms g ON g.id=u.gym_id WHERE v.id=?`,Number(req.params.id));
  if(!v) return res.status(404).json({error:"Not found"});
  await db.run("UPDATE videos SET view_count=view_count+1 WHERE id=?",v.id);
  res.json({video:fmtVideo(v)});
});

app.post("/api/videos", requireAuth, upload.single("video"), async (req,res) => {
  const title=((req.body?.title||"")).trim(),lift_type=(req.body?.lift_type||"").trim();
  const weight=parseFloat(req.body?.weight_lbs)||null,tags=(req.body?.tags||"").trim(),f=req.file;
  if(!title) return res.status(400).json({error:"Missing title"});
  if(!f) return res.status(400).json({error:"Missing video"});
  const now=new Date().toISOString();
  const r=await db.run("INSERT INTO videos(user_id,title,filename,mimetype,size,lift_type,weight_lbs,tags,created_at) VALUES(?,?,?,?,?,?,?,?,?)",req.user.id,title,f.filename,f.mimetype||"",f.size||0,lift_type,weight,tags,now);
  // auto PB
  if(lift_type&&weight){
    const ex=await db.get("SELECT * FROM personal_bests WHERE user_id=? AND lift_type=?",req.user.id,lift_type);
    if(!ex||ex.weight_lbs<weight) await db.run("INSERT INTO personal_bests(user_id,lift_type,weight_lbs,video_id,set_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,lift_type) DO UPDATE SET weight_lbs=excluded.weight_lbs,video_id=excluded.video_id,set_at=excluded.set_at",req.user.id,lift_type,weight,r.lastID,now);
  }
  res.json({ok:true,video:{id:r.lastID,title,lift_type,weight_lbs:weight,url:`/uploads/${f.filename}`}});
});

app.delete("/api/videos/:id", requireAuth, async (req,res) => {
  const v=await db.get("SELECT * FROM videos WHERE id=?",Number(req.params.id));
  if(!v) return res.status(404).json({error:"Not found"});
  if(v.user_id!==req.user.id) return res.status(403).json({error:"Forbidden"});
  await db.run("DELETE FROM videos WHERE id=?",v.id);
  await db.run("DELETE FROM video_likes WHERE video_id=?",v.id);
  await db.run("DELETE FROM comments WHERE video_id=?",v.id);
  try{fs.unlinkSync(path.join(UPLOAD_DIR,v.filename));}catch{}
  await recalcPts(req.user.id);
  res.json({ok:true});
});

/* ── LIKES ── */
app.post("/api/videos/:id/like", optAuth, async (req,res) => {
  const vid=Number(req.params.id),vk=voterKey(req),now=new Date().toISOString();
  const video=await db.get("SELECT * FROM videos WHERE id=?",vid);
  if(!video) return res.status(404).json({error:"Not found"});
  const ex=await db.get("SELECT id FROM video_likes WHERE video_id=? AND voter_key=?",vid,vk);
  if(ex){
    await db.run("DELETE FROM video_likes WHERE id=?",ex.id);
    await db.run("UPDATE videos SET like_count=MAX(0,like_count-1) WHERE id=?",vid);
  } else {
    await db.run("INSERT INTO video_likes(video_id,voter_key,user_id,created_at) VALUES(?,?,?,?)",vid,vk,req.user?.id||null,now);
    await db.run("UPDATE videos SET like_count=like_count+1 WHERE id=?",vid);
  }
  await recalcPts(video.user_id);
  const {like_count}=await db.get("SELECT like_count FROM videos WHERE id=?",vid);
  res.json({ok:true,liked:!ex,like_count});
});

/* ── COMMENTS ── */
app.get("/api/videos/:id/comments", async (req,res) => {
  const rows=await db.all(`SELECT c.*,u.username,u.avatar_filename FROM comments c LEFT JOIN users u ON u.id=c.user_id WHERE c.video_id=? ORDER BY c.created_at ASC LIMIT 100`,Number(req.params.id));
  res.json({comments:rows.map(c=>({...c,avatar_url:c.avatar_filename?`/uploads/${c.avatar_filename}`:null}))});
});

app.post("/api/videos/:id/comments", optAuth, async (req,res) => {
  const vid=Number(req.params.id),text=(req.body?.text||"").trim();
  if(!text) return res.status(400).json({error:"Missing text"});
  const now=new Date().toISOString();
  const r=await db.run("INSERT INTO comments(video_id,user_id,text,created_at) VALUES(?,?,?,?)",vid,req.user?.id||null,text,now);
  await db.run("UPDATE videos SET comment_count=comment_count+1 WHERE id=?",vid);
  res.json({ok:true,comment:{id:r.lastID,video_id:vid,text,created_at:now,username:req.user?.username||"Anonymous"}});
});

/* ── PBs ── */
app.get("/api/users/:id/pbs", async (req,res) => {
  const pbs=await db.all("SELECT pb.*,v.filename video_fn FROM personal_bests pb LEFT JOIN videos v ON v.id=pb.video_id WHERE pb.user_id=? ORDER BY lift_type",Number(req.params.id));
  res.json({pbs:pbs.map(pb=>({...pb,video_url:pb.video_fn?`/uploads/${pb.video_fn}`:null}))});
});

app.put("/api/pbs/:lift", requireAuth, async (req,res) => {
  const lift=req.params.lift,weight=parseFloat(req.body?.weight_lbs),vid=req.body?.video_id||null;
  if(!weight) return res.status(400).json({error:"Missing weight_lbs"});
  const now=new Date().toISOString();
  await db.run("INSERT INTO personal_bests(user_id,lift_type,weight_lbs,video_id,set_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,lift_type) DO UPDATE SET weight_lbs=excluded.weight_lbs,video_id=excluded.video_id,set_at=excluded.set_at",req.user.id,lift,weight,vid,now);
  res.json({ok:true,pb:{lift_type:lift,weight_lbs:weight,set_at:now}});
});

/* ── SAVES ── */
app.post("/api/videos/:id/save", requireAuth, async (req,res) => {
  const vid=Number(req.params.id),now=new Date().toISOString();
  const ex=await db.get("SELECT id FROM saves WHERE user_id=? AND video_id=?",req.user.id,vid);
  if(ex){await db.run("DELETE FROM saves WHERE id=?",ex.id);return res.json({ok:true,saved:false});}
  await db.run("INSERT INTO saves(user_id,video_id,created_at) VALUES(?,?,?)",req.user.id,vid,now);
  res.json({ok:true,saved:true});
});

app.get("/api/saves", requireAuth, async (req,res) => {
  const rows=await db.all(`SELECT v.*,u.username,u.avatar_filename FROM saves s JOIN videos v ON v.id=s.video_id JOIN users u ON u.id=v.user_id WHERE s.user_id=? ORDER BY s.created_at DESC LIMIT 50`,req.user.id);
  res.json({videos:rows.map(fmtVideo)});
});

/* ── FOLLOWS ── */
app.post("/api/users/:id/follow", requireAuth, async (req,res) => {
  const tid=Number(req.params.id);
  if(tid===req.user.id) return res.status(400).json({error:"Can't follow yourself"});
  const ex=await db.get("SELECT id FROM follows WHERE follower_id=? AND following_id=?",req.user.id,tid);
  if(ex){await db.run("DELETE FROM follows WHERE id=?",ex.id);return res.json({ok:true,following:false});}
  await db.run("INSERT INTO follows(follower_id,following_id,created_at) VALUES(?,?,?)",req.user.id,tid,new Date().toISOString());
  res.json({ok:true,following:true});
});

/* ── LEADERBOARD ── */
app.get("/api/leaderboard", async (req,res) => {
  const {period="month",gym_id}=req.query,month=curMonth();
  let rows;
  if(period==="alltime"){
    let q=`SELECT u.id,u.username,u.avatar_filename,u.points_alltime pts,u.is_pro,u.gym_id,g.name gym_name,COUNT(v.id) video_count FROM users u LEFT JOIN gyms g ON g.id=u.gym_id LEFT JOIN videos v ON v.user_id=u.id`;
    const p=[];
    if(gym_id){q+=" WHERE u.gym_id=?";p.push(Number(gym_id));}
    q+=" GROUP BY u.id ORDER BY u.points_alltime DESC LIMIT 50";
    rows=await db.all(q,...p);
  } else {
    let q=`SELECT u.id,u.username,u.avatar_filename,COALESCE(m.points,0) pts,u.is_pro,u.gym_id,g.name gym_name,COUNT(v.id) video_count FROM users u LEFT JOIN monthly_points m ON m.user_id=u.id AND m.month=? LEFT JOIN gyms g ON g.id=u.gym_id LEFT JOIN videos v ON v.user_id=u.id AND v.created_at>=?`;
    const p=[month,`${month}-01`];
    if(gym_id){q+=" AND u.gym_id=?";p.push(Number(gym_id));}
    q+=" GROUP BY u.id ORDER BY pts DESC LIMIT 50";
    rows=await db.all(q,...p);
  }
  res.json({leaderboard:rows.map((r,i)=>({...r,rank:i+1,avatar_url:r.avatar_filename?`/uploads/${r.avatar_filename}`:null})),period,month,resets_in_days:daysLeft()});
});

/* ── CHALLENGES ── */
app.post("/api/challenges", requireAuth, async (req,res) => {
  const {opponent_id,lift_type,duration_days}=req.body||{};
  if(!opponent_id||!lift_type||!duration_days) return res.status(400).json({error:"Missing fields"});
  const me=await db.get("SELECT points FROM users WHERE id=?",req.user.id);
  if(me.points<25) return res.status(400).json({error:"Need 25 pts to challenge"});
  await subPts(req.user.id,25);
  const now=new Date().toISOString(),exp=new Date(Date.now()+Number(duration_days)*86400000).toISOString();
  const r=await db.run("INSERT INTO challenges(challenger_id,opponent_id,lift_type,duration_days,pot_pts,status,expires_at,created_at) VALUES(?,?,?,?,50,'pending',?,?)",req.user.id,opponent_id,lift_type,duration_days,exp,now);
  res.json({ok:true,challenge:{id:r.lastID,lift_type,status:"pending"}});
});

app.post("/api/challenges/:id/accept", requireAuth, async (req,res) => {
  const ch=await db.get("SELECT * FROM challenges WHERE id=?",Number(req.params.id));
  if(!ch||ch.opponent_id!==req.user.id||ch.status!=="pending") return res.status(400).json({error:"Invalid"});
  const me=await db.get("SELECT points FROM users WHERE id=?",req.user.id);
  if(me.points<25) return res.status(400).json({error:"Need 25 pts"});
  await subPts(req.user.id,25);
  await db.run("UPDATE challenges SET status='active' WHERE id=?",ch.id);
  res.json({ok:true});
});

app.post("/api/challenges/:id/decline", requireAuth, async (req,res) => {
  const ch=await db.get("SELECT * FROM challenges WHERE id=?",Number(req.params.id));
  if(!ch||ch.opponent_id!==req.user.id||ch.status!=="pending") return res.status(400).json({error:"Invalid"});
  await addPts(ch.challenger_id,25);
  await db.run("UPDATE challenges SET status='declined' WHERE id=?",ch.id);
  res.json({ok:true});
});

app.post("/api/challenges/:id/submit", requireAuth, async (req,res) => {
  const ch=await db.get("SELECT * FROM challenges WHERE id=?",Number(req.params.id));
  if(!ch||ch.status!=="active") return res.status(400).json({error:"Invalid"});
  const isMe=ch.challenger_id===req.user.id||ch.opponent_id===req.user.id;
  if(!isMe) return res.status(403).json({error:"Not in challenge"});
  const field=ch.challenger_id===req.user.id?"challenger_video_id":"opponent_video_id";
  await db.run(`UPDATE challenges SET ${field}=? WHERE id=?`,Number(req.body?.video_id),ch.id);
  const up=await db.get("SELECT * FROM challenges WHERE id=?",ch.id);
  if(up.challenger_video_id&&up.opponent_video_id){
    const cv=await db.get("SELECT weight_lbs FROM videos WHERE id=?",up.challenger_video_id);
    const ov=await db.get("SELECT weight_lbs FROM videos WHERE id=?",up.opponent_video_id);
    const cw=cv?.weight_lbs||0,ow=ov?.weight_lbs||0;
    if(cw===ow){await addPts(ch.challenger_id,25);await addPts(ch.opponent_id,25);await db.run("UPDATE challenges SET status='tie' WHERE id=?",ch.id);}
    else{const win=cw>ow?ch.challenger_id:ch.opponent_id;await addPts(win,50);await db.run("UPDATE challenges SET status='complete',winner_id=? WHERE id=?",win,ch.id);}
  }
  res.json({ok:true});
});

app.get("/api/challenges", requireAuth, async (req,res) => {
  const rows=await db.all(`SELECT c.*,cu.username chal_name,cu.avatar_filename chal_av,ou.username opp_name,ou.avatar_filename opp_av FROM challenges c JOIN users cu ON cu.id=c.challenger_id JOIN users ou ON ou.id=c.opponent_id WHERE c.challenger_id=? OR c.opponent_id=? ORDER BY c.created_at DESC LIMIT 30`,req.user.id,req.user.id);
  res.json({challenges:rows});
});

/* ── PRO ── */
app.post("/api/pro/activate", requireAuth, async (req,res) => {
  const exp=new Date(Date.now()+30*86400000).toISOString();
  await db.run("UPDATE users SET is_pro=1,pro_expires_at=? WHERE id=?",exp,req.user.id);
  res.json({ok:true,pro:true,expires_at:exp});
});

app.get("/api/pro/status", requireAuth, async (req,res) => {
  const u=await db.get("SELECT is_pro,pro_expires_at FROM users WHERE id=?",req.user.id);
  res.json({pro:u.is_pro&&(!u.pro_expires_at||new Date(u.pro_expires_at)>new Date()),expires_at:u.pro_expires_at});
});

app.get("/api/videos/:id/analytics", requireAuth, async (req,res) => {
  const u=await db.get("SELECT is_pro FROM users WHERE id=?",req.user.id);
  if(!u.is_pro) return res.status(403).json({error:"Pro required"});
  const v=await db.get("SELECT * FROM videos WHERE id=? AND user_id=?",Number(req.params.id),req.user.id);
  if(!v) return res.status(404).json({error:"Not found"});
  const by_day=await db.all("SELECT DATE(created_at) day,COUNT(*) count FROM video_likes WHERE video_id=? GROUP BY day ORDER BY day DESC LIMIT 30",v.id);
  res.json({video:v,likes_by_day:by_day,pt_value:Math.floor(v.like_count/10)});
});

app.use("/api",(_,res)=>res.status(404).json({error:"Not found"}));

async function main(){
  await initDb();
  const PORT=process.env.PORT||10000;
  app.listen(PORT,"0.0.0.0",()=>console.log(`RepRoom on ${PORT} 🏋️`));
}
main().catch(e=>{console.error("FATAL:",e);process.exit(1);});
