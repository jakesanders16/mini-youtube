// RepRoom — src/App.jsx
// Full app: Feed, Trending, Ranks, Notifications, Upload, Profile, My Profile

import { useState, useEffect, useRef, useCallback } from "react";

const API = "https://mini-youtube-api-rgd4.onrender.com";const token = () => localStorage.getItem("rr_token");
const headers = (extra = {}) => ({ "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}), ...extra });

async function api(method, path, body) {
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  return r.json();
}

// ─── FONTS + GLOBAL CSS ───────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Outfit:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --black:#060505;--black2:#0e0c0b;--black3:#161412;--black4:#1f1c1a;--black5:#282420;
  --gold:#c8a45a;--gold2:#e2bc72;--gold3:#f5dfa0;--golddim:rgba(200,164,90,0.10);--goldglow:rgba(200,164,90,0.22);
  --white:#f2ece0;--white2:#c8bfb0;--muted:#5a534a;--muted2:#3a332c;
  --red:#b83232;--green:#2a7a4a;
  --fd:'Playfair Display',serif;--fb:'Outfit',sans-serif;
}
html,body{height:100%;background:var(--black);color:var(--white);font-family:var(--fb);-webkit-font-smoothing:antialiased;overflow:hidden}
input,select,textarea,button{font-family:var(--fb)}
::-webkit-scrollbar{width:0}
.scroll{overflow-y:auto;flex:1}
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────
const ago = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const fmtNum = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n || 0);
const LIFT_EMOJI = { Deadlift: "🏋️", Squat: "🦵", "Bench Press": "💪", "Overhead Press": "🙌", Other: "🔥" };
const LIFT_TYPES = ["Deadlift", "Squat", "Bench Press", "Overhead Press", "Other"];
const BG_GRADIENTS = [
  "radial-gradient(ellipse at 30% 60%,#1a0f00,#060505 70%)",
  "radial-gradient(ellipse at 60% 40%,#001a08,#060505 70%)",
  "radial-gradient(ellipse at 40% 50%,#0a0018,#060505 70%)",
  "radial-gradient(ellipse at 50% 30%,#1a0008,#060505 70%)",
  "radial-gradient(ellipse at 20% 70%,#001818,#060505 70%)",
  "radial-gradient(ellipse at 70% 60%,#181800,#060505 70%)",
];

// ─── TOAST ────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:"var(--black3)",border:"1px solid var(--gold)",borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:600,color:"var(--white)",zIndex:9999,boxShadow:"0 4px 24px rgba(0,0,0,.6)",whiteSpace:"nowrap" }}>
      {msg}
    </div>
  );
}

// ─── AVATAR ───────────────────────────────────────────────────────────────
function Avatar({ user, size = 38, style = {} }) {
  const initials = (user?.username || "?")[0].toUpperCase();
  const COLORS = ["linear-gradient(135deg,#c8a45a,#e2bc72)","#1e3d5c","#1a4a2e","#3a1a5a","#5a1a00","#1a1a5a","#5a3a00"];
  const idx = (user?.id || 0) % COLORS.length;
  if (user?.avatar_url) {
    return <img src={API + user.avatar_url} alt="" style={{ width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0,...style }} />;
  }
  return (
    <div style={{ width:size,height:size,borderRadius:"50%",background:COLORS[idx],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:size*0.38,color:idx===0?"#000":"#fff",flexShrink:0,...style }}>
      {initials}
    </div>
  );
}

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username:"", email:"", password:"" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(""); setLoading(true);
    const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "login" ? { email: form.email, password: form.password } : form;
    const r = await api("POST", path, body);
    setLoading(false);
    if (r.error) { setErr(r.error); return; }
    localStorage.setItem("rr_token", r.token);
    onAuth(r.user);
  };

  return (
    <div style={{ height:"100vh",background:"var(--black)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ fontFamily:"var(--fd)",fontSize:42,fontWeight:900,background:"linear-gradient(135deg,var(--gold2),var(--gold))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:6 }}>RepRoom</div>
      <div style={{ fontSize:12,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase",marginBottom:40 }}>If it's not on video, it didn't happen.</div>

      <div style={{ width:"100%",maxWidth:360 }}>
        {mode === "register" && (
          <input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="Username" style={inputStyle} />
        )}
        <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email" type="email" style={inputStyle} />
        <input value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Password" type="password" style={inputStyle} onKeyDown={e=>e.key==="Enter"&&submit()} />
        {err && <div style={{ color:"var(--red)",fontSize:13,marginBottom:12 }}>{err}</div>}
        <button onClick={submit} disabled={loading} style={goldBtn}>{loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}</button>
        <div style={{ textAlign:"center",marginTop:14,fontSize:13,color:"var(--muted)",cursor:"pointer" }} onClick={()=>setMode(mode==="login"?"register":"login")}>
          {mode === "login" ? "New here? Create account" : "Already have an account? Sign in"}
        </div>
      </div>
    </div>
  );
}

const inputStyle = { width:"100%",background:"var(--black2)",border:"1px solid rgba(255,255,255,0.08)",color:"var(--white)",padding:"12px 16px",borderRadius:12,fontSize:14,outline:"none",marginBottom:10,display:"block" };
const goldBtn = { width:"100%",background:"linear-gradient(135deg,var(--gold),var(--gold2))",color:"#000",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:900,cursor:"pointer",marginBottom:8 };

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────
function BottomNav({ tab, setTab, hasNotif }) {
  const items = [
    { id:"feed",     icon:"🏠", label:"Feed" },
    { id:"trending", icon:"🔥", label:"Trending" },
    { id:"upload",   icon:"＋", label:"", isPost:true },
    { id:"ranks",    icon:"👑", label:"Ranks" },
    { id:"profile",  icon:"👤", label:"Me" },
  ];
  return (
    <nav style={{ height:62,background:"rgba(6,5,5,0.97)",borderTop:"1px solid rgba(200,164,90,0.15)",display:"flex",alignItems:"center",justifyContent:"space-around",flexShrink:0,position:"relative",zIndex:100,backdropFilter:"blur(20px)" }}>
      {items.map(item => item.isPost ? (
        <div key="upload" onClick={()=>setTab("upload")} style={{ width:52,height:52,borderRadius:16,marginTop:-18,background:"linear-gradient(145deg,var(--gold2),var(--gold))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,cursor:"pointer",border:"3px solid var(--black)",boxShadow:"0 4px 20px rgba(200,164,90,0.4)",flexShrink:0 }}>
          ＋
        </div>
      ) : (
        <button key={item.id} onClick={()=>setTab(item.id)} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",padding:"6px 14px",background:"none",border:"none",color:tab===item.id?"var(--gold)":"var(--muted)",position:"relative" }}>
          <span style={{ fontSize:20,lineHeight:1 }}>{item.icon}</span>
          <span style={{ fontSize:9,fontWeight:700,letterSpacing:.8,textTransform:"uppercase" }}>{item.label}</span>
          {item.id==="ranks" && hasNotif && <span style={{ position:"absolute",top:4,right:10,width:7,height:7,background:"var(--gold)",borderRadius:"50%",border:"1.5px solid var(--black)" }} />}
        </button>
      ))}
    </nav>
  );
}

// ─── VIDEO CARD (feed) ────────────────────────────────────────────────────
function VideoSlide({ video, isCurrent, onComment, onProfile, toast }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(video?.like_count || 0);
  const [saved, setSaved] = useState(false);
  const bg = BG_GRADIENTS[(video?.id || 0) % BG_GRADIENTS.length];

  const like = async () => {
    const r = await api("POST", `/api/videos/${video.id}/like`);
    if (!r.error) { setLiked(r.liked); setLikes(r.like_count); }
  };
  const save = async () => {
    if (!token()) { toast("Sign in to save videos"); return; }
    const r = await api("POST", `/api/videos/${video.id}/save`);
    if (!r.error) { setSaved(r.saved); toast(r.saved ? "Saved ✓" : "Removed from saved"); }
  };

  return (
    <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column" }}>
      {/* BG */}
      <div style={{ position:"absolute",inset:0,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:96 }}>
        {LIFT_EMOJI[video?.lift_type] || "🏋️"}
      </div>
      {/* Gradients */}
      <div style={{ position:"absolute",top:0,left:0,right:0,height:"35%",background:"linear-gradient(to bottom,rgba(0,0,0,.75),transparent)",pointerEvents:"none" }} />
      <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"60%",background:"linear-gradient(to top,rgba(0,0,0,.92) 0%,rgba(0,0,0,.4) 60%,transparent)",pointerEvents:"none" }} />

      {/* King badge */}
      {video?.is_king && (
        <div style={{ position:"absolute",top:72,right:12,zIndex:10,background:"linear-gradient(135deg,#a07830,var(--gold2))",borderRadius:20,padding:"5px 12px 5px 8px",display:"flex",alignItems:"center",gap:5,fontSize:11,fontWeight:800,color:"#000",boxShadow:"0 4px 16px rgba(200,164,90,0.45)" }}>
          👑 King of the Month
        </div>
      )}

      {/* Right rail */}
      <div style={{ position:"absolute",right:12,bottom:100,zIndex:10,display:"flex",flexDirection:"column",gap:22,alignItems:"center" }}>
        {[
          { icon: liked ? "❤️" : "🤍", count: fmtNum(likes), action: like, active: liked },
          { icon: "💬", count: fmtNum(video?.comment_count), action: onComment },
          { icon: "↗", count: "Share", action: ()=>toast("Share copied!") },
          { icon: saved ? "🔖" : "🔖", count: "Save", action: save, active: saved },
        ].map((btn, i) => (
          <div key={i} onClick={btn.action} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer" }}>
            <div style={{ width:48,height:48,borderRadius:"50%",background:btn.active?"rgba(200,164,90,0.25)":"rgba(255,255,255,0.1)",backdropFilter:"blur(12px)",border:`1px solid ${btn.active?"var(--gold)":"rgba(255,255,255,0.12)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:21 }}>
              {btn.icon}
            </div>
            <div style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.85)" }}>{btn.count}</div>
          </div>
        ))}
      </div>

      {/* Video info */}
      <div style={{ position:"absolute",bottom:72,left:14,right:76,zIndex:10 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
          <div onClick={()=>onProfile(video?.user_id)} style={{ cursor:"pointer" }}>
            <Avatar user={{ id:video?.user_id, username:video?.username, avatar_url:video?.avatar_url }} size={42} style={{ border:"2px solid var(--gold)" }} />
          </div>
          <div>
            <div style={{ fontWeight:700,fontSize:14 }}>{video?.username}</div>
            <div style={{ fontSize:11,color:"var(--gold2)",fontWeight:500 }}>{video?.gym_name || "RepRoom"}</div>
          </div>
        </div>
        {video?.lift_type && (
          <div style={{ display:"inline-flex",alignItems:"center",gap:5,background:"rgba(200,164,90,0.18)",border:"1px solid rgba(200,164,90,0.35)",borderRadius:20,padding:"4px 10px",fontSize:11,fontWeight:700,color:"var(--gold2)",marginBottom:8 }}>
            {LIFT_EMOJI[video.lift_type]} {video.lift_type}{video.weight_lbs ? ` · ${video.weight_lbs} lbs` : ""}
          </div>
        )}
        <div style={{ fontFamily:"var(--fd)",fontSize:17,fontWeight:700,lineHeight:1.25,marginBottom:6,textShadow:"0 2px 10px rgba(0,0,0,.9)" }}>{video?.title}</div>
        <div style={{ fontSize:11,color:"var(--gold2)",fontWeight:500 }}>{video?.tags}</div>
      </div>

      {/* Swipe hint */}
      {isCurrent && (
        <div style={{ position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",gap:2,opacity:.5 }}>
          <div style={{ width:14,height:9,borderLeft:"2px solid #fff",borderTop:"2px solid #fff",transform:"rotate(135deg)" }} />
          <div style={{ fontSize:9,color:"#fff",letterSpacing:1 }}>SWIPE UP</div>
        </div>
      )}
    </div>
  );
}

// ─── COMMENTS SHEET ───────────────────────────────────────────────────────
function CommentsSheet({ videoId, open, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!open || !videoId) return;
    api("GET", `/api/videos/${videoId}/comments`).then(r => setComments(r.comments || []));
  }, [open, videoId]);

  const send = async () => {
    if (!text.trim()) return;
    const r = await api("POST", `/api/videos/${videoId}/comments`, { text });
    if (!r.error) { setComments(prev => [...prev, r.comment]); setText(""); }
  };

  return (
    <>
      {open && <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.55)",zIndex:49 }} />}
      <div style={{ position:"absolute",bottom:open?0:"-100%",left:0,right:0,height:"72%",background:"var(--black2)",borderTop:"1px solid rgba(200,164,90,0.18)",borderRadius:"22px 22px 0 0",zIndex:50,transition:"bottom .32s cubic-bezier(.32,0,.67,0)",display:"flex",flexDirection:"column" }}>
        <div style={{ width:38,height:4,background:"var(--black5)",borderRadius:2,margin:"14px auto 0",flexShrink:0 }} />
        <div style={{ padding:"10px 18px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ fontFamily:"var(--fd)",fontSize:17,fontWeight:700 }}>{comments.length} Comments</div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"var(--muted)",fontSize:20,cursor:"pointer" }}>✕</button>
        </div>
        <div className="scroll" style={{ padding:"14px 18px" }}>
          {comments.map(c => (
            <div key={c.id} style={{ display:"flex",gap:10,marginBottom:18 }}>
              <Avatar user={{ id:c.user_id, username:c.username, avatar_url:c.avatar_url }} size={34} />
              <div>
                <div style={{ fontWeight:700,fontSize:13,marginBottom:2 }}>{c.username || "Anonymous"}</div>
                <div style={{ fontSize:13,color:"var(--white2)",lineHeight:1.45 }}>{c.text}</div>
                <div style={{ fontSize:10,color:"var(--muted)",marginTop:4 }}>{ago(c.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex",gap:8,padding:"12px 14px",borderTop:"1px solid rgba(255,255,255,0.05)",flexShrink:0 }}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Add a comment..." style={{ flex:1,background:"var(--black3)",border:"1px solid rgba(200,164,90,0.2)",color:"var(--white)",borderRadius:22,padding:"10px 16px",fontSize:13,outline:"none" }} />
          <button onClick={send} style={{ width:40,height:40,background:"var(--gold)",border:"none",borderRadius:"50%",color:"#000",fontSize:18,cursor:"pointer",fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>↑</button>
        </div>
      </div>
    </>
  );
}

// ─── FEED PAGE ────────────────────────────────────────────────────────────
function FeedPage({ onProfile, toast }) {
  const [videos, setVideos] = useState([]);
  const [cur, setCur] = useState(0);
  const [feedTab, setFeedTab] = useState("foryou");
  const [commentVideo, setCommentVideo] = useState(null);
  const stackRef = useRef(null);
  const touchY = useRef(0);

  useEffect(() => {
    const feed = feedTab === "following" ? "following" : undefined;
    api("GET", `/api/videos${feed ? `?feed=${feed}` : ""}`).then(r => { setVideos(r.videos || []); setCur(0); });
  }, [feedTab]);

  const go = useCallback((dir) => {
    setCur(c => Math.max(0, Math.min(videos.length - 1, c + dir)));
  }, [videos.length]);

  useEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    const wheel = e => { if (e.deltaY > 40) go(1); else if (e.deltaY < -40) go(-1); };
    const ts    = e => { touchY.current = e.touches[0].clientY; };
    const te    = e => { const dy = touchY.current - e.changedTouches[0].clientY; if (dy > 50) go(1); else if (dy < -50) go(-1); };
    el.addEventListener("wheel", wheel, { passive: true });
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchend", te, { passive: true });
    return () => { el.removeEventListener("wheel",wheel); el.removeEventListener("touchstart",ts); el.removeEventListener("touchend",te); };
  }, [go]);

  const slideStyle = (i) => {
    const diff = i - cur;
    return { position:"absolute",inset:0,transform:`translateY(${diff*100}%)`,transition:"transform .38s cubic-bezier(.32,0,.67,0)",willChange:"transform" };
  };

  return (
    <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative",background:"var(--black)" }}>
      {/* Header */}
      <div style={{ position:"absolute",top:0,left:0,right:0,zIndex:20,padding:"16px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontFamily:"var(--fd)",fontSize:22,fontWeight:900,background:"linear-gradient(135deg,var(--gold2),var(--gold))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>RepRoom</div>
        <div style={{ display:"flex",gap:18 }}>
          {["foryou","following"].map(t => (
            <div key={t} onClick={()=>setFeedTab(t)} style={{ fontSize:13,fontWeight:600,color:feedTab===t?"var(--white)":"var(--muted)",cursor:"pointer",paddingBottom:2,borderBottom:feedTab===t?"1.5px solid var(--gold)":"1.5px solid transparent" }}>
              {t === "foryou" ? "For You" : "Following"}
            </div>
          ))}
        </div>
        <div style={{ width:36 }} />
      </div>

      {/* Video stack */}
      <div ref={stackRef} style={{ position:"absolute",inset:0,overflow:"hidden" }}>
        {videos.map((v, i) => (
          <div key={v.id} style={slideStyle(i)}>
            <VideoSlide video={v} isCurrent={i===cur} onComment={()=>setCommentVideo(v.id)} onProfile={onProfile} toast={toast} />
          </div>
        ))}
        {videos.length === 0 && (
          <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"var(--muted)" }}>
            <div style={{ fontSize:48 }}>🏋️</div>
            <div style={{ fontFamily:"var(--fd)",fontSize:20 }}>No videos yet</div>
            <div style={{ fontSize:13 }}>Be the first to post a lift</div>
          </div>
        )}
      </div>

      {/* Comments */}
      <CommentsSheet videoId={commentVideo} open={!!commentVideo} onClose={()=>setCommentVideo(null)} />
    </div>
  );
}

// ─── TRENDING PAGE ────────────────────────────────────────────────────────
function TrendingPage({ onProfile }) {
  const [videos, setVideos] = useState([]);
  useEffect(() => { api("GET","/api/videos/trending").then(r=>setVideos(r.videos||[])); }, []);

  return (
    <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"var(--black)" }}>
      <div style={{ padding:"20px 18px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)",flexShrink:0 }}>
        <div style={{ fontSize:9,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:"var(--gold)",marginBottom:4 }}>🔥 This Month</div>
        <div style={{ fontFamily:"var(--fd)",fontSize:30,fontWeight:900,lineHeight:1 }}>Trending</div>
      </div>
      <div className="scroll">
        {videos.map((v, i) => (
          <div key={v.id} onClick={()=>onProfile(v.user_id)} style={{ display:"flex",gap:12,padding:"14px 18px",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer" }}
            onMouseEnter={e=>e.currentTarget.style.background="var(--black3)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div style={{ fontFamily:"var(--fd)",fontSize:28,fontWeight:900,color:i<3?"var(--gold)":"var(--muted2)",width:32,flexShrink:0,lineHeight:1,paddingTop:2 }}>{i+1}</div>
            <div style={{ width:72,height:96,borderRadius:10,flexShrink:0,background:BG_GRADIENTS[v.id%BG_GRADIENTS.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:28 }}>
              {LIFT_EMOJI[v.lift_type]||"🏋️"}
            </div>
            <div style={{ flex:1 }}>
              {v.lift_type && (
                <div style={{ display:"inline-flex",alignItems:"center",gap:4,background:"var(--golddim)",border:"1px solid rgba(200,164,90,0.25)",borderRadius:20,padding:"3px 8px",fontSize:10,fontWeight:700,color:"var(--gold2)",marginBottom:6 }}>
                  {LIFT_EMOJI[v.lift_type]} {v.lift_type}{v.weight_lbs?` · ${v.weight_lbs}lbs`:""}
                </div>
              )}
              <div style={{ fontWeight:700,fontSize:14,marginBottom:6,lineHeight:1.3 }}>{v.title}</div>
              <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:8 }}>
                <Avatar user={{ id:v.user_id,username:v.username,avatar_url:v.avatar_url }} size={20} />
                <span style={{ fontSize:12,color:"var(--white2)",fontWeight:500 }}>{v.username}</span>
              </div>
              <div style={{ display:"flex",gap:12 }}>
                <span style={{ fontSize:11,color:i<3?"var(--gold)":"var(--muted)",fontWeight:600 }}>❤️ {fmtNum(v.like_count)}</span>
                <span style={{ fontSize:11,color:"var(--muted)",fontWeight:600 }}>💬 {fmtNum(v.comment_count)}</span>
                <span style={{ fontSize:11,color:"var(--muted)",fontWeight:600 }}>👁 {fmtNum(v.view_count)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CHALLENGE MODAL ──────────────────────────────────────────────────────
function ChallengeModal({ target, myPts, onClose, onSent }) {
  const [lift, setLift] = useState("Deadlift");
  const [dur, setDur]   = useState(7);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    setLoading(true); setErr("");
    const r = await api("POST","/api/challenges",{ opponent_id:target.id, lift_type:lift, duration_days:dur });
    setLoading(false);
    if (r.error) { setErr(r.error); return; }
    onSent();
  };

  if (!target) return null;
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(10px)" }}>
      <div style={{ background:"var(--black2)",border:"1px solid rgba(200,164,90,0.3)",borderRadius:"24px 24px 0 0",padding:"28px 24px 36px",width:"100%",maxWidth:430,boxShadow:"0 -20px 60px rgba(0,0,0,.8)" }}>
        <div style={{ width:38,height:4,background:"var(--black5)",borderRadius:2,margin:"0 auto 20px" }} />
        <div style={{ fontFamily:"var(--fd)",fontSize:26,fontWeight:900,textAlign:"center",marginBottom:4 }}>Issue a Challenge</div>
        <div style={{ textAlign:"center",color:"var(--muted)",fontSize:13,marginBottom:22 }}>You vs {target.username} · post your lift on video. Winner takes 50 pts.</div>

        {/* VS */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:22 }}>
          <div style={{ textAlign:"center" }}>
            <Avatar user={{ id:0,username:"You" }} size={56} style={{ margin:"0 auto 6px" }} />
            <div style={{ fontSize:13,fontWeight:700 }}>You</div>
            <div style={{ fontFamily:"var(--fd)",fontSize:16,color:"var(--gold)" }}>{myPts} pts</div>
          </div>
          <div style={{ fontFamily:"var(--fd)",fontSize:24,color:"var(--muted)" }}>VS</div>
          <div style={{ textAlign:"center" }}>
            <Avatar user={target} size={56} style={{ margin:"0 auto 6px" }} />
            <div style={{ fontSize:13,fontWeight:700 }}>{target.username}</div>
            <div style={{ fontFamily:"var(--fd)",fontSize:16,color:"var(--gold)" }}>{target.pts} pts</div>
          </div>
        </div>

        {/* Lift */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"var(--muted)",marginBottom:10 }}>Pick the Lift</div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {LIFT_TYPES.map(l => (
              <div key={l} onClick={()=>setLift(l)} style={{ padding:"8px 14px",borderRadius:20,border:`1px solid ${lift===l?"var(--gold)":"rgba(255,255,255,0.1)"}`,fontSize:12,fontWeight:700,color:lift===l?"var(--gold)":"var(--muted)",cursor:"pointer",background:lift===l?"var(--golddim)":"transparent" }}>
                {LIFT_EMOJI[l]} {l}
              </div>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"var(--muted)",marginBottom:10 }}>Duration</div>
          <div style={{ display:"flex",gap:8 }}>
            {[3,7,14].map(d => (
              <div key={d} onClick={()=>setDur(d)} style={{ flex:1,textAlign:"center",padding:10,border:`1px solid ${dur===d?"var(--gold)":"rgba(255,255,255,0.08)"}`,borderRadius:12,fontSize:13,fontWeight:700,color:dur===d?"var(--gold)":"var(--muted)",cursor:"pointer",background:dur===d?"var(--golddim)":"transparent" }}>
                {d===3?"3 Days":d===7?"1 Week":"2 Weeks"}
              </div>
            ))}
          </div>
        </div>

        {/* Pot */}
        <div style={{ background:"var(--golddim)",border:"1px solid rgba(200,164,90,0.2)",borderRadius:12,padding:"12px 16px",textAlign:"center",marginBottom:20 }}>
          <div style={{ fontFamily:"var(--fd)",fontSize:28,fontWeight:900,color:"var(--gold2)" }}>25 pts each → 50 pt pot</div>
          <div style={{ fontSize:11,color:"var(--muted)",marginTop:2 }}>Winner takes all · post your lift on video to compete</div>
        </div>

        {err && <div style={{ color:"var(--red)",fontSize:13,marginBottom:12,textAlign:"center" }}>{err}</div>}
        <button onClick={send} disabled={loading} style={goldBtn}>{loading ? "Sending..." : "⚔ Send Challenge"}</button>
        <div onClick={onClose} style={{ textAlign:"center",marginTop:12,fontSize:13,color:"var(--muted)",cursor:"pointer" }}>Cancel</div>
      </div>
    </div>
  );
}

// ─── RANKS PAGE ───────────────────────────────────────────────────────────
function RanksPage({ myUser, toast }) {
  const [period, setPeriod]     = useState("month");
  const [lb, setLb]             = useState([]);
  const [gymBattle, setGymBattle] = useState(null);
  const [meta, setMeta]         = useState({});
  const [challengeTarget, setChallengeTarget] = useState(null);

  useEffect(() => {
    api("GET",`/api/leaderboard?period=${period}`).then(r => { setLb(r.leaderboard||[]); setMeta(r); });
    api("GET","/api/gyms/battle").then(r => setGymBattle(r));
  }, [period]);

  const king = lb[0];
  const myRow = lb.find(r => r.id === myUser?.id);

  return (
    <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"var(--black)" }}>
      <div className="scroll">
        <div style={{ padding:"20px 16px 10px" }}>
          <div style={{ fontSize:9,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:"var(--gold)",marginBottom:4 }}>⚔ Port Chester</div>
          <div style={{ fontFamily:"var(--fd)",fontSize:30,fontWeight:900,lineHeight:1,marginBottom:4 }}>The Rankings</div>
          <div style={{ fontSize:11,color:"var(--muted)" }}>Resets in {meta.resets_in_days||"?"} days · Points from video likes only</div>
        </div>

        {/* King Card */}
        {king && (
          <div style={{ margin:"0 16px 16px",borderRadius:18,padding:20,background:"linear-gradient(135deg,#110d00,#1e1800,#110d00)",border:"1px solid rgba(200,164,90,0.4)",boxShadow:"0 8px 40px rgba(200,164,90,0.12)",position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",top:-60,right:-60,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(200,164,90,0.12),transparent 70%)" }} />
            <div style={{ fontSize:9,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:"var(--gold)",marginBottom:14 }}>👑 King of the Month</div>
            <div style={{ display:"flex",alignItems:"center",gap:14 }}>
              <Avatar user={king} size={64} style={{ border:"2px solid var(--gold)",boxShadow:"0 4px 20px rgba(200,164,90,0.4)" }} />
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"var(--fd)",fontSize:22,fontWeight:900,marginBottom:2 }}>{king.username}</div>
                <div style={{ fontSize:11,color:"var(--gold2)",fontWeight:600,marginBottom:8 }}>{king.gym_name || "RepRoom"}</div>
                <div style={{ fontFamily:"var(--fd)",fontSize:36,fontWeight:900,color:"var(--gold2)",lineHeight:1 }}>{king.pts}</div>
                <div style={{ fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:1 }}>points this month</div>
              </div>
              {king.id !== myUser?.id && (
                <button onClick={()=>setChallengeTarget({...king,pts:king.pts})} style={{ background:"linear-gradient(135deg,var(--gold),var(--gold2))",color:"#000",border:"none",borderRadius:12,padding:"10px 16px",fontSize:12,fontWeight:900,cursor:"pointer",boxShadow:"0 4px 14px rgba(200,164,90,0.3)",whiteSpace:"nowrap" }}>
                  ⚔ Challenge
                </button>
              )}
            </div>
          </div>
        )}

        {/* Gym Battle */}
        {gymBattle?.gyms?.length >= 2 && (
          <div style={{ margin:"0 16px 14px",padding:16,borderRadius:16,background:"var(--black2)",border:"1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"var(--muted)",marginBottom:12 }}>🏛 Gym Battle · This Month</div>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"var(--gold)",marginBottom:3 }}>{gymBattle.gyms[0].name}</div>
                <div style={{ fontFamily:"var(--fd)",fontSize:26,fontWeight:900,color:"var(--gold)" }}>{gymBattle.gyms[0].pts}</div>
              </div>
              <div style={{ width:34,height:34,borderRadius:"50%",background:"var(--black3)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:"var(--muted)",flexShrink:0 }}>VS</div>
              <div style={{ flex:1,textAlign:"right" }}>
                <div style={{ fontSize:13,fontWeight:700,marginBottom:3 }}>{gymBattle.gyms[1]?.name}</div>
                <div style={{ fontFamily:"var(--fd)",fontSize:26,fontWeight:900,color:"var(--muted)" }}>{gymBattle.gyms[1]?.pts}</div>
              </div>
            </div>
            <div style={{ height:3,background:"var(--black4)",borderRadius:2,overflow:"hidden" }}>
              <div style={{ height:"100%",background:"linear-gradient(90deg,var(--gold),var(--gold2))",width:`${Math.round((gymBattle.gyms[0].pts/(gymBattle.gyms[0].pts+gymBattle.gyms[1]?.pts||1))*100)}%` }} />
            </div>
          </div>
        )}

        {/* Period */}
        <div style={{ display:"flex",gap:6,padding:"0 16px 14px" }}>
          {[["month","This Month"],["alltime","All Time"]].map(([v,l]) => (
            <div key={v} onClick={()=>setPeriod(v)} style={{ padding:"7px 16px",borderRadius:20,fontSize:12,fontWeight:700,border:`1px solid ${period===v?"rgba(200,164,90,0.35)":"rgba(255,255,255,0.08)"}`,color:period===v?"var(--gold)":"var(--muted)",cursor:"pointer",background:period===v?"var(--golddim)":"transparent" }}>
              {l}
            </div>
          ))}
        </div>

        {/* List */}
        <div style={{ padding:"0 16px",display:"flex",flexDirection:"column",gap:6,paddingBottom:16 }}>
          {lb.map((row, i) => {
            const isMe = row.id === myUser?.id;
            const rankIcon = i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`;
            return (
              <div key={row.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:isMe?"var(--golddim)":"var(--black2)",border:`1px solid ${isMe?"rgba(200,164,90,0.28)":"rgba(255,255,255,0.04)"}`,borderRadius:14 }}>
                <div style={{ fontFamily:"var(--fd)",fontSize:18,fontWeight:900,width:26,textAlign:"center",flexShrink:0,color:i<3?"var(--gold)":"var(--muted)" }}>{rankIcon}</div>
                <Avatar user={row} size={38} />
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:6,marginBottom:2 }}>
                    {row.username}
                    {isMe && <span style={{ background:"var(--gold)",color:"#000",fontSize:9,fontWeight:900,padding:"1px 6px",borderRadius:6,letterSpacing:.5 }}>YOU</span>}
                    {i===0 && <span style={{ fontSize:15 }}>👑</span>}
                  </div>
                  <div style={{ fontSize:11,color:"var(--muted)" }}>{row.video_count} videos</div>
                </div>
                <div style={{ fontFamily:"var(--fd)",fontSize:22,fontWeight:900,color:"var(--gold)" }}>{row.pts}</div>
                {!isMe && row.id !== myUser?.id && (
                  <button onClick={()=>setChallengeTarget({...row,pts:row.pts})} style={{ background:"none",border:"1px solid rgba(200,164,90,0.3)",color:"var(--gold)",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap" }}>⚔</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {challengeTarget && (
        <ChallengeModal
          target={challengeTarget}
          myPts={myUser?.points || 0}
          onClose={()=>setChallengeTarget(null)}
          onSent={()=>{ setChallengeTarget(null); toast("Challenge sent! ⚔"); }}
        />
      )}
    </div>
  );
}

// ─── UPLOAD PAGE ──────────────────────────────────────────────────────────
function UploadPage({ onDone, toast }) {
  const [form, setForm]     = useState({ title:"", lift_type:"Deadlift", weight_lbs:"", tags:"" });
  const [file, setFile]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState("");
  const fileRef = useRef();

  const submit = async () => {
    if (!file) { setErr("Please choose a video file"); return; }
    if (!form.title.trim()) { setErr("Please add a title"); return; }
    setLoading(true); setErr("");
    const fd = new FormData();
    fd.append("video", file);
    fd.append("title", form.title);
    fd.append("lift_type", form.lift_type);
    fd.append("weight_lbs", form.weight_lbs);
    fd.append("tags", form.tags);
    const r = await fetch(`${API}/api/videos`, { method:"POST", headers:{ Authorization:`Bearer ${token()}` }, body:fd }).then(x=>x.json());
    setLoading(false);
    if (r.error) { setErr(r.error); return; }
    toast("Video posted! 🔥");
    onDone();
  };

  return (
    <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"var(--black)" }}>
      <div className="scroll" style={{ padding:"24px 18px 32px" }}>
        <div style={{ fontSize:9,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:"var(--gold)",marginBottom:6 }}>Post Your Lift</div>
        <div style={{ fontFamily:"var(--fd)",fontSize:32,fontWeight:900,marginBottom:20,lineHeight:1 }}>New Video</div>

        {/* Drop zone */}
        <div onClick={()=>fileRef.current.click()} style={{ border:`1px dashed ${file?"var(--gold)":"rgba(200,164,90,0.35)"}`,borderRadius:18,padding:"48px 24px",textAlign:"center",cursor:"pointer",background:"var(--golddim)",marginBottom:24,position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",inset:0,background:"radial-gradient(circle at 50% 0%,rgba(200,164,90,0.07),transparent 70%)" }} />
          <div style={{ fontSize:44,marginBottom:10 }}>🎬</div>
          <div style={{ fontFamily:"var(--fd)",fontSize:20,fontWeight:900,marginBottom:4 }}>{file ? file.name : "Drop your clip"}</div>
          <div style={{ fontSize:12,color:"var(--muted)",marginBottom:14 }}>MP4 or MOV · max 500MB</div>
          <button style={{ background:"var(--gold)",color:"#000",border:"none",borderRadius:12,padding:"10px 22px",fontSize:13,fontWeight:800,cursor:"pointer" }}>
            {file ? "Change File" : "Choose from Library"}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="video/*" style={{ display:"none" }} onChange={e=>setFile(e.target.files[0])} />

        {/* Lift type */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"var(--muted)",marginBottom:8,display:"block" }}>Lift Type</div>
          <select value={form.lift_type} onChange={e=>setForm({...form,lift_type:e.target.value})} style={{ ...inputStyle,background:"var(--black2)" }}>
            {LIFT_TYPES.map(l=><option key={l}>{l}</option>)}
          </select>
        </div>

        {/* Weight */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"var(--muted)",marginBottom:8 }}>Weight (lbs)</div>
          <input value={form.weight_lbs} onChange={e=>setForm({...form,weight_lbs:e.target.value})} placeholder="470" type="number" style={inputStyle} />
        </div>

        {/* Title */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"var(--muted)",marginBottom:8 }}>Caption</div>
          <textarea value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="6 months of work. Finally." style={{ ...inputStyle,resize:"vertical",minHeight:80 }} />
        </div>

        {/* Tags */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"var(--muted)",marginBottom:8 }}>Tags</div>
          <input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="#deadlift #portchester #pr" style={inputStyle} />
        </div>

        {/* Info box */}
        <div style={{ background:"var(--golddim)",border:"1px solid rgba(200,164,90,0.2)",borderRadius:12,padding:"12px 14px",marginBottom:18,fontSize:12,color:"var(--white2)",lineHeight:1.5 }}>
          ✨ <strong style={{ color:"var(--gold)" }}>Points are earned from likes.</strong> Every 10 likes = +1 pt. Great content = more points. No farming.
        </div>

        {err && <div style={{ color:"var(--red)",fontSize:13,marginBottom:12 }}>{err}</div>}
        <button onClick={submit} disabled={loading} style={goldBtn}>{loading ? "Uploading..." : "🚀 Post to RepRoom"}</button>
      </div>
    </div>
  );
}

// ─── PUBLIC PROFILE PAGE ─────────────────────────────────────────────────
function ProfilePage({ userId, myUser, onBack, toast }) {
  const [data, setData] = useState(null);
  const [tab, setTab]   = useState("videos");
  const [following, setFollowing] = useState(false);
  const [saves, setSaves]         = useState([]);
  const [challenges, setChallenges] = useState([]);

  const isMe = userId === myUser?.id;

  useEffect(() => {
    if (!userId) return;
    api("GET",`/api/users/${userId}`).then(r => { setData(r); });
    if (isMe) {
      api("GET","/api/saves").then(r=>setSaves(r.videos||[]));
      api("GET","/api/challenges").then(r=>setChallenges(r.challenges||[]));
    }
  }, [userId, isMe]);

  const follow = async () => {
    const r = await api("POST",`/api/users/${userId}/follow`);
    if (!r.error) setFollowing(r.following);
  };

  if (!data) return <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)",fontSize:14 }}>Loading...</div>;

  const { user, videos, pbs } = data;
  const displayVideos = tab==="saved"&&isMe ? saves : tab==="challenges"&&isMe ? [] : videos;

  return (
    <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"var(--black)" }}>
      {onBack && (
        <div onClick={onBack} style={{ padding:"14px 18px 0",flexShrink:0,cursor:"pointer",color:"var(--gold)",fontSize:13,fontWeight:700 }}>← Back</div>
      )}
      <div className="scroll">
        {/* Banner */}
        <div style={{ height:150,position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#0e0900,#1c1400,#0a0800)",flexShrink:0 }}>
          <div style={{ position:"absolute",inset:0,opacity:.12,backgroundImage:"repeating-linear-gradient(45deg,var(--gold) 0,var(--gold) 1px,transparent 0,transparent 50%)",backgroundSize:"18px 18px" }} />
          <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"60%",background:"linear-gradient(to bottom,transparent,var(--black))" }} />
        </div>

        <div style={{ padding:"0 16px 24px" }}>
          {/* Avatar row */}
          <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginTop:-36,marginBottom:14,position:"relative",zIndex:2 }}>
            <Avatar user={user} size={78} style={{ border:"3px solid var(--black)",boxShadow:"0 4px 20px rgba(200,164,90,0.35)" }} />
            {isMe ? (
              <button style={{ background:"transparent",border:"1px solid rgba(200,164,90,0.35)",color:"var(--gold)",borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:2 }}>
                Edit Profile
              </button>
            ) : (
              <button onClick={follow} style={{ background:following?"transparent":"var(--gold)",color:following?"var(--gold)":"#000",border:following?"1px solid var(--gold)":"none",borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:800,cursor:"pointer",marginBottom:2 }}>
                {following ? "Following" : "Follow"}
              </button>
            )}
          </div>

          <div style={{ fontFamily:"var(--fd)",fontSize:24,fontWeight:900,marginBottom:2 }}>{user.username}</div>
          <div style={{ color:"var(--muted)",fontSize:12,marginBottom:5 }}>@{user.username.toLowerCase()}</div>
          {user.bio && <div style={{ fontSize:13,color:"var(--white2)",lineHeight:1.55,marginBottom:12 }}>{user.bio}</div>}

          {/* Stats */}
          <div style={{ display:"flex",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,overflow:"hidden",marginBottom:16 }}>
            {[
              { val:user.points,    lbl:"Points",    gold:true },
              { val:`#${user.monthly_rank||"—"}`, lbl:"Rank" },
              { val:videos.length,  lbl:"Videos" },
              { val:user.followers||0, lbl:"Followers" },
            ].map((s,i,arr) => (
              <div key={i} style={{ flex:1,padding:"13px 6px",textAlign:"center",background:"var(--black2)",borderRight:i<arr.length-1?"1px solid rgba(255,255,255,0.06)":"none" }}>
                <div style={{ fontFamily:"var(--fd)",fontSize:20,fontWeight:900,lineHeight:1,marginBottom:3,color:s.gold?"var(--gold)":"var(--white)" }}>{s.val}</div>
                <div style={{ fontSize:9,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.7,fontWeight:700 }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* Personal Bests */}
          {pbs?.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontFamily:"var(--fd)",fontSize:18,fontWeight:900,marginBottom:10 }}>Personal Bests</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                {pbs.map(pb => (
                  <div key={pb.id} style={{ background:"var(--black2)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:14,padding:14 }}>
                    <div style={{ fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:4 }}>{pb.lift_type}</div>
                    <div style={{ fontFamily:"var(--fd)",fontSize:28,fontWeight:900,color:"var(--gold2)",lineHeight:1 }}>{pb.weight_lbs}<span style={{ fontSize:12,color:"var(--muted)",marginLeft:3 }}>lbs</span></div>
                    <div style={{ fontSize:10,color:"var(--muted)",marginTop:4 }}>{new Date(pb.set_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display:"flex",borderBottom:"1px solid rgba(255,255,255,0.06)",marginBottom:14 }}>
            {(isMe ? ["videos","challenges","saved"] : ["videos"]).map(t => (
              <div key={t} onClick={()=>setTab(t)} style={{ flex:1,textAlign:"center",padding:"11px 4px",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:.7,color:tab===t?"var(--gold)":"var(--muted)",cursor:"pointer",borderBottom:tab===t?"2px solid var(--gold)":"2px solid transparent",marginBottom:-1 }}>
                {t}
              </div>
            ))}
          </div>

          {/* Video grid */}
          {tab !== "challenges" && (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2 }}>
              {displayVideos.map(v => (
                <div key={v.id} style={{ aspectRatio:"9/16",position:"relative",overflow:"hidden",cursor:"pointer",background:BG_GRADIENTS[v.id%BG_GRADIENTS.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:28 }}>
                  {LIFT_EMOJI[v.lift_type]||"🏋️"}
                  <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.75) 0%,transparent 50%)" }} />
                  <div style={{ position:"absolute",bottom:5,left:6,fontSize:10,fontWeight:800,color:"#fff" }}>▶ {fmtNum(v.view_count)}</div>
                  {v.weight_lbs && <div style={{ position:"absolute",top:5,left:6,fontSize:9,fontWeight:800,color:"var(--gold2)" }}>{v.weight_lbs}lbs</div>}
                </div>
              ))}
            </div>
          )}

          {/* Challenges tab */}
          {tab === "challenges" && isMe && (
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {challenges.length === 0 && <div style={{ textAlign:"center",color:"var(--muted)",fontSize:13,padding:20 }}>No challenges yet. Go challenge someone on the Ranks page!</div>}
              {challenges.map(ch => {
                const isChallenger = ch.challenger_id === myUser?.id;
                const oppName      = isChallenger ? ch.opp_name : ch.chal_name;
                const statusColor  = { pending:"var(--muted)",active:"var(--gold)",complete:"var(--green)",declined:"var(--red)",tie:"var(--white2)" }[ch.status]||"var(--muted)";
                return (
                  <div key={ch.id} style={{ background:"var(--black2)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:14,padding:"14px 16px" }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
                      <div style={{ fontWeight:700,fontSize:14 }}>vs {oppName}</div>
                      <div style={{ fontSize:11,fontWeight:700,color:statusColor,textTransform:"uppercase",letterSpacing:.5 }}>{ch.status}</div>
                    </div>
                    <div style={{ fontSize:12,color:"var(--muted)" }}>{LIFT_EMOJI[ch.lift_type]} {ch.lift_type} · {ch.duration_days} days · {ch.pot_pts} pt pot</div>
                    {ch.status==="pending"&&!isChallenger && (
                      <button onClick={async()=>{await api("POST",`/api/challenges/${ch.id}/accept`);const r=await api("GET","/api/challenges");setChallenges(r.challenges||[]);}} style={{ marginTop:10,background:"var(--gold)",color:"#000",border:"none",borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:800,cursor:"pointer" }}>
                        Accept ⚔
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]     = useState(null);
  const [authed, setAuthed] = useState(false);
  const [tab, setTab]       = useState("feed");
  const [viewingUser, setViewingUser] = useState(null);
  const [toast, setToast]   = useState("");

  const showToast = (msg) => { setToast(msg); };

  useEffect(() => {
    const t = token();
    if (!t) { setAuthed(false); return; }
    api("GET","/api/auth/me").then(r => {
      if (r.user) { setUser(r.user); setAuthed(true); }
      else { localStorage.removeItem("rr_token"); setAuthed(false); }
    });
  }, []);

  const onAuth = (u) => { setUser(u); setAuthed(true); };

  const onProfile = (userId) => {
    setViewingUser(userId);
  };

  // Inject styles
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = GLOBAL_CSS;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  if (!authed) return <AuthScreen onAuth={onAuth} />;

  const renderPage = () => {
    if (viewingUser !== null) {
      return (
        <ProfilePage
          userId={viewingUser}
          myUser={user}
          onBack={()=>setViewingUser(null)}
          toast={showToast}
        />
      );
    }
    switch (tab) {
      case "feed":     return <FeedPage     onProfile={onProfile} toast={showToast} />;
      case "trending": return <TrendingPage onProfile={onProfile} />;
      case "ranks":    return <RanksPage    myUser={user} toast={showToast} />;
      case "upload":   return <UploadPage   onDone={()=>setTab("feed")} toast={showToast} />;
      case "profile":  return <ProfilePage  userId={user?.id} myUser={user} toast={showToast} />;
      default:         return null;
    }
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100vh",maxWidth:430,margin:"0 auto",background:"var(--black)",boxShadow:"0 0 80px rgba(0,0,0,.9)",position:"relative" }}>
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>
        {renderPage()}
      </div>
      {viewingUser === null && (
        <BottomNav tab={tab} setTab={(t)=>{setTab(t);setViewingUser(null);}} hasNotif={true} />
      )}
      {toast && <Toast msg={toast} onDone={()=>setToast("")} />}
    </div>
  );
}
