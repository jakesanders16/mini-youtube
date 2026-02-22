// RepRoom — server/index.js v9000
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
console.log("RepRoom API v9000 🏋️");
app.set("trust proxy", 1);
app.use(express.json());

const ALLOWED = ["http://localhost:5173","http://localhost:5174","https://mini-youtube-h6ex.onrender.com","https://mini-youtube-api-rgd4.onrender.com","capacitor://localhost","ionic://localhost"];
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
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar_filename TEXT,
      points INTEGER DEFAULT 0,
      points_alltime INTEGER DEFAULT 0,
      is_pro INTEGER DEFAULT 0,
      pro_expires_at TEXT,
      gym_id INTEGER,
      gender TEXT DEFAULT 'other',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gyms(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT,
      state TEXT,
      partner INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS videos(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      mimetype TEXT,
      size INTEGER,
      lift_type TEXT,
      weight_lbs REAL,
      tags TEXT,
      reaction_count INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      score REAL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS video_reactions(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      voter_key TEXT NOT NULL,
      user_id INTEGER,
      emoji TEXT NOT NULL DEFAULT '💪',
      created_at TEXT NOT NULL,
      UNIQUE(video_id,voter_key)
    );
    CREATE TABLE IF NOT EXISTS comments(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS monthly_points(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      UNIQUE(user_id,month)
    );
    CREATE TABLE IF NOT EXISTS personal_bests(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      lift_type TEXT NOT NULL,
      weight_lbs REAL NOT NULL,
      video_id INTEGER,
      set_at TEXT NOT NULL,
      UNIQUE(user_id,lift_type)
    );
    CREATE TABLE IF NOT EXISTS saves(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      video_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id,video_id)
    );
    CREATE TABLE IF NOT EXISTS follows(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(follower_id,following_id)
    );
    CREATE TABLE IF NOT EXISTS challenges(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenger_id INTEGER NOT NULL,
      opponent_id INTEGER NOT NULL,
      lift_type TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      pot_pts INTEGER DEFAULT 50,
      status TEXT DEFAULT 'pending',
      challenger_video_id INTEGER,
      opponent_video_id INTEGER,
      winner_id INTEGER,
      expires_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_vid_score ON videos(score DESC);
    CREATE INDEX IF NOT EXISTS idx_vid_created ON videos(created_at DESC);
  `);

  // Migrations for existing databases
  const cols = await db.all("PRAGMA table_info(videos)");
  const colNames = cols.map(c=>c.name);
  if (!colNames.includes("reaction_count")) {
    await db.exec("ALTER TABLE videos ADD COLUMN reaction_count INTEGER DEFAULT 0");
    if (colNames.includes("like_count")) await db.exec("UPDATE videos SET reaction_count=like_count");
  }
  if (!colNames.includes("score")) await db.exec("ALTER TABLE videos ADD COLUMN score REAL DEFAULT 0");

  // Ensure video_reactions table exists
  await db.exec(`CREATE TABLE IF NOT EXISTS video_reactions(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,voter_key TEXT NOT NULL,user_id INTEGER,
    emoji TEXT NOT NULL DEFAULT '💪',created_at TEXT NOT NULL,UNIQUE(video_id,voter_key))`);

  // Seed gyms
  const gc = await db.get("SELECT COUNT(*) c FROM gyms");
  if (gc.c === 0) {
    const gyms = [
      ["Iron Paradise","Port Chester","NY",1],["Gold's Gym","Venice","CA",1],
      ["Equinox","New York","NY",1],["Planet Fitness","Chicago","IL",0],
      ["LA Fitness","Los Angeles","CA",0],["CrossFit HQ","Washington","DC",0],
      ["24 Hour Fitness","San Francisco","CA",0],["YMCA","Boston","MA",0],
      ["Anytime Fitness","Austin","TX",0],["Other / Home Gym",null,null,0]
    ];
    for (const [n,c,s,p] of gyms) await db.run("INSERT INTO gyms(name,city,state,partner) VALUES(?,?,?,?)",n,c,s,p);
  }
}

const requireAuth = (req,res,next) => { try{ const t=req.headers.authorization?.split(" ")[1]; if(!t) return res.status(401).json({error:"Auth required"}); req.user=jwt.verify(t,JWT_SECRET); next(); } catch{ res.status(401).json({error:"Invalid token"}); }};
const optAuth    = (req,_,next)  => { try{ const t=req.headers.authorization?.split(" ")[1]; if(t) req.user=jwt.verify(t,JWT_SECRET); } catch{} next(); };
const voterKey   = req => { const ip=(req.headers["x-forwarded-for"]||req.ip||"").split(",")[0].trim(); const ua=req.headers["user-agent"]||""; return crypto.createHash("sha256").update(`${ip}::${ua}::${VOTE_SALT}`).digest("hex"); };
const safeUser   = u => ({id:u.id,username:u.username,email:u.email,bio:u.bio||"",points:u.points,points_alltime:u.points_alltime,is_pro:u.is_pro,gym_id:u.gym_id,gender:u.gender||"other",avatar_url:u.avatar_filename?`/uploads/${u.avatar_filename}`:null,created_at:u.created_at});
const fmtVideo   = v => ({...v,url:`/uploads/${v.filename}`,avatar_url:v.avatar_filename?`/uploads/${v.avatar_filename}`:null});
const curMonth   = () => new Date().toISOString().slice(0,7);
const daysLeft   = () => { const n=new Date(),e=new Date(n.getFullYear(),n.getMonth()+1,1); return Math.ceil((e-n)/86400000); };

// Algorithm: comments worth 3x, reactions 1x, views log-scaled, all time-decayed
async function updateScore(videoId) {
  const v = await db.get("SELECT comment_count,reaction_count,view_count,created_at FROM videos WHERE id=?", videoId);
  if (!v) return;
  const ageHours = (Date.now() - new Date(v.created_at)) / 3600000;
  const raw = (v.comment_count * 3) + v.reaction_count + Math.log(v.view_count + 1) * 0.5;
  await db.run("UPDATE videos SET score=? WHERE id=?", raw / Math.pow(ageHours + 2, 0.8), videoId);
}

async function addPts(userId,pts) {
  await db.run("UPDATE users SET points=points+?,points_alltime=points_alltime+? WHERE id=?",pts,pts,userId);
  await db.run("INSERT INTO monthly_points(user_id,month,points) VALUES(?,?,?) ON CONFLICT(user_id,month) DO UPDATE SET points=points+excluded.points",userId,curMonth(),pts);
}
async function subPts(userId,pts) {
  await db.run("UPDATE users SET points=MAX(0,points-?),points_alltime=MAX(0,points_alltime-?) WHERE id=?",pts,pts,userId);
}
async function recalcPts(userId) {
  const rows = await db.all("SELECT reaction_count,comment_count FROM videos WHERE user_id=?",userId);
  // 1pt per 5 reactions + 2pts per comment
  const total = rows.reduce((s,v)=>s+Math.floor(v.reaction_count/5)+(v.comment_count*2),0);
  await db.run("UPDATE users SET points=? WHERE id=?",total,userId);
  await db.run("INSERT INTO monthly_points(user_id,month,points) VALUES(?,?,?) ON CONFLICT(user_id,month) DO UPDATE SET points=excluded.points",userId,curMonth(),total);
}

app.get("/",           (_,res)=>res.send("RepRoom API v9000 🏋️"));
app.get("/api/health", (_,res)=>res.json({ok:true}));

/* ── AUTH ── */
app.post("/api/auth/register", async (req,res) => {
  const {username="",email="",password="",gym_id=null,gender="other"} = req.body||{};
  if(!username.trim()||!email.trim()||!password) return res.status(400).json({error:"Missing fields"});
  try{
    const hash=await bcrypt.hash(password,10),now=new Date().toISOString();
    const validGender = ["male","female","other"].includes(gender) ? gender : "other";
    const r=await db.run("INSERT INTO users(username,email,password_hash,gym_id,gender,created_at) VALUES(?,?,?,?,?,?)",username.trim(),email.trim().toLowerCase(),hash,gym_id?Number(gym_id):null,validGender,now);
    const user=await db.get("SELECT * FROM users WHERE id=?",r.lastID);
    const token=jwt.sign({id:user.id,username:user.username},JWT_SECRET,{expiresIn:"90d"});
    res.json({ok:true,token,user:safeUser(user)});
  }catch(e){
    if(e.message?.includes("UNIQUE")) res.status(400).json({error:"Username or email already taken"});
    else res.status(500).json({error:"Server error"});
  }
});

app.post("/api/auth/login", async (req,res) => {
  const {email="",password=""} = req.body||{};
  const user=await db.get("SELECT * FROM users WHERE email=?",email.trim().toLowerCase());
  if(!user||!await bcrypt.compare(password,user.password_hash)) return res.status(401).json({error:"Invalid email or password"});
  const token=jwt.sign({id:user.id,username:user.username},JWT_SECRET,{expiresIn:"90d"});
  res.json({ok:true,token,user:safeUser(user)});
});

app.get("/api/auth/me", requireAuth, async (req,res) => {
  const user=await db.get("SELECT * FROM users WHERE id=?",req.user.id);
  if(!user) return res.status(404).json({error:"Not found"});
  res.json({user:safeUser(user)});
});

app.put("/api/auth/me", requireAuth, async (req,res) => {
  const {username,bio,gym_id,gender} = req.body||{};
  const user=await db.get("SELECT * FROM users WHERE id=?",req.user.id);
  if(!user) return res.status(404).json({error:"Not found"});
  const newUsername = username?.trim()||user.username;
  const newBio = bio!==undefined ? bio : (user.bio||"");
  const newGym = gym_id!==undefined ? (gym_id?Number(gym_id):null) : user.gym_id;
  const newGender = ["male","female","other"].includes(gender) ? gender : (user.gender||"other");
  try{
    await db.run("UPDATE users SET username=?,bio=?,gym_id=?,gender=? WHERE id=?",newUsername,newBio,newGym,newGender,req.user.id);
    const updated=await db.get("SELECT * FROM users WHERE id=?",req.user.id);
    res.json({ok:true,user:safeUser(updated)});
  }catch(e){
    if(e.message?.includes("UNIQUE")) res.status(400).json({error:"Username taken"});
    else res.status(500).json({error:"Server error"});
  }
});

/* ── GYMS ── */
app.get("/api/gyms", async (_,res) => {
  res.json({gyms:await db.all("SELECT * FROM gyms ORDER BY partner DESC,name ASC")});
});

app.get("/api/gyms/battle", async (_,res) => {
  const gyms=await db.all(`SELECT g.id,g.name,COALESCE(SUM(m.points),0) pts FROM gyms g JOIN users u ON u.gym_id=g.id LEFT JOIN monthly_points m ON m.user_id=u.id AND m.month=? GROUP BY g.id HAVING pts>0 ORDER BY pts DESC LIMIT 2`,curMonth());
  res.json({gyms,month:curMonth()});
});

/* ── USERS ── */
app.get("/api/users/:id", optAuth, async (req,res) => {
  const userId=Number(req.params.id);
  const user=await db.get("SELECT * FROM users WHERE id=?",userId);
  if(!user) return res.status(404).json({error:"Not found"});
  const videos=await db.all(`SELECT v.*,u.username,u.avatar_filename,g.name gym_name FROM videos v JOIN users u ON u.id=v.user_id LEFT JOIN gyms g ON g.id=u.gym_id WHERE v.user_id=? ORDER BY v.created_at DESC`,userId);
  const pbs=await db.all("SELECT * FROM personal_bests WHERE user_id=? ORDER BY lift_type",userId);
  const fc=await db.get("SELECT COUNT(*) c FROM follows WHERE following_id=?",userId);
  const mp=await db.get("SELECT points FROM monthly_points WHERE user_id=? AND month=?",userId,curMonth());
  const rank=await db.get("SELECT (SELECT COUNT(*)+1 FROM monthly_points WHERE month=? AND points>m.points) r FROM monthly_points m WHERE user_id=? AND month=?",curMonth(),userId,curMonth());
  res.json({user:{...safeUser(user),followers:fc.c,monthly_points:mp?.points||0,monthly_rank:rank?.r||"—"},videos:videos.map(fmtVideo),pbs});
});

app.post("/api/users/:id/follow", requireAuth, async (req,res) => {
  const fid=Number(req.params.id);
  if(fid===req.user.id) return res.status(400).json({error:"Cannot follow yourself"});
  const ex=await db.get("SELECT id FROM follows WHERE follower_id=? AND following_id=?",req.user.id,fid);
  if(ex){ await db.run("DELETE FROM follows WHERE id=?",ex.id); res.json({ok:true,following:false}); }
  else{ await db.run("INSERT INTO follows(follower_id,following_id,created_at) VALUES(?,?,?)",req.user.id,fid,new Date().toISOString()); res.json({ok:true,following:true}); }
});

/* ── LEADERBOARD ── */
app.get("/api/leaderboard", async (req,res) => {
  const {period="month",gender="all",gym_id=null,lift="all"} = req.query;
  const month=curMonth();

  if(lift&&lift!=="all"){
    let q=`SELECT pb.user_id id,pb.lift_type,pb.weight_lbs pts,pb.set_at,u.username,u.avatar_filename,u.gender,g.name gym_name
           FROM personal_bests pb JOIN users u ON u.id=pb.user_id LEFT JOIN gyms g ON g.id=u.gym_id WHERE pb.lift_type=?`;
    const p=[lift];
    if(gender&&gender!=="all"){ q+=" AND u.gender=?"; p.push(gender); }
    q+=" ORDER BY pb.weight_lbs DESC LIMIT 50";
    const rows=await db.all(q,...p);
    return res.json({leaderboard:rows.map((r,i)=>({...r,rank:i+1,pts:r.weight_lbs,avatar_url:r.avatar_filename?`/uploads/${r.avatar_filename}`:null})),period:"lift",lift,gender,resets_in_days:null});
  }

  let rows;
  if (period==="alltime") {
    let q=`SELECT u.id,u.username,u.avatar_filename,u.points_alltime pts,u.is_pro,u.gym_id,u.gender,g.name gym_name,COUNT(v.id) video_count FROM users u LEFT JOIN gyms g ON g.id=u.gym_id LEFT JOIN videos v ON v.user_id=u.id`;
    const p=[],wheres=[];
    if(gender&&gender!=="all"){wheres.push("u.gender=?");p.push(gender);}
    if(gym_id){wheres.push("u.gym_id=?");p.push(Number(gym_id));}
    if(wheres.length) q+=" WHERE "+wheres.join(" AND ");
    q+=" GROUP BY u.id ORDER BY u.points_alltime DESC LIMIT 50";
    rows=await db.all(q,...p);
  } else {
    let q=`SELECT u.id,u.username,u.avatar_filename,COALESCE(m.points,0) pts,u.is_pro,u.gym_id,u.gender,g.name gym_name,COUNT(v.id) video_count FROM users u LEFT JOIN monthly_points m ON m.user_id=u.id AND m.month=? LEFT JOIN gyms g ON g.id=u.gym_id LEFT JOIN videos v ON v.user_id=u.id AND v.created_at>=?`;
    const p=[month,`${month}-01`],wheres=[];
    if(gender&&gender!=="all"){wheres.push("u.gender=?");p.push(gender);}
    if(gym_id){wheres.push("u.gym_id=?");p.push(Number(gym_id));}
    if(wheres.length) q+=" AND "+wheres.join(" AND ");
    q+=" GROUP BY u.id ORDER BY pts DESC LIMIT 50";
    rows=await db.all(q,...p);
  }
  res.json({leaderboard:rows.map((r,i)=>({...r,rank:i+1,avatar_url:r.avatar_filename?`/uploads/${r.avatar_filename}`:null})),period,gender,month,resets_in_days:daysLeft()});
});

/* ── VIDEOS ── */
app.get("/api/videos", optAuth, async (req,res) => {
  const {user_id,lift_type,feed,limit=20,offset=0}=req.query;
  let q=`SELECT v.*,u.username,u.avatar_filename,u.is_pro,g.name gym_name FROM videos v JOIN users u ON u.id=v.user_id LEFT JOIN gyms g ON g.id=u.gym_id WHERE 1=1`;
  const p=[];
  if(user_id){q+=" AND v.user_id=?";p.push(Number(user_id));}
  if(lift_type){q+=" AND v.lift_type=?";p.push(lift_type);}
  if(feed==="following"&&req.user){q+=" AND v.user_id IN(SELECT following_id FROM follows WHERE follower_id=?)";p.push(req.user.id);}
  q+=` ORDER BY v.score DESC,v.created_at DESC LIMIT ? OFFSET ?`;p.push(Number(limit),Number(offset));
  res.json({videos:(await db.all(q,...p)).map(fmtVideo)});
});

app.get("/api/videos/trending", async (_,res) => {
  const since=new Date();since.setDate(1);
  res.json({videos:(await db.all(`SELECT v.*,u.username,u.avatar_filename,u.is_pro,g.name gym_name FROM videos v JOIN users u ON u.id=v.user_id LEFT JOIN gyms g ON g.id=u.gym_id WHERE v.created_at>=? ORDER BY v.comment_count DESC,v.score DESC LIMIT 50`,since.toISOString())).map(fmtVideo)});
});

app.get("/api/videos/:id", optAuth, async (req,res) => {
  const v=await db.get(`SELECT v.*,u.username,u.avatar_filename,u.is_pro,g.name gym_name FROM videos v JOIN users u ON u.id=v.user_id LEFT JOIN gyms g ON g.id=u.gym_id WHERE v.id=?`,Number(req.params.id));
  if(!v) return res.status(404).json({error:"Not found"});
  await db.run("UPDATE videos SET view_count=view_count+1 WHERE id=?",v.id);
  await updateScore(v.id);
  res.json({video:fmtVideo(v)});
});

app.post("/api/videos", requireAuth, upload.single("video"), async (req,res) => {
  const title=((req.body?.title||"")).trim(),lift_type=(req.body?.lift_type||"").trim();
  const weight=parseFloat(req.body?.weight_lbs)||null,tags=(req.body?.tags||"").trim(),f=req.file;
  if(!title) return res.status(400).json({error:"Missing title"});
  if(!f) return res.status(400).json({error:"Missing video"});
  const now=new Date().toISOString();
  const r=await db.run("INSERT INTO videos(user_id,title,filename,mimetype,size,lift_type,weight_lbs,tags,score,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",req.user.id,title,f.filename,f.mimetype||"",f.size||0,lift_type,weight,tags,0,now);
  if(lift_type&&weight){
    const ex=await db.get("SELECT * FROM personal_bests WHERE user_id=? AND lift_type=?",req.user.id,lift_type);
    if(!ex||ex.weight_lbs<weight) await db.run("INSERT INTO personal_bests(user_id,lift_type,weight_lbs,video_id,set_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,lift_type) DO UPDATE SET weight_lbs=excluded.weight_lbs,video_id=excluded.video_id,set_at=excluded.set_at",req.user.id,lift_type,weight,r.lastID,now);
  }
  res.json({ok:true,video:{id:r.lastID,title,lift_type,weight_lbs:weight,url:`/uploads/${f.filename}`}});
});

app.delete("/api/videos/:id", requireAuth, async (req,res) => {
  const v=await db.get("SELECT * FROM videos WHERE id=?",Number(req.params.id));
  if(!v||v.user_id!==req.user.id) return res.status(403).json({error:"Forbidden"});
  await db.run("DELETE FROM videos WHERE id=?",v.id);
  await db.run("DELETE FROM video_reactions WHERE video_id=?",v.id);
  await db.run("DELETE FROM comments WHERE video_id=?",v.id);
  try{fs.unlinkSync(path.join(UPLOAD_DIR,v.filename));}catch{}
  await recalcPts(req.user.id);
  res.json({ok:true});
});

/* ── REACTIONS ── */
app.post("/api/videos/:id/react", optAuth, async (req,res) => {
  const vid=Number(req.params.id),vk=voterKey(req),now=new Date().toISOString();
  const emoji = ["💪","🔥","😤","👑","🤯"].includes(req.body?.emoji) ? req.body.emoji : "💪";
  const video=await db.get("SELECT * FROM videos WHERE id=?",vid);
  if(!video) return res.status(404).json({error:"Not found"});
  const ex=await db.get("SELECT id,emoji FROM video_reactions WHERE video_id=? AND voter_key=?",vid,vk);
  if(ex){
    if(ex.emoji===emoji){
      await db.run("DELETE FROM video_reactions WHERE id=?",ex.id);
      await db.run("UPDATE videos SET reaction_count=MAX(0,reaction_count-1) WHERE id=?",vid);
    } else {
      await db.run("UPDATE video_reactions SET emoji=? WHERE id=?",emoji,ex.id);
    }
  } else {
    await db.run("INSERT INTO video_reactions(video_id,voter_key,user_id,emoji,created_at) VALUES(?,?,?,?,?)",vid,vk,req.user?.id||null,emoji,now);
    await db.run("UPDATE videos SET reaction_count=reaction_count+1 WHERE id=?",vid);
  }
  await recalcPts(video.user_id);
  await updateScore(vid);
  const {reaction_count}=await db.get("SELECT reaction_count FROM videos WHERE id=?",vid);
  const myReaction=await db.get("SELECT emoji FROM video_reactions WHERE video_id=? AND voter_key=?",vid,vk);
  res.json({ok:true,reaction_count,my_reaction:myReaction?.emoji||null});
});

/* ── COMMENTS ── */
app.get("/api/videos/:id/comments", async (req,res) => {
  const rows=await db.all(`SELECT c.*,u.username,u.avatar_filename FROM comments c LEFT JOIN users u ON u.id=c.user_id WHERE c.video_id=? ORDER BY c.created_at ASC LIMIT 100`,Number(req.params.id));
  res.json({comments:rows.map(c=>({...c,avatar_url:c.avatar_filename?`/uploads/${c.avatar_filename}`:null}))});
});

app.post("/api/videos/:id/comments", requireAuth, async (req,res) => {
  const text=(req.body?.text||"").trim();
  if(!text) return res.status(400).json({error:"Empty comment"});
  const now=new Date().toISOString(),vid=Number(req.params.id);
  const r=await db.run("INSERT INTO comments(video_id,user_id,text,created_at) VALUES(?,?,?,?)",vid,req.user.id,text,now);
  await db.run("UPDATE videos SET comment_count=comment_count+1 WHERE id=?",vid);
  const video=await db.get("SELECT user_id FROM videos WHERE id=?",vid);
  if(video){await recalcPts(video.user_id);await updateScore(vid);}
  const user=await db.get("SELECT username,avatar_filename FROM users WHERE id=?",req.user.id);
  res.json({ok:true,comment:{id:r.lastID,video_id:vid,user_id:req.user.id,text,created_at:now,username:user.username,avatar_url:user.avatar_filename?`/uploads/${user.avatar_filename}`:null}});
});

/* ── SAVES ── */
app.post("/api/videos/:id/save", requireAuth, async (req,res) => {
  const vid=Number(req.params.id);
  const ex=await db.get("SELECT id FROM saves WHERE user_id=? AND video_id=?",req.user.id,vid);
  if(ex){await db.run("DELETE FROM saves WHERE id=?",ex.id);res.json({ok:true,saved:false});}
  else{await db.run("INSERT INTO saves(user_id,video_id,created_at) VALUES(?,?,?)",req.user.id,vid,new Date().toISOString());res.json({ok:true,saved:true});}
});

app.get("/api/saves", requireAuth, async (req,res) => {
  const videos=await db.all(`SELECT v.*,u.username,u.avatar_filename,g.name gym_name FROM saves s JOIN videos v ON v.id=s.video_id JOIN users u ON u.id=v.user_id LEFT JOIN gyms g ON g.id=u.gym_id WHERE s.user_id=? ORDER BY s.created_at DESC`,req.user.id);
  res.json({videos:videos.map(fmtVideo)});
});

/* ── PERSONAL BESTS ── */
app.put("/api/pbs/:lift", requireAuth, async (req,res) => {
  const lift=req.params.lift,weight=parseFloat(req.body?.weight_lbs);
  if(!weight) return res.status(400).json({error:"Missing weight"});
  await db.run("INSERT INTO personal_bests(user_id,lift_type,weight_lbs,set_at) VALUES(?,?,?,?) ON CONFLICT(user_id,lift_type) DO UPDATE SET weight_lbs=excluded.weight_lbs,set_at=excluded.set_at",req.user.id,lift,weight,new Date().toISOString());
  res.json({ok:true});
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
  if(ch.challenger_id!==req.user.id&&ch.opponent_id!==req.user.id) return res.status(403).json({error:"Not in challenge"});
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

app.use("/api",(_,res)=>res.status(404).json({error:"Not found"}));
app.use(express.static(path.join(__dirname,"public/dist")));
app.get("*",(_,res)=>res.sendFile(path.join(__dirname,"public/dist/index.html")));

async function main(){
  await initDb();
  const PORT=process.env.PORT||10000;
  app.listen(PORT,"0.0.0.0",()=>console.log(`RepRoom on ${PORT} 🏋️`));
}
main().catch(e=>{console.error("FATAL:",e);process.exit(1);});
