// RepRoom App.jsx v6 — Arena Edition
import { useState, useEffect, useRef, useCallback } from "react";

const API = "https://mini-youtube-api-rgd4.onrender.com";
const token = () => localStorage.getItem("rr_token");
const authHdr = () => token() ? { Authorization:`Bearer ${token()}` } : {};
async function api(method, path, body) {
  const opts = { method, headers:{"Content-Type":"application/json",...authHdr()} };
  if (body) opts.body = JSON.stringify(body);
  try { const r = await fetch(API+path, opts); return r.json(); } catch { return {error:"Network error"}; }
}
const haptic  = () => { try{navigator.vibrate?.(10);}catch{} };
const hapticH = () => { try{navigator.vibrate?.(40);}catch{} };

const LIFTS = ["Deadlift","Squat","Bench Press","Overhead Press","RDL","Hip Thrust","Incline Bench","Other"];
const LE = { Deadlift:"🏋️", Squat:"🦵", "Bench Press":"💪", "Overhead Press":"🙌", Other:"🔥" };
const REACTIONS = ["💪","🔥","😤","👑","🤯"];
const BG = ["radial-gradient(ellipse at 30% 60%,#1a0f00,#060505)","radial-gradient(ellipse at 60% 40%,#001a08,#060505)","radial-gradient(ellipse at 40% 50%,#0a0018,#060505)","radial-gradient(ellipse at 50% 30%,#1a0008,#060505)","radial-gradient(ellipse at 20% 70%,#001818,#060505)","radial-gradient(ellipse at 70% 60%,#181800,#060505)"];
const fmt = n => n>=1000?`${(n/1000).toFixed(1)}k`:String(n||0);
const ago  = d => { const s=(Date.now()-new Date(d))/1000; if(s<60)return"now"; if(s<3600)return`${~~(s/60)}m`; if(s<86400)return`${~~(s/3600)}h`; return`${~~(s/86400)}d`; };
const monthName = m => { const [y,mo]=m.split("-"); return new Date(+y,+mo-1,1).toLocaleString("en-US",{month:"long",year:"numeric"}); };
const daysLeft  = () => { const n=new Date(),e=new Date(n.getFullYear(),n.getMonth()+1,1); return Math.ceil((e-n)/86400000); };

function distMiles(la1,lo1,la2,lo2){const R=3958.8,dL=(la2-la1)*Math.PI/180,dO=(lo2-lo1)*Math.PI/180,a=Math.sin(dL/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dO/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
const GYM_COORDS={"LA Fitness":{lat:41.0034,lng:-73.6673}};

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;width:100%;overflow:hidden;background:#040303;color:#f2ece0;font-family:'Outfit',sans-serif;-webkit-font-smoothing:antialiased}
input,textarea,select,button{font-family:'Outfit',sans-serif;font-size:14px}
::-webkit-scrollbar{display:none}
.scr{overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1;min-height:0}
video{display:block}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(200,164,90,0.3)}50%{box-shadow:0 0 40px rgba(200,164,90,0.7)}}
`;

const GOLD="#c8a45a",GOLD2="#e2bc72",RED="#e84040",BK="#040303",BK2="#0c0a09",BK3="#141210",MUTED="#4a433c";
const iSt=(x={})=>({width:"100%",background:BK2,border:"1px solid rgba(255,255,255,0.07)",color:"#f2ece0",padding:"13px 16px",borderRadius:12,fontSize:14,outline:"none",...x});
const lbl=t=><div style={{fontSize:9,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",color:MUTED,marginBottom:8}}>{t}</div>;
const GBtn=({children,onClick,disabled,style={}})=>(
  <button onClick={onClick} disabled={disabled} style={{width:"100%",background:disabled?"#1e1c1a":"linear-gradient(135deg,#c8a45a,#e2bc72)",color:disabled?MUTED:"#000",border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:900,letterSpacing:.3,cursor:disabled?"default":"pointer",...style}}>{children}</button>
);
const FightBtn=({children,onClick,disabled,style={}})=>(
  <button onClick={onClick} disabled={disabled} style={{width:"100%",background:disabled?"#1e1c1a":`linear-gradient(135deg,${RED},#c02020)`,color:disabled?MUTED:"#fff",border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:900,letterSpacing:.5,cursor:disabled?"default":"pointer",textTransform:"uppercase",...style}}>{children}</button>
);

// ── PRIMITIVES ────────────────────────────────────────────────────────────────
function Toast({msg,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[]);
  return <div style={{position:"fixed",bottom:100,left:"50%",transform:"translateX(-50%)",background:BK3,border:`1px solid ${GOLD}`,borderRadius:12,padding:"10px 22px",fontSize:13,fontWeight:700,zIndex:9999,boxShadow:"0 4px 32px rgba(0,0,0,.9)",pointerEvents:"none",whiteSpace:"nowrap"}}>{msg}</div>;
}

function Avatar({user,size=38,style={},onClick}){
  const COLS=["linear-gradient(135deg,#c8a45a,#e2bc72)","#1e3d5c","#1a4a2e","#3a1a5a","#5a1a00","#1a1a5a","#5a3a00"];
  const idx=(user?.id||0)%COLS.length;
  const base={width:size,height:size,borderRadius:"50%",flexShrink:0,...style,cursor:onClick?"pointer":"default"};
  if(user?.avatar_url) return <img src={user.avatar_url.startsWith("http")?user.avatar_url:API+user.avatar_url} alt="" onClick={onClick} style={{...base,objectFit:"cover"}}/>;
  return <div onClick={onClick} style={{...base,background:COLS[idx],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:size*.38,color:idx===0?"#000":"#fff"}}>{(user?.username||"?")[0].toUpperCase()}</div>;
}

const ProBadge=()=><span style={{background:"linear-gradient(135deg,#c8a45a,#e2bc72)",color:"#000",fontSize:7,fontWeight:900,padding:"2px 5px",borderRadius:5,letterSpacing:.5,textTransform:"uppercase",marginLeft:3,verticalAlign:"middle"}}>PRO</span>;

// ── AUTH ──────────────────────────────────────────────────────────────────────
function AuthScreen({onAuth}){
  const [mode,setMode]=useState("login");
  const [f,setF]=useState({username:"",email:"",password:""});
  const [err,setErr]=useState("");const [busy,setBusy]=useState(false);
  const submit=async()=>{
    setErr("");setBusy(true);haptic();
    const r=await api("POST",mode==="login"?"/api/auth/login":"/api/auth/register",mode==="login"?{email:f.email,password:f.password}:f);
    setBusy(false);if(r.error){setErr(r.error);return;}
    localStorage.setItem("rr_token",r.token);onAuth(r.user);
  };
  return(
    <div style={{height:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 28px",background:BK,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(200,164,90,0.07),transparent 70%)",pointerEvents:"none"}}/>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:58,fontWeight:900,background:`linear-gradient(135deg,${GOLD2},${GOLD},#a07820)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:4,letterSpacing:-1}}>RepRoom</div>
      <div style={{fontSize:10,color:MUTED,letterSpacing:4,textTransform:"uppercase",marginBottom:52}}>Prove it or it didn't happen</div>
      <div style={{width:"100%",maxWidth:360}}>
        {mode==="register"&&<input value={f.username} onChange={e=>setF({...f,username:e.target.value})} placeholder="Username" style={{...iSt(),marginBottom:10}}/>}
        <input value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="Email" type="email" style={{...iSt(),marginBottom:10}}/>
        <input value={f.password} onChange={e=>setF({...f,password:e.target.value})} placeholder="Password" type="password" style={{...iSt(),marginBottom:14}} onKeyDown={e=>e.key==="Enter"&&submit()}/>
        {err&&<div style={{color:RED,fontSize:13,marginBottom:12}}>{err}</div>}
        <GBtn onClick={submit} disabled={busy}>{busy?"...":mode==="login"?"Enter the Arena":"Create Account"}</GBtn>
        <div onClick={()=>setMode(m=>m==="login"?"register":"login")} style={{textAlign:"center",marginTop:16,fontSize:12,color:MUTED,cursor:"pointer"}}>{mode==="login"?"No account? Sign up":"Have an account? Sign in"}</div>
      </div>
    </div>
  );
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
function Onboarding({onDone}){
  const [step,setStep]=useState(0);
  const [gyms,setGyms]=useState([]);
  const [gymId,setGymId]=useState(null);
  const [gender,setGender]=useState(null);
  const [busy,setBusy]=useState(false);
  const [locState,setLocState]=useState("idle");
  const [userCoords,setUserCoords]=useState(null);
  const [showLocPrompt,setShowLocPrompt]=useState(false);
  useEffect(()=>{api("GET","/api/gyms").then(r=>setGyms(r.gyms||[]));},[]);
  useEffect(()=>{const t=setTimeout(()=>setShowLocPrompt(true),600);return()=>clearTimeout(t);},[]);
  const requestLocation=()=>{
    setShowLocPrompt(false);setLocState("asking");haptic();
    navigator.geolocation.getCurrentPosition(pos=>{setUserCoords({lat:pos.coords.latitude,lng:pos.coords.longitude});setLocState("granted");hapticH();},()=>setLocState("denied"),{timeout:8000,maximumAge:60000});
  };
  const finish=async()=>{
    setBusy(true);hapticH();
    const body={};
    if(gymId&&gymId!=="other") body.gym_id=Number(gymId);
    if(gender) body.gender=gender;
    if(Object.keys(body).length) await api("PUT","/api/auth/me",body);
    setBusy(false);onDone();
  };
  const sortedGyms=userCoords?[...gyms].map(g=>{const c=GYM_COORDS[g.name];return{...g,dist:c?distMiles(userCoords.lat,userCoords.lng,c.lat,c.lng):null};}).sort((a,b)=>a.dist===null?1:b.dist===null?-1:a.dist-b.dist):gyms;
  const nearbyGyms=userCoords?sortedGyms.filter(g=>g.dist!==null&&g.dist<=15):[];
  const otherGyms=userCoords?sortedGyms.filter(g=>g.dist===null||g.dist>15):sortedGyms;
  return(
    <>
    {showLocPrompt&&step===0&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:500,display:"flex",alignItems:"flex-end",backdropFilter:"blur(16px)"}}>
        <div style={{background:BK2,border:"1px solid rgba(200,164,90,0.25)",borderRadius:"24px 24px 0 0",padding:"32px 24px 48px",width:"100%"}}>
          <div style={{width:36,height:4,background:"#282420",borderRadius:2,margin:"0 auto 24px"}}/>
          <div style={{fontSize:48,textAlign:"center",marginBottom:14}}>📍</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900,textAlign:"center",marginBottom:8}}>Find Your Gym</div>
          <div style={{fontSize:13,color:MUTED,textAlign:"center",marginBottom:28}}>See gyms near you first. Never stored.</div>
          <GBtn onClick={requestLocation}>Use My Location</GBtn>
          <div onClick={()=>{setShowLocPrompt(false);setLocState("denied");}} style={{textAlign:"center",marginTop:14,fontSize:12,color:MUTED,cursor:"pointer"}}>Skip</div>
        </div>
      </div>
    )}
    <div style={{height:"100dvh",display:"flex",flexDirection:"column",padding:"40px 24px 32px",background:BK,overflow:"hidden"}}>
      <div style={{display:"flex",gap:6,marginBottom:40,flexShrink:0}}>
        {[0,1].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?GOLD:"#1e1c1a"}}/>)}
      </div>
      {step===0&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:900,marginBottom:4}}>Your Gym 🏛</div>
          {locState==="granted"&&nearbyGyms.length>0&&<div style={{fontSize:12,color:GOLD2,marginBottom:12}}>📍 {nearbyGyms.length} within 15 mi</div>}
          {locState==="asking"&&<div style={{fontSize:12,color:MUTED,marginBottom:12}}>Locating...</div>}
          {(locState==="idle"||locState==="denied")&&<div style={{fontSize:13,color:MUTED,marginBottom:14}}>Where do you train?</div>}
          <div className="scr" style={{flex:1,marginBottom:14,minHeight:0}}>
            {locState==="granted"&&nearbyGyms.length>0&&<>
              <div style={{fontSize:8,fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:GOLD,marginBottom:8}}>📍 Near You</div>
              {nearbyGyms.map(g=>(
                <div key={g.id} onClick={()=>{setGymId(g.id);haptic();}} style={{padding:"14px 16px",borderRadius:13,border:`1px solid ${gymId===g.id?GOLD:"rgba(255,255,255,0.06)"}`,background:gymId===g.id?"rgba(200,164,90,0.07)":BK2,cursor:"pointer",marginBottom:7,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div><div style={{fontWeight:700,fontSize:14}}>{g.name}</div><div style={{fontSize:11,color:MUTED,marginTop:1}}>{g.city}{g.state?`, ${g.state}`:""} · <span style={{color:GOLD2,fontWeight:700}}>{g.dist<1?"<1":g.dist.toFixed(1)} mi</span></div></div>
                  {gymId===g.id&&<div style={{color:GOLD}}>✓</div>}
                </div>
              ))}
              <div style={{fontSize:8,fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:MUTED,marginBottom:8,marginTop:14}}>All Gyms</div>
            </>}
            {(locState==="granted"?otherGyms:sortedGyms).filter(g=>g.name!=="Other / Home Gym").map(g=>(
              <div key={g.id} onClick={()=>{setGymId(g.id);haptic();}} style={{padding:"14px 16px",borderRadius:13,border:`1px solid ${gymId===g.id?GOLD:"rgba(255,255,255,0.06)"}`,background:gymId===g.id?"rgba(200,164,90,0.07)":BK2,cursor:"pointer",marginBottom:7,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div><div style={{fontWeight:700,fontSize:14}}>{g.name}</div><div style={{fontSize:11,color:MUTED,marginTop:1}}>{g.city}{g.state?`, ${g.state}`:""}{g.partner?" · 🏆":""}</div></div>
                {gymId===g.id&&<div style={{color:GOLD}}>✓</div>}
              </div>
            ))}
            <div onClick={()=>{setGymId("other");haptic();}} style={{padding:"14px 16px",borderRadius:13,border:`1px solid ${gymId==="other"?GOLD:"rgba(255,255,255,0.06)"}`,background:gymId==="other"?"rgba(200,164,90,0.07)":BK2,cursor:"pointer",marginBottom:7,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontWeight:700,fontSize:14}}>Other / Not Listed</div>
              {gymId==="other"&&<div style={{color:GOLD}}>✓</div>}
            </div>
          </div>
          <GBtn onClick={()=>{setStep(1);haptic();}} disabled={!gymId} style={{flexShrink:0}}>Next →</GBtn>
        </div>
      )}
      {step===1&&(
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:900,marginBottom:6}}>Who do you compete against?</div>
          <div style={{fontSize:12,color:MUTED,marginBottom:28,letterSpacing:.3}}>Divisions affect leaderboards, not respect.</div>
          <div style={{display:"flex",gap:10,marginBottom:"auto"}}>
            {[["male","♂","Male"],["female","♀","Female"],["other","⚡","Other"]].map(([v,icon,l])=>(
              <div key={v} onClick={()=>{setGender(v);haptic();}} style={{flex:1,padding:"20px 8px",borderRadius:16,border:`1px solid ${gender===v?GOLD:"rgba(255,255,255,0.07)"}`,background:gender===v?"rgba(200,164,90,0.08)":BK2,cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:28,marginBottom:6}}>{icon}</div>
                <div style={{fontWeight:800,fontSize:13,color:gender===v?GOLD2:MUTED}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:32}}>
            <GBtn onClick={finish} disabled={busy||!gender}>{busy?"Setting up...":"Enter the Arena 🏆"}</GBtn>
            <div onClick={onDone} style={{textAlign:"center",marginTop:12,fontSize:12,color:MUTED,cursor:"pointer"}}>Skip</div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

// ── BOTTOM NAV ────────────────────────────────────────────────────────────────
function BottomNav({tab,setTab,pendingChallenges,unreadNotifs}){
  const items=[
    {id:"feed",icon:"🏠",lbl:"Home"},
    {id:"ranks",icon:"👑",lbl:"Ranks"},
    {id:"upload",isPost:true},
    {id:"challenges",icon:"⚔",lbl:"Fight",badge:pendingChallenges},
    {id:"profile",icon:"👤",lbl:"Me",badge:(pendingChallenges>0||unreadNotifs>0)?1:0},
  ];
  return(
    <nav style={{flexShrink:0,paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 8px)",paddingTop:8,background:"rgba(4,3,3,0.98)",borderTop:"1px solid rgba(200,164,90,0.12)",display:"flex",alignItems:"center",justifyContent:"space-around",zIndex:100}}>
      {items.map(item=>item.isPost?(
        <div key="up" onClick={()=>{setTab("upload");haptic();}} style={{width:54,height:54,borderRadius:18,marginTop:-18,background:`linear-gradient(145deg,${GOLD2},${GOLD})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,cursor:"pointer",border:`3px solid ${BK}`,boxShadow:`0 4px 24px rgba(200,164,90,0.5)`,color:"#000",fontWeight:900,flexShrink:0}}>＋</div>
      ):(
        <button key={item.id} onClick={()=>{setTab(item.id);haptic();}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",padding:"4px 14px",background:"none",border:"none",color:tab===item.id?GOLD:MUTED,position:"relative",minWidth:48}}>
          <span style={{fontSize:item.id==="challenges"?22:20,filter:tab===item.id&&item.id==="challenges"?"drop-shadow(0 0 6px rgba(232,64,64,0.8))":"none"}}>{item.icon}</span>
          <span style={{fontSize:9,fontWeight:800,letterSpacing:.8,textTransform:"uppercase"}}>{item.lbl}</span>
          {item.badge>0&&<div style={{position:"absolute",top:2,right:8,minWidth:16,height:16,borderRadius:8,background:RED,border:`1.5px solid ${BK}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"#fff",padding:"0 3px"}}>{item.badge>9?"9+":item.badge}</div>}
        </button>
      ))}
    </nav>
  );
}

// ── ARENA (RANKS HOME) ────────────────────────────────────────────────────────
function ArenaPage({myUser,toast,onProfile,onChallenge}){
  const [gender,setGender]=useState("all");
  const [mode,setMode]=useState("points");
  const [period,setPeriod]=useState("month");
  const [lb,setLb]=useState([]);
  const [battle,setBattle]=useState(null);
  const [loading,setLoading]=useState(true);
  const [showHOF,setShowHOF]=useState(false);
  const [showLifts,setShowLifts]=useState(false);

  useEffect(()=>{
    setLoading(true);
    const lift=mode==="points"?"all":mode;
    Promise.all([
      api("GET",`/api/leaderboard?period=${period}&gender=${gender}&lift=${lift}`),
      api("GET","/api/gyms/battle")
    ]).then(([l,b])=>{setLb(l.leaderboard||[]);setBattle(b);setLoading(false);});
  },[period,gender,mode]);

  const king=lb[0];
  const modeIsLift=mode!=="points";
  const myEntry=lb.find(r=>r.id===myUser?.id);
  const myRank=myEntry?lb.indexOf(myEntry)+1:null;

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:BK,minHeight:0}}>
      <div className="scr">
        {/* Header */}
        <div style={{paddingTop:"calc(env(safe-area-inset-top,0px) + 18px)",paddingLeft:18,paddingRight:18,paddingBottom:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:34,fontWeight:900,lineHeight:1,letterSpacing:-1}}>Arena</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
                <div style={{fontSize:10,fontWeight:800,color:RED,letterSpacing:.5,display:"flex",alignItems:"center",gap:4}}><span style={{width:5,height:5,borderRadius:"50%",background:RED,display:"inline-block",animation:"pulse 1s infinite"}}/>SEASON</div>
                <div style={{fontSize:11,fontWeight:900,color:GOLD}}>{daysLeft()} days left</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {myRank&&<div style={{background:BK2,border:`1px solid rgba(200,164,90,0.2)`,borderRadius:10,padding:"6px 12px",textAlign:"center"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,color:GOLD,lineHeight:1}}>#{myRank}</div>
                <div style={{fontSize:8,color:MUTED,textTransform:"uppercase",letterSpacing:1}}>You</div>
              </div>}
              <div onClick={()=>setShowHOF(true)} style={{background:BK2,border:`1px solid rgba(200,164,90,0.2)`,borderRadius:10,padding:"8px 10px",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:20}}>🏆</div>
                <div style={{fontSize:8,color:MUTED,textTransform:"uppercase",letterSpacing:.5}}>Fame</div>
              </div>
            </div>
          </div>

          {/* King card */}
          {king&&!modeIsLift&&(
            <div style={{borderRadius:18,padding:18,background:"linear-gradient(135deg,#0f0b00,#1c1500,#0f0b00)",border:"1px solid rgba(200,164,90,0.35)",marginBottom:14,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-40,right:-40,width:140,height:140,borderRadius:"50%",background:"radial-gradient(circle,rgba(200,164,90,0.12),transparent 70%)",pointerEvents:"none"}}/>
              <div style={{fontSize:8,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",color:GOLD,marginBottom:10}}>🏛 ARENA CLAIMED BY</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <Avatar user={king} size={52} style={{border:`2px solid ${GOLD}`}} onClick={()=>onProfile(king.id)}/>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:900,display:"flex",alignItems:"center",gap:4}}>{king.username}{king.is_pro?<ProBadge/>:""}</div>
                  <div style={{fontSize:11,color:MUTED}}>{king.gym_name||"RepRoom"}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:900,color:GOLD2,lineHeight:1}}>{king.pts}</div>
                  <div style={{fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:1}}>REP SCORE</div>
                </div>
                {king.id!==myUser?.id&&(
                  <button onClick={()=>onChallenge({...king})} style={{background:`linear-gradient(135deg,${RED},#c02020)`,color:"#fff",border:"none",borderRadius:10,padding:"10px 12px",fontSize:11,fontWeight:900,cursor:"pointer",textTransform:"uppercase",letterSpacing:.5,flexShrink:0}}>⚔ Fight</button>
                )}
              </div>
            </div>
          )}

          {/* Gym battle */}
          {battle?.gyms?.length>=2&&!modeIsLift&&(
            <div style={{marginBottom:14,padding:"12px 16px",borderRadius:14,background:BK2,border:"1px solid rgba(255,255,255,0.04)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}><div style={{fontSize:8,fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:GOLD}}> 🏛 CLAIMED ARENA</div><div style={{fontSize:8,color:MUTED,letterSpacing:1,textTransform:"uppercase"}}>{daysLeft()}d remaining</div></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:800,color:GOLD,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{battle.gyms[0].name}</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:GOLD}}>{battle.gyms[0].pts}</div>
                </div>
                <div style={{fontSize:10,fontWeight:900,color:MUTED,flexShrink:0,padding:"0 4px"}}>VS</div>
                <div style={{flex:1,textAlign:"right"}}>
                  <div style={{fontSize:12,fontWeight:800,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{battle.gyms[1]?.name}</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:MUTED}}>{battle.gyms[1]?.pts}</div>
                </div>
              </div>
              <div style={{height:3,background:"#1a1714",borderRadius:2,overflow:"hidden",marginTop:10}}>
                <div style={{height:"100%",background:`linear-gradient(90deg,${GOLD},${GOLD2})`,width:`${Math.round(battle.gyms[0].pts/Math.max(battle.gyms[0].pts+(battle.gyms[1]?.pts||0),1)*100)}%`,transition:"width .5s ease"}}/>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:8,paddingBottom:2}}>
            {[["all","All"],["male","♂"],["female","♀"],["other","⚡"]].map(([v,l])=>(
              <div key={v} onClick={()=>{setGender(v);haptic();}} style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:800,border:`1px solid ${gender===v?GOLD:"rgba(255,255,255,0.07)"}`,color:gender===v?GOLD:MUTED,cursor:"pointer",background:gender===v?"rgba(200,164,90,0.08)":"transparent",whiteSpace:"nowrap",flexShrink:0}}>{l}</div>
            ))}
            <div style={{width:1,flexShrink:0}}/>
            {!modeIsLift&&[["month","Month"],["alltime","All Time"]].map(([v,l])=>(
              <div key={v} onClick={()=>{setPeriod(v);haptic();}} style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:800,border:`1px solid ${period===v?"rgba(200,164,90,0.4)":"rgba(255,255,255,0.07)"}`,color:period===v?GOLD2:MUTED,cursor:"pointer",background:period===v?"rgba(200,164,90,0.08)":"transparent",whiteSpace:"nowrap",flexShrink:0}}>{l}</div>
            ))}
          </div>
          <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:14,paddingBottom:2}}>
            <div onClick={()=>{setMode("points");haptic();}} style={{padding:"5px 14px",borderRadius:20,fontSize:11,fontWeight:800,letterSpacing:.5,border:`1px solid ${mode==="points"?GOLD:"rgba(255,255,255,0.07)"}`,color:mode==="points"?GOLD:MUTED,cursor:"pointer",background:mode==="points"?"rgba(200,164,90,0.08)":"transparent",whiteSpace:"nowrap",flexShrink:0,textTransform:"uppercase"}}>Rep Score</div>
            <div onClick={()=>{setShowLifts(s=>!s);haptic();}} style={{padding:"5px 14px",borderRadius:20,fontSize:11,fontWeight:800,letterSpacing:.5,border:`1px solid ${modeIsLift?GOLD:"rgba(255,255,255,0.07)"}`,color:modeIsLift?GOLD:MUTED,cursor:"pointer",background:modeIsLift?"rgba(200,164,90,0.08)":"transparent",whiteSpace:"nowrap",flexShrink:0,textTransform:"uppercase",display:"flex",alignItems:"center",gap:5}}>PRs {modeIsLift?`· ${mode}`:""} <span style={{fontSize:9}}>{showLifts?"▲":"▼"}</span></div>
            {showLifts&&LIFTS.map(v=>(
              <div key={v} onClick={()=>{setMode(v);setShowLifts(false);haptic();}} style={{padding:"5px 14px",borderRadius:20,fontSize:11,fontWeight:800,border:`1px solid ${mode===v?GOLD:"rgba(255,255,255,0.12)"}`,color:mode===v?GOLD:"#f2ece0",cursor:"pointer",background:mode===v?"rgba(200,164,90,0.08)":BK3,whiteSpace:"nowrap",flexShrink:0}}>{v}</div>
            ))}
          </div>
        </div>

        {/* Leaderboard rows */}
        <div style={{padding:"0 14px 32px",display:"flex",flexDirection:"column",gap:5}}>
          {loading&&[1,2,3,4,5,6].map(i=><div key={i} style={{height:58,borderRadius:13,background:BK2,animation:"pulse 1.5s infinite"}}/>)}
          {lb.map((row,i)=>{
            const isMe=row.id===myUser?.id;
            const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
            return(
              <div key={row.user_id||row.id} onClick={()=>onProfile(row.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 13px",background:isMe?`rgba(200,164,90,0.07)`:BK2,border:`1px solid ${isMe?"rgba(200,164,90,0.25)":"rgba(255,255,255,0.03)"}`,borderRadius:13,cursor:"pointer",position:"relative",overflow:"hidden"}}>
                {isMe&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:GOLD,borderRadius:"3px 0 0 3px"}}/>}
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:medal?18:14,fontWeight:900,width:28,textAlign:"center",flexShrink:0,color:i<3?GOLD:MUTED}}>{medal||`#${i+1}`}</div>
                <Avatar user={row} size={36}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:3,overflow:"hidden"}}>
                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.username}</span>
                    {row.is_pro?<ProBadge/>:""}
                    {isMe&&<span style={{background:GOLD,color:"#000",fontSize:8,fontWeight:900,padding:"1px 5px",borderRadius:4,flexShrink:0}}>YOU</span>}
                  </div>
                  <div style={{fontSize:10,color:MUTED,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{modeIsLift?row.gym_name||"—":`${row.video_count||0} vids · ${row.gym_name||"—"}`}</div>
                </div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:modeIsLift?18:22,fontWeight:900,color:i===0?GOLD2:i<3?GOLD:"#f2ece0",flexShrink:0}}>{modeIsLift?`${row.pts}`:row.pts}<span style={{fontSize:9,color:MUTED,marginLeft:2}}>{modeIsLift?"lbs":"rep"}</span></div>
                {!isMe&&!modeIsLift&&(
                  <button onClick={e=>{e.stopPropagation();onChallenge({...row});haptic();}} style={{background:`rgba(232,64,64,0.15)`,border:`1px solid rgba(232,64,64,0.4)`,color:RED,borderRadius:8,padding:"6px 10px",fontSize:12,fontWeight:900,cursor:"pointer",flexShrink:0}}>⚔</button>
                )}
              </div>
            );
          })}
          {!loading&&lb.length===0&&<div style={{textAlign:"center",padding:40,color:MUTED,fontSize:13}}>No one on the board yet.</div>}
        </div>
      </div>
      {showHOF&&<HallOfFame onProfile={onProfile} onClose={()=>setShowHOF(false)}/>}
    </div>
  );
}

// ── HALL OF FAME ──────────────────────────────────────────────────────────────
function HallOfFame({onProfile,onClose}){
  const [winners,setWinners]=useState([]);
  useEffect(()=>{api("GET","/api/halloffame").then(r=>setWinners(r.winners||[]));},[]);
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(12px)"}}>
      <div style={{background:BK2,border:"1px solid rgba(200,164,90,0.25)",borderRadius:"22px 22px 0 0",padding:"24px 20px 48px",width:"100%",maxHeight:"78vh",display:"flex",flexDirection:"column",animation:"slideUp .3s ease"}}>
        <div style={{width:36,height:4,background:"#282420",borderRadius:2,margin:"0 auto 18px",flexShrink:0}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900,marginBottom:18,flexShrink:0}}>🏆 Hall of Fame</div>
        <div className="scr">
          {winners.length===0&&<div style={{textAlign:"center",color:MUTED,padding:28,fontSize:13}}>End of month crowns the king.</div>}
          {winners.map((w,i)=>(
            <div key={w.id} onClick={()=>{onProfile(w.user_id);onClose();haptic();}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900,color:i===0?GOLD:MUTED,width:32,textAlign:"center",flexShrink:0}}>{i===0?"👑":`#${i+1}`}</div>
              <Avatar user={{id:w.user_id,username:w.username,avatar_url:w.avatar_url}} size={44} style={{border:`2px solid ${i===0?GOLD:"rgba(255,255,255,0.08)"}`}}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14}}>{w.username}</div>
                <div style={{fontSize:11,color:MUTED}}>{monthName(w.month)}</div>
              </div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,color:GOLD}}>{w.points}<span style={{fontSize:9,color:MUTED,marginLeft:2}}>pts</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CHALLENGE MODAL ───────────────────────────────────────────────────────────
function ChallengeModal({target,myPts,onClose,onSent}){
  const [lift,setLift]=useState("Deadlift");
  const [dur,setDur]=useState(7);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const send=async()=>{
    setBusy(true);setErr("");hapticH();
    const r=await api("POST","/api/challenges",{opponent_id:target.id,lift_type:lift,duration_days:dur});
    setBusy(false);if(r.error){setErr(r.error);return;}onSent();
  };
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(12px)"}}>
      <div style={{background:BK2,border:"1px solid rgba(232,64,64,0.3)",borderRadius:"22px 22px 0 0",padding:"24px 22px 48px",width:"100%",animation:"slideUp .3s ease"}}>
        <div style={{width:36,height:4,background:"#282420",borderRadius:2,margin:"0 auto 20px"}}/>
        {/* VS header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:22}}>
          <div style={{textAlign:"center"}}>
            <Avatar user={{id:myPts,username:"You"}} size={52} style={{margin:"0 auto 6px"}}/>
            <div style={{fontSize:11,fontWeight:800}}>You</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:GOLD}}>{myPts}pts</div>
          </div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900,color:RED}}>VS</div>
          <div style={{textAlign:"center"}}>
            <Avatar user={target} size={52} style={{margin:"0 auto 6px"}}/>
            <div style={{fontSize:11,fontWeight:800}}>{target.username}</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:GOLD}}>{target.pts||0}pts</div>
          </div>
        </div>
        {/* Lift */}
        <div style={{marginBottom:14}}>
          {lbl("Lift")}
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {LIFTS.map(l=><div key={l} onClick={()=>{setLift(l);haptic();}} style={{padding:"7px 11px",borderRadius:20,border:`1px solid ${lift===l?GOLD:"rgba(255,255,255,0.08)"}`,fontSize:12,fontWeight:700,color:lift===l?GOLD:MUTED,cursor:"pointer",background:lift===l?"rgba(200,164,90,0.08)":"transparent"}}>{LE[l]} {l}</div>)}
          </div>
        </div>
        {/* Duration */}
        <div style={{marginBottom:18}}>
          {lbl("Duration")}
          <div style={{display:"flex",gap:8}}>
            {[3,7,14].map(d=><div key={d} onClick={()=>{setDur(d);haptic();}} style={{flex:1,textAlign:"center",padding:"10px",border:`1px solid ${dur===d?GOLD:"rgba(255,255,255,0.07)"}`,borderRadius:12,fontSize:13,fontWeight:800,color:dur===d?GOLD:MUTED,cursor:"pointer",background:dur===d?"rgba(200,164,90,0.08)":"transparent"}}>{d===3?"3d":d===7?"1wk":"2wk"}</div>)}
          </div>
        </div>
        <div style={{background:"rgba(232,64,64,0.07)",border:"1px solid rgba(232,64,64,0.2)",borderRadius:12,padding:"10px 14px",textAlign:"center",marginBottom:16}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900,color:"#fff"}}>−25 to enter · +50 to win</div>
          <div style={{fontSize:11,color:MUTED,marginTop:2}}>Win: +50 rep · Lose: reputation on the line</div>
        </div>
        {err&&<div style={{color:RED,fontSize:13,marginBottom:12,textAlign:"center"}}>{err}</div>}
        <FightBtn onClick={send} disabled={busy}>{busy?"Sending...":"⚔ Send Challenge"}</FightBtn>
        <div onClick={onClose} style={{textAlign:"center",marginTop:12,fontSize:12,color:MUTED,cursor:"pointer"}}>Cancel</div>
      </div>
    </div>
  );
}

// ── CHALLENGES PAGE ───────────────────────────────────────────────────────────
function ChallengesPage({myUser,toast,onProfile,onChallenge}){
  const [challenges,setChallenges]=useState([]);
  const [loading,setLoading]=useState(true);
  const load=()=>api("GET","/api/challenges").then(r=>{setChallenges(r.challenges||[]);setLoading(false);});
  useEffect(()=>{load();},[]);

  const pending=challenges.filter(c=>c.status==="pending");
  const active=challenges.filter(c=>c.status==="active");
  const done=challenges.filter(c=>["complete","declined","tie"].includes(c.status));

  const StatusColor={pending:GOLD,active:RED,complete:"#2a9a5a",declined:MUTED,tie:"#c8bfb0"};

  const ChallengeCard=({ch})=>{
    const isChallenger=ch.challenger_id===myUser?.id;
    const opp={id:isChallenger?ch.opponent_id:ch.challenger_id,username:isChallenger?ch.opp_name:ch.chal_name,avatar_url:isChallenger?ch.opp_av:ch.chal_av};
    const isPendingOpponent=ch.status==="pending"&&!isChallenger;
    return(
      <div style={{background:BK2,border:`1px solid ${ch.status==="active"?"rgba(232,64,64,0.25)":ch.status==="pending"&&!isChallenger?"rgba(200,164,90,0.25)":"rgba(255,255,255,0.04)"}`,borderRadius:14,padding:"14px 16px",position:"relative",overflow:"hidden"}}>
        {ch.status==="active"&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${RED},transparent)`}}/>}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <Avatar user={opp} size={40} onClick={()=>onProfile(opp.id)}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:14}}>vs {opp.username}</div>
            <div style={{fontSize:11,color:MUTED}}>{LE[ch.lift_type]} {ch.lift_type} · {ch.duration_days}d · {ch.pot_pts}pt pot</div>
          </div>
          <div style={{fontSize:10,fontWeight:900,color:StatusColor[ch.status]||MUTED,textTransform:"uppercase",letterSpacing:.5,border:`1px solid ${StatusColor[ch.status]||MUTED}`,borderRadius:6,padding:"3px 8px"}}>{ch.status}</div>
        </div>
        {isPendingOpponent&&(
          <div style={{display:"flex",gap:8}}>
            <button onClick={async()=>{hapticH();await api("POST",`/api/challenges/${ch.id}/accept`);load();}} style={{flex:1,background:`linear-gradient(135deg,${RED},#c02020)`,color:"#fff",border:"none",borderRadius:10,padding:"11px",fontSize:13,fontWeight:900,cursor:"pointer",textTransform:"uppercase",letterSpacing:.5}}>⚔ Accept</button>
            <button onClick={async()=>{await api("POST",`/api/challenges/${ch.id}/decline`);load();}} style={{flex:0,background:"transparent",color:MUTED,border:`1px solid ${MUTED}`,borderRadius:10,padding:"11px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>✕</button>
          </div>
        )}
      </div>
    );
  };

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:BK,minHeight:0}}>
      <div style={{paddingTop:"calc(env(safe-area-inset-top,0px) + 18px)",paddingLeft:18,paddingRight:18,paddingBottom:14,flexShrink:0}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:34,fontWeight:900,letterSpacing:-1}}>Challenges</div>
        {pending.length>0&&<div style={{fontSize:12,color:RED,fontWeight:700,marginTop:4}}>⚔ {pending.length} pending</div>}
      </div>
      <div className="scr" style={{padding:"0 16px 32px"}}>
        {loading&&<div style={{textAlign:"center",padding:40,color:MUTED}}>Loading...</div>}
        {!loading&&challenges.length===0&&(
          <div style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:52,marginBottom:12}}>⚔</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,marginBottom:8}}>No Fights Yet</div>
            <div style={{fontSize:13,color:MUTED,marginBottom:24}}>Go to the Arena and challenge someone.</div>
          </div>
        )}
        {pending.length>0&&(
          <>
            <div style={{fontSize:9,fontWeight:900,letterSpacing:2.5,textTransform:"uppercase",color:RED,marginBottom:10}}>⚔ Incoming</div>
            {pending.filter(c=>c.opponent_id===myUser?.id).map(ch=><div key={ch.id} style={{marginBottom:8}}><ChallengeCard ch={ch}/></div>)}
            {pending.filter(c=>c.challenger_id===myUser?.id).length>0&&<>
              <div style={{fontSize:9,fontWeight:900,letterSpacing:2.5,textTransform:"uppercase",color:MUTED,marginBottom:10,marginTop:14}}>Sent</div>
              {pending.filter(c=>c.challenger_id===myUser?.id).map(ch=><div key={ch.id} style={{marginBottom:8}}><ChallengeCard ch={ch}/></div>)}
            </>}
          </>
        )}
        {active.length>0&&(
          <>
            <div style={{fontSize:9,fontWeight:900,letterSpacing:2.5,textTransform:"uppercase",color:RED,marginBottom:10,marginTop:pending.length>0?18:0,display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:RED,display:"inline-block",animation:"pulse 1s infinite"}}/>Live</div>
            {active.map(ch=><div key={ch.id} style={{marginBottom:8}}><ChallengeCard ch={ch}/></div>)}
          </>
        )}
        {done.length>0&&(
          <>
            <div style={{fontSize:9,fontWeight:900,letterSpacing:2.5,textTransform:"uppercase",color:MUTED,marginBottom:10,marginTop:18}}>History</div>
            {done.map(ch=><div key={ch.id} style={{marginBottom:8}}><ChallengeCard ch={ch}/></div>)}
          </>
        )}
      </div>
    </div>
  );
}

// ── VIDEO SLIDE ───────────────────────────────────────────────────────────────
function VideoSlide({video,isCurrent,onComment,onProfile,toast}){
  const [myReaction,setMyReaction]=useState(null);
  const [reactionCount,setReactionCount]=useState(video?.reaction_count||0);
  const [showReactions,setShowReactions]=useState(false);
  const [saved,setSaved]=useState(false);
  const [paused,setPaused]=useState(false);
  const vRef=useRef(null);
  useEffect(()=>{
    const v=vRef.current;if(!v)return;
    if(isCurrent){v.play().catch(()=>{});setPaused(false);}
    else{v.pause();v.currentTime=0;}
  },[isCurrent]);
  const togglePlay=()=>{const v=vRef.current;if(!v)return;if(v.paused){v.play();setPaused(false);}else{v.pause();setPaused(true);}haptic();};
  const react=async(emoji)=>{
    hapticH();setShowReactions(false);
    const prev=myReaction;const toggling=prev===emoji;
    setMyReaction(toggling?null:emoji);
    setReactionCount(n=>prev?(toggling?n-1:n):n+1);
    const r=await api("POST",`/api/videos/${video.id}/react`,{emoji});
    if(!r.error){setMyReaction(r.my_reaction);setReactionCount(r.reaction_count);}
  };
  const save=async()=>{haptic();if(!token()){toast("Sign in to save");return;}const r=await api("POST",`/api/videos/${video.id}/save`);if(!r.error){setSaved(r.saved);toast(r.saved?"Saved ✓":"Removed");}};
  const bg=BG[(video?.id||0)%BG.length];
  return(
    <div style={{position:"absolute",inset:0}} onClick={()=>{if(showReactions){setShowReactions(false);}else togglePlay();}}>
      {video?.url?<video ref={vRef} src={API+video.url} loop playsInline style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{position:"absolute",inset:0,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:100}}>{LE[video?.lift_type]||"🏋️"}</div>}
      {paused&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:5,pointerEvents:"none"}}><div style={{width:64,height:64,borderRadius:"50%",background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>⏸</div></div>}
      <div style={{position:"absolute",top:0,left:0,right:0,height:"28%",background:"linear-gradient(to bottom,rgba(0,0,0,.7),transparent)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:"65%",background:"linear-gradient(to top,rgba(0,0,0,.95) 0%,rgba(0,0,0,.25) 60%,transparent)",pointerEvents:"none"}}/>
      {showReactions&&(
        <div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:10,bottom:190,zIndex:20,display:"flex",flexDirection:"column",gap:7,background:"rgba(12,10,9,0.96)",borderRadius:18,padding:"10px 8px",border:"1px solid rgba(200,164,90,0.2)"}}>
          {REACTIONS.map(e=><div key={e} onClick={()=>react(e)} style={{width:42,height:42,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,cursor:"pointer",background:myReaction===e?"rgba(200,164,90,0.25)":"transparent",border:myReaction===e?`1px solid ${GOLD}`:"1px solid transparent"}}>{e}</div>)}
        </div>
      )}
      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:12,bottom:90,zIndex:10,display:"flex",flexDirection:"column",gap:16,alignItems:"center"}}>
        <div onClick={()=>{haptic();setShowReactions(s=>!s);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer"}}>
          <div style={{width:46,height:46,borderRadius:"50%",background:myReaction?"rgba(200,164,90,0.25)":"rgba(255,255,255,0.1)",border:`1px solid ${myReaction?GOLD:"rgba(255,255,255,0.12)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{myReaction||"💪"}</div>
          <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.85)"}}>{fmt(reactionCount)}</div>
        </div>
        <div onClick={()=>{haptic();onComment();}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer"}}>
          <div style={{width:46,height:46,borderRadius:"50%",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>💬</div>
          <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.85)"}}>{fmt(video?.comment_count)}</div>
        </div>
        <div onClick={save} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer"}}>
          <div style={{width:46,height:46,borderRadius:"50%",background:saved?"rgba(200,164,90,0.25)":"rgba(255,255,255,0.1)",border:`1px solid ${saved?GOLD:"rgba(255,255,255,0.12)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🔖</div>
          <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.85)"}}>Save</div>
        </div>
      </div>
      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",bottom:68,left:12,right:72,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <Avatar user={{id:video?.user_id,username:video?.username,avatar_url:video?.avatar_url}} size={40} style={{border:`2px solid ${GOLD}`}} onClick={()=>onProfile(video?.user_id)}/>
          <div>
            <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:3}}>{video?.username}{video?.is_pro?<ProBadge/>:""}</div>
            <div style={{fontSize:10,color:GOLD2}}>{video?.gym_name||"RepRoom"}</div>
          </div>
        </div>
        {video?.lift_type&&<div style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(200,164,90,0.15)",border:"1px solid rgba(200,164,90,0.3)",borderRadius:20,padding:"3px 9px",fontSize:10,fontWeight:700,color:GOLD2,marginBottom:6}}>{LE[video.lift_type]} {video.lift_type}{video.weight_lbs?` · ${video.weight_lbs}lbs`:""}</div>}
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,lineHeight:1.25,textShadow:"0 2px 10px rgba(0,0,0,.9)"}}>{video?.title}</div>
      </div>
    </div>
  );
}

// ── COMMENTS ──────────────────────────────────────────────────────────────────
function CommentsSheet({videoId,open,onClose}){
  const [comments,setComments]=useState([]);const [text,setText]=useState("");
  useEffect(()=>{if(!open||!videoId)return;api("GET",`/api/videos/${videoId}/comments`).then(r=>setComments(r.comments||[]));},[open,videoId]);
  const send=async()=>{if(!text.trim())return;haptic();const r=await api("POST",`/api/videos/${videoId}/comments`,{text});if(!r.error){setComments(p=>[...p,r.comment]);setText("");}};
  return(
    <>
      {open&&<div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.6)",zIndex:49}}/>}
      <div style={{position:"absolute",bottom:open?0:"-100%",left:0,right:0,height:"70%",background:BK2,borderTop:"1px solid rgba(200,164,90,0.15)",borderRadius:"20px 20px 0 0",zIndex:50,transition:"bottom .3s cubic-bezier(.32,0,.67,0)",display:"flex",flexDirection:"column"}}>
        <div style={{width:36,height:4,background:"#282420",borderRadius:2,margin:"12px auto 0",flexShrink:0}}/>
        <div style={{padding:"10px 16px 12px",borderBottom:"1px solid rgba(255,255,255,0.04)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontWeight:800,fontSize:15}}>{comments.length} Comments</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:MUTED,fontSize:18,cursor:"pointer"}}>✕</button>
        </div>
        <div className="scr" style={{padding:"12px 16px"}}>
          {comments.length===0&&<div style={{textAlign:"center",color:MUTED,fontSize:13,paddingTop:20}}>Be first to comment.</div>}
          {comments.map(c=>(
            <div key={c.id} style={{display:"flex",gap:10,marginBottom:16}}>
              <Avatar user={{id:c.user_id,username:c.username,avatar_url:c.avatar_url}} size={32}/>
              <div><div style={{fontWeight:700,fontSize:12,marginBottom:2}}>{c.username}</div><div style={{fontSize:13,color:"#c8bfb0",lineHeight:1.45}}>{c.text}</div><div style={{fontSize:10,color:MUTED,marginTop:3}}>{ago(c.created_at)}</div></div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,padding:"10px 12px",borderTop:"1px solid rgba(255,255,255,0.04)",flexShrink:0}}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Comment..." style={{flex:1,background:BK3,border:"1px solid rgba(200,164,90,0.15)",color:"#f2ece0",borderRadius:20,padding:"10px 14px",fontSize:13,outline:"none"}}/>
          <button onClick={send} style={{width:38,height:38,background:GOLD,border:"none",borderRadius:"50%",color:"#000",fontSize:16,cursor:"pointer",fontWeight:900,flexShrink:0}}>↑</button>
        </div>
      </div>
    </>
  );
}

// ── FEED ──────────────────────────────────────────────────────────────────────
function FeedPage({onProfile,toast,myUser,onChallenge}){
  const [videos,setVideos]=useState([]);const [cur,setCur]=useState(0);
  const [commentVid,setCommentVid]=useState(null);
  const [loading,setLoading]=useState(true);
  const stackRef=useRef(null);const touchY=useRef(0);
  useEffect(()=>{setLoading(true);api("GET","/api/videos").then(r=>{setVideos(r.videos||[]);setCur(0);setLoading(false);});},[]);
  const go=useCallback(dir=>{haptic();setCur(c=>Math.max(0,Math.min(videos.length-1,c+dir)));},[videos.length]);
  useEffect(()=>{
    const el=stackRef.current;if(!el)return;
    const wheel=e=>{if(e.deltaY>40)go(1);else if(e.deltaY<-40)go(-1);};
    const ts=e=>{touchY.current=e.touches[0].clientY;};
    const te=e=>{const dy=touchY.current-e.changedTouches[0].clientY;if(dy>50)go(1);else if(dy<-50)go(-1);};
    el.addEventListener("wheel",wheel,{passive:true});el.addEventListener("touchstart",ts,{passive:true});el.addEventListener("touchend",te,{passive:true});
    return()=>{el.removeEventListener("wheel",wheel);el.removeEventListener("touchstart",ts);el.removeEventListener("touchend",te);};
  },[go]);
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative",background:BK,minHeight:0}}>
      <div style={{position:"absolute",top:0,left:0,right:0,zIndex:20,paddingTop:"calc(env(safe-area-inset-top,0px) + 14px)",paddingLeft:20,paddingRight:20}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,background:`linear-gradient(135deg,${GOLD2},${GOLD})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:-.5}}>RepRoom</div>
      </div>
      <div ref={stackRef} style={{position:"absolute",inset:0,overflow:"hidden"}}>
        {loading&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10}}><div style={{fontSize:48}}>🏋️</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:GOLD}}>Loading...</div></div>}
        {!loading&&videos.length===0&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10,padding:32,textAlign:"center"}}><div style={{fontSize:52}}>🏋️</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:22}}>No lifts recorded.</div><div style={{fontSize:11,color:MUTED,letterSpacing:1,textTransform:"uppercase",marginTop:4}}>First lift sets the standard.</div></div>}
        {videos.map((v,i)=>(
          <div key={v.id} style={{position:"absolute",inset:0,transform:`translateY(${(i-cur)*100}%)`,transition:"transform .38s cubic-bezier(.32,0,.67,0)",willChange:"transform"}}>
            <VideoSlide video={v} isCurrent={i===cur} onComment={()=>setCommentVid(v.id)} onProfile={onProfile} toast={toast}/>
          </div>
        ))}
      </div>
      <CommentsSheet videoId={commentVid} open={!!commentVid} onClose={()=>setCommentVid(null)}/>
    </div>
  );
}

// ── SEARCH ────────────────────────────────────────────────────────────────────
function SearchPage({onProfile}){
  const [q,setQ]=useState("");const [results,setResults]=useState({users:[],gyms:[]});const [loading,setLoading]=useState(false);
  useEffect(()=>{
    if(!q.trim()){setResults({users:[],gyms:[]});return;}
    const t=setTimeout(()=>{setLoading(true);api("GET",`/api/search?q=${encodeURIComponent(q)}`).then(r=>{setResults(r);setLoading(false);});},300);
    return()=>clearTimeout(t);
  },[q]);
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:BK,minHeight:0}}>
      <div style={{paddingTop:"calc(env(safe-area-inset-top,0px) + 18px)",paddingLeft:16,paddingRight:16,paddingBottom:14,flexShrink:0}}>
        <div style={{position:"relative"}}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search athletes..." style={{...iSt({paddingLeft:40})}}/>
          <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,color:MUTED}}>🔍</span>
          {q&&<span onClick={()=>setQ("")} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:MUTED,cursor:"pointer"}}>✕</span>}
        </div>
      </div>
      <div className="scr" style={{padding:"0 16px"}}>
        {!q&&<div style={{textAlign:"center",padding:"50px 20px",color:MUTED}}><div style={{fontSize:44,marginBottom:10}}>🔍</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:18,marginBottom:6}}>Find Competition</div><div style={{fontSize:13}}>Search by username</div></div>}
        {loading&&<div style={{textAlign:"center",padding:24,color:MUTED,fontSize:13}}>Searching...</div>}
        {!loading&&q&&results.users.length===0&&<div style={{textAlign:"center",padding:24,color:MUTED,fontSize:13}}>No results for "{q}"</div>}
        {results.users.map(u=>(
          <div key={u.id} onClick={()=>{onProfile(u.id);haptic();}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer"}}>
            <Avatar user={u} size={44}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:3}}>{u.username}{u.is_pro?<ProBadge/>:""}</div>
              <div style={{fontSize:11,color:MUTED}}>{u.gym_name||"No gym"}</div>
            </div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:GOLD,fontWeight:900}}>{u.points}<span style={{fontSize:9,color:MUTED,marginLeft:2}}>pts</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── UPLOAD ────────────────────────────────────────────────────────────────────
function UploadPage({onDone,toast}){
  const [form,setForm]=useState({title:"",lift_type:"Deadlift",weight_lbs:"",tags:""});
  const [file,setFile]=useState(null);const [preview,setPreview]=useState(null);
  const [busy,setBusy]=useState(false);const [err,setErr]=useState("");
  const fileRef=useRef();
  const pick=e=>{const f=e.target.files[0];if(!f)return;setFile(f);setPreview(URL.createObjectURL(f));};
  const submit=async()=>{
    if(!file){setErr("Choose a video");return;}if(!form.title.trim()){setErr("Add a caption");return;}
    setBusy(true);setErr("");haptic();
    const fd=new FormData();fd.append("video",file);fd.append("title",form.title);fd.append("lift_type",form.lift_type);fd.append("weight_lbs",form.weight_lbs);fd.append("tags",form.tags);
    const r=await fetch(`${API}/api/videos`,{method:"POST",headers:authHdr(),body:fd}).then(x=>x.json()).catch(()=>({error:"Upload failed"}));
    setBusy(false);if(r.error){setErr(r.error);return;}hapticH();toast("Posted 🔥");onDone();
  };
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:BK,minHeight:0}}>
      <div className="scr" style={{paddingTop:"calc(env(safe-area-inset-top,0px) + 20px)",paddingLeft:18,paddingRight:18,paddingBottom:48}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:900,marginBottom:18,letterSpacing:-.5}}>Post a Lift</div>
        <div onClick={()=>fileRef.current.click()} style={{borderRadius:16,marginBottom:20,cursor:"pointer",overflow:"hidden",minHeight:150,background:"rgba(200,164,90,0.04)",border:`1px dashed ${file?GOLD:"rgba(200,164,90,0.25)"}`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
          {preview?<video src={preview} style={{width:"100%",maxHeight:260,objectFit:"cover"}} muted playsInline autoPlay loop/>:<div style={{textAlign:"center",padding:24}}><div style={{fontSize:40,marginBottom:8}}>🎬</div><div style={{fontWeight:800,fontSize:16,marginBottom:4}}>Choose Video</div><div style={{fontSize:12,color:MUTED}}>MP4 · MOV · max 500MB</div></div>}
        </div>
        <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={pick}/>
        <div style={{marginBottom:12}}>{lbl("Lift")}<select value={form.lift_type} onChange={e=>setForm({...form,lift_type:e.target.value})} style={{...iSt()}}>{LIFTS.map(l=><option key={l}>{l}</option>)}</select></div>
        <div style={{marginBottom:12}}>{lbl("Weight (lbs)")}<input value={form.weight_lbs} onChange={e=>setForm({...form,weight_lbs:e.target.value})} placeholder="470" type="number" style={{...iSt()}}/></div>
        <div style={{marginBottom:12}}>{lbl("Caption")}<textarea value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="6 months. Finally." style={{...iSt({resize:"none",minHeight:68})}}/></div>
        <div style={{marginBottom:20}}>{lbl("Tags")}<input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="#deadlift #pr" style={{...iSt()}}/></div>
        <div style={{fontSize:11,color:MUTED,marginBottom:16,textAlign:"center"}}>💬 comment = +2pts · 5 reactions = +1pt</div>
        {err&&<div style={{color:RED,fontSize:13,marginBottom:12}}>{err}</div>}
        <GBtn onClick={submit} disabled={busy}>{busy?"Uploading...":"🚀 Post to RepRoom"}</GBtn>
      </div>
    </div>
  );
}

// ── PR CHART ──────────────────────────────────────────────────────────────────
function PRChart({history,lift}){
  const data=history.filter(h=>h.lift_type===lift).sort((a,b)=>new Date(a.set_at)-new Date(b.set_at));
  if(data.length<2) return null;
  const max=Math.max(...data.map(d=>d.weight_lbs)),min=Math.min(...data.map(d=>d.weight_lbs)),range=max-min||1;
  const W=300,H=72,pad=8;
  const pts=data.map((d,i)=>({x:pad+(i/(data.length-1))*(W-pad*2),y:H-pad-(d.weight_lbs-min)/range*(H-pad*2),w:d.weight_lbs}));
  const pathD=pts.map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" ");
  return(
    <div style={{background:BK3,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{fontSize:10,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:.8}}>{LE[lift]} {lift}</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:900,color:GOLD2}}>PR {max}lbs ↑</div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
        <defs><linearGradient id={`g${lift.replace(/ /g,"")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity=".25"/><stop offset="100%" stopColor={GOLD} stopOpacity="0"/></linearGradient></defs>
        <path d={`${pathD} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`} fill={`url(#g${lift.replace(/ /g,"")})`}/>
        <path d={pathD} stroke={GOLD} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="3" fill={GOLD}/>)}
      </svg>
    </div>
  );
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
function NotifPanel({onClose}){
  const [notifs,setNotifs]=useState([]);
  useEffect(()=>{api("GET","/api/notifications").then(r=>setNotifs(r.notifications||[]));},[]);
  const icons={comment:"💬",reaction:"💪",follow:"👤",challenge:"⚔",challenge_accepted:"✅",challenge_result:"🏆"};
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(12px)"}}>
      <div style={{background:BK2,border:"1px solid rgba(200,164,90,0.2)",borderRadius:"22px 22px 0 0",padding:"24px 20px 48px",width:"100%",maxHeight:"78vh",display:"flex",flexDirection:"column",animation:"slideUp .3s ease"}}>
        <div style={{width:36,height:4,background:"#282420",borderRadius:2,margin:"0 auto 18px",flexShrink:0}}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexShrink:0}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900}}>Notifications</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:MUTED,fontSize:18,cursor:"pointer"}}>✕</button>
        </div>
        <div className="scr">
          {notifs.length===0&&<div style={{textAlign:"center",color:MUTED,padding:28,fontSize:13}}>Nothing yet.</div>}
          {notifs.map(n=>(
            <div key={n.id} style={{display:"flex",gap:12,padding:"11px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:"rgba(200,164,90,0.08)",border:"1px solid rgba(200,164,90,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{icons[n.type]||"🔔"}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{n.title}</div>
                <div style={{fontSize:12,color:MUTED,lineHeight:1.4}}>{n.body}</div>
                <div style={{fontSize:10,color:MUTED,marginTop:3}}>{ago(n.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
function ProfilePage({userId,myUser,onBack,toast,onLogout,onUserUpdate,onOpenVideo,onChallenge}){
  const [data,setData]=useState(null);
  const [tab,setTab]=useState("videos");
  const [following,setFollowing]=useState(false);
  const [saves,setSaves]=useState([]);
  const [editing,setEditing]=useState(false);
  const [ef,setEf]=useState({username:"",bio:"",gender:"other"});
  const [eBusy,setEBusy]=useState(false);const [eErr,setEErr]=useState("");
  const [showNotifs,setShowNotifs]=useState(false);
  const avatarRef=useRef();
  const isMe=userId===myUser?.id;

  const load=useCallback(()=>{
    if(!userId)return;
    api("GET",`/api/users/${userId}`).then(r=>{
      setData(r);
      if(r.user) setEf({username:r.user.username||"",bio:r.user.bio||"",gender:r.user.gender||"other"});
      if(r.isFollowing!==undefined) setFollowing(r.isFollowing);
    });
    if(isMe) api("GET","/api/saves").then(r=>setSaves(r.videos||[]));
  },[userId,isMe]);
  useEffect(()=>load(),[load]);

  const follow=async()=>{haptic();const r=await api("POST",`/api/users/${userId}/follow`);if(!r.error)setFollowing(r.following);};

  const uploadAvatar=async(e)=>{
    const file=e.target.files[0];if(!file)return;haptic();
    const fd=new FormData();fd.append("avatar",file);
    const r=await fetch(`${API}/api/auth/avatar`,{method:"POST",headers:authHdr(),body:fd}).then(x=>x.json()).catch(()=>({error:"fail"}));
    if(r.error){toast("Failed");return;}await load();if(onUserUpdate)onUserUpdate(r.user);toast("Photo updated ✓");
  };

  const saveProfile=async()=>{
    setEBusy(true);setEErr("");haptic();
    const body={bio:ef.bio,gender:ef.gender};
    if(ef.username.trim()) body.username=ef.username.trim();
    const r=await api("PUT","/api/auth/me",body);
    setEBusy(false);if(r.error){setEErr(r.error||"Failed");return;}
    await load();if(onUserUpdate)onUserUpdate(r.user);setEditing(false);toast("Saved ✓");
  };

  if(!data) return <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:MUTED,background:BK}}>Loading...</div>;
  const {user,videos,pbs,prHistory}=data;
  const displayVideos=tab==="saved"&&isMe?saves:videos;
  const liftTypes=[...new Set((prHistory||[]).map(h=>h.lift_type))];

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:BK,minHeight:0}}>
      {onBack&&<div onClick={onBack} style={{paddingTop:"calc(env(safe-area-inset-top,0px) + 14px)",paddingLeft:16,paddingBottom:0,flexShrink:0,cursor:"pointer",color:GOLD,fontSize:13,fontWeight:700,zIndex:10}}>← Back</div>}
      <div className="scr">
        {/* Banner */}
        <div style={{height:110,position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#0a0600,#160f00,#070500)"}}>
          <div style={{position:"absolute",inset:0,opacity:.08,backgroundImage:"repeating-linear-gradient(45deg,#c8a45a 0,#c8a45a 1px,transparent 0,transparent 50%)",backgroundSize:"16px 16px"}}/>
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:"70%",background:"linear-gradient(to bottom,transparent,#040303)"}}/>
        </div>
        <div style={{padding:"0 16px 32px"}}>
          {/* Avatar + buttons */}
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginTop:-32,marginBottom:12,position:"relative",zIndex:2}}>
            <div style={{position:"relative",cursor:isMe?"pointer":"default"}} onClick={isMe?()=>avatarRef.current.click():undefined}>
              <Avatar user={user} size={72} style={{border:"3px solid #040303",boxShadow:"0 4px 16px rgba(200,164,90,0.25)"}}/>
              {isMe&&<div style={{position:"absolute",bottom:0,right:0,width:22,height:22,borderRadius:"50%",background:GOLD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,border:"2px solid #040303"}}>📷</div>}
              {isMe&&<input ref={avatarRef} type="file" accept="image/*" style={{display:"none"}} onChange={uploadAvatar}/>}
            </div>
            <div style={{display:"flex",gap:7,marginBottom:2}}>
              {isMe?(
                <>
                  <button onClick={()=>setShowNotifs(true)} style={{background:"transparent",border:"1px solid rgba(255,255,255,0.08)",color:MUTED,borderRadius:10,padding:"7px 10px",fontSize:13,cursor:"pointer"}}>🔔</button>
                  <button onClick={()=>{setEditing(true);haptic();}} style={{background:"transparent",border:`1px solid rgba(200,164,90,0.3)`,color:GOLD,borderRadius:10,padding:"7px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>{localStorage.clear();onLogout();}} style={{background:"transparent",border:"1px solid rgba(255,255,255,0.07)",color:MUTED,borderRadius:10,padding:"7px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Out</button>
                </>
              ):(
                <div style={{display:"flex",gap:7}}>
                  <button onClick={follow} style={{background:following?"transparent":GOLD,color:following?GOLD:"#000",border:following?`1px solid ${GOLD}`:"none",borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:800,cursor:"pointer"}}>{following?"Following":"Follow"}</button>
                  {onChallenge&&<button onClick={()=>onChallenge({...user})} style={{background:`rgba(232,64,64,0.12)`,border:`1px solid rgba(232,64,64,0.35)`,color:RED,borderRadius:10,padding:"8px 12px",fontSize:12,fontWeight:800,cursor:"pointer"}}>⚔ Fight</button>}
                </div>
              )}
            </div>
          </div>
          {/* Name */}
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,marginBottom:2,display:"flex",alignItems:"center",gap:5}}>{user.username}{user.is_pro?<ProBadge/>:""}</div>
          <div style={{color:MUTED,fontSize:11,marginBottom:4}}>{user.gender&&user.gender!=="other"?`${user.gender==="male"?"♂":"♀"} · `:""}{data.gym?.name||""}</div>
          {pbs?.length>0&&<div style={{fontSize:11,color:GOLD2,fontWeight:700,marginBottom:user.bio?8:12}}>Best lift: {Math.max(...pbs.map(p=>p.weight_lbs))}lbs {LE[pbs.sort((a,b)=>b.weight_lbs-a.weight_lbs)[0]?.lift_type]||""}</div>}
          {user.bio&&<div style={{fontSize:13,color:"#c8bfb0",lineHeight:1.5,marginBottom:12}}>{user.bio}</div>}
          {/* Stats */}
          <div style={{display:"flex",gap:4,marginBottom:16}}>
            {[{val:user.points,lbl:"pts",gold:true},{val:`#${user.monthly_rank||"—"}`,lbl:"rank"},{val:videos.length,lbl:"vids"}].map((s,i)=>(
              <div key={i} style={{flex:1,padding:"10px 4px",textAlign:"center",background:BK2,border:"1px solid rgba(255,255,255,0.04)",borderRadius:12}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:900,lineHeight:1,marginBottom:2,color:s.gold?GOLD:"#f2ece0"}}>{s.val}</div>
                <div style={{fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:.8,fontWeight:700}}>{s.lbl}</div>
              </div>
            ))}
          </div>
          {/* PBs */}
          {pbs?.length>0&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:9,fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:MUTED,marginBottom:10}}>Personal Bests</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                {pbs.map(pb=>(
                  <div key={pb.id} style={{background:BK2,border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,padding:12}}>
                    <div style={{fontSize:9,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:.8,marginBottom:3}}>{pb.lift_type}</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900,color:GOLD2,lineHeight:1}}>{pb.weight_lbs}<span style={{fontSize:11,color:MUTED,marginLeft:2}}>lbs</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Progress charts */}
          {prHistory?.length>=2&&liftTypes.length>0&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:9,fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:MUTED,marginBottom:10}}>Progress</div>
              {liftTypes.map(lift=><PRChart key={lift} history={prHistory} lift={lift}/>)}
            </div>
          )}
          {/* Tabs */}
          <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.05)",marginBottom:12}}>
            {(isMe?["videos","saved"]:["videos"]).map(t=>(
              <div key={t} onClick={()=>setTab(t)} style={{flex:1,textAlign:"center",padding:"9px 4px",fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:.7,color:tab===t?GOLD:MUTED,cursor:"pointer",borderBottom:tab===t?`2px solid ${GOLD}`:"2px solid transparent",marginBottom:-1}}>{t}</div>
            ))}
          </div>
          {/* Grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2}}>
            {displayVideos.map((v,idx)=>(
              <div key={v.id} onClick={()=>onOpenVideo&&onOpenVideo(displayVideos,idx)} style={{aspectRatio:"9/16",position:"relative",overflow:"hidden",background:BG[v.id%BG.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,cursor:"pointer"}}>
                {v.url?<video src={API+v.url} style={{width:"100%",height:"100%",objectFit:"cover"}} muted playsInline/>:<span>{LE[v.lift_type]||"🏋️"}</span>}
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 50%)"}}/>
                <div style={{position:"absolute",bottom:3,left:4,fontSize:9,fontWeight:800,color:"#fff"}}>💬 {fmt(v.comment_count)}</div>
                {v.weight_lbs&&<div style={{position:"absolute",top:3,left:4,fontSize:8,fontWeight:800,color:GOLD2}}>{v.weight_lbs}lbs</div>}
              </div>
            ))}
            {displayVideos.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:24,color:MUTED,fontSize:12}}>{tab==="saved"?"No saved videos.":"No lifts recorded."}</div>}
          </div>
        </div>
      </div>
      {/* Edit modal */}
      {editing&&(
        <div onClick={e=>e.target===e.currentTarget&&setEditing(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(12px)"}}>
          <div style={{background:BK2,border:"1px solid rgba(200,164,90,0.2)",borderRadius:"22px 22px 0 0",padding:"24px 22px 48px",width:"100%",animation:"slideUp .3s ease"}}>
            <div style={{width:36,height:4,background:"#282420",borderRadius:2,margin:"0 auto 18px"}}/>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,marginBottom:18}}>Edit Profile</div>
            {lbl("Username")}<input value={ef.username} onChange={e=>setEf({...ef,username:e.target.value})} style={{...iSt({marginBottom:12})}}/>
            {lbl("Bio")}<textarea value={ef.bio} onChange={e=>setEf({...ef,bio:e.target.value})} placeholder="Who you are..." style={{...iSt({resize:"none",minHeight:64,marginBottom:12})}}/>
            {lbl("Division")}
            <div style={{display:"flex",gap:7,marginBottom:18}}>
              {[["male","♂ Male"],["female","♀ Female"],["other","⚡ Other"]].map(([v,l])=>(
                <div key={v} onClick={()=>{setEf({...ef,gender:v});haptic();}} style={{flex:1,textAlign:"center",padding:"10px 6px",borderRadius:11,border:`1px solid ${ef.gender===v?GOLD:"rgba(255,255,255,0.07)"}`,background:ef.gender===v?"rgba(200,164,90,0.08)":BK3,cursor:"pointer",fontSize:12,fontWeight:700,color:ef.gender===v?GOLD2:MUTED}}>{l}</div>
              ))}
            </div>
            {eErr&&<div style={{color:RED,fontSize:13,marginBottom:10}}>{eErr}</div>}
            <GBtn onClick={saveProfile} disabled={eBusy}>{eBusy?"Saving...":"Save"}</GBtn>
            <div onClick={()=>setEditing(false)} style={{textAlign:"center",marginTop:12,fontSize:12,color:MUTED,cursor:"pointer"}}>Cancel</div>
          </div>
        </div>
      )}
      {showNotifs&&<NotifPanel onClose={()=>setShowNotifs(false)}/>}
    </div>
  );
}

// ── VIDEO VIEWER ──────────────────────────────────────────────────────────────
function VideoViewer({videos,startIdx,onClose,onProfile,toast}){
  const [cur,setCur]=useState(startIdx||0);
  const [commentVid,setCommentVid]=useState(null);
  const touchY=useRef(0);const stackRef=useRef(null);
  const go=useCallback(dir=>{haptic();setCur(c=>Math.max(0,Math.min(videos.length-1,c+dir)));},[videos.length]);
  useEffect(()=>{
    const el=stackRef.current;if(!el)return;
    const ts=e=>{touchY.current=e.touches[0].clientY;};
    const te=e=>{const dy=touchY.current-e.changedTouches[0].clientY;if(dy>50)go(1);else if(dy<-50)go(-1);};
    el.addEventListener("touchstart",ts,{passive:true});el.addEventListener("touchend",te,{passive:true});
    return()=>{el.removeEventListener("touchstart",ts);el.removeEventListener("touchend",te);};
  },[go]);
  return(
    <div style={{position:"fixed",inset:0,background:BK,zIndex:300,display:"flex",flexDirection:"column"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,zIndex:20,paddingTop:"calc(env(safe-area-inset-top,0px) + 12px)",paddingLeft:14}}>
        <button onClick={onClose} style={{background:"rgba(0,0,0,.5)",border:"none",color:"#fff",fontSize:14,padding:"7px 13px",borderRadius:18,cursor:"pointer",fontWeight:700}}>✕</button>
      </div>
      <div ref={stackRef} style={{position:"absolute",inset:0,overflow:"hidden"}}>
        {videos.map((v,i)=>(
          <div key={v.id} style={{position:"absolute",inset:0,transform:`translateY(${(i-cur)*100}%)`,transition:"transform .38s cubic-bezier(.32,0,.67,0)",willChange:"transform"}}>
            <VideoSlide video={v} isCurrent={i===cur} onComment={()=>setCommentVid(v.id)} onProfile={onProfile} toast={toast}/>
          </div>
        ))}
      </div>
      <CommentsSheet videoId={commentVid} open={!!commentVid} onClose={()=>setCommentVid(null)}/>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(null);
  const [authed,setAuthed]=useState(false);
  const [onboarded,setOnboarded]=useState(false);
  const [tab,setTab]=useState("ranks");
  const [viewingUser,setViewingUser]=useState(null);
  const [toast,setToast]=useState("");
  const [pendingChallenges,setPendingChallenges]=useState(0);
  const [unreadNotifs,setUnreadNotifs]=useState(0);
  const [videoViewer,setVideoViewer]=useState(null);
  const [challengeTarget,setChallengeTarget]=useState(null);

  useEffect(()=>{const s=document.createElement("style");s.textContent=CSS;document.head.appendChild(s);return()=>document.head.removeChild(s);},[]);

  useEffect(()=>{
    const t=token();if(!t){setAuthed(false);return;}
    if(localStorage.getItem("rr_onboarded")) setOnboarded(true);
    api("GET","/api/auth/me").then(r=>{
      if(r.user){setUser(r.user);setAuthed(true);setUnreadNotifs(r.unread_notifications||0);}
      else{localStorage.removeItem("rr_token");setAuthed(false);}
    });
  },[]);

  useEffect(()=>{
    if(!authed||!user?.id)return;
    const check=()=>api("GET","/api/challenges").then(r=>setPendingChallenges((r.challenges||[]).filter(c=>c.status==="pending"&&c.opponent_id===user.id).length));
    const checkN=()=>api("GET","/api/notifications/unread").then(r=>setUnreadNotifs(r.count||0));
    check();checkN();
    const iv=setInterval(()=>{check();checkN();},60000);
    return()=>clearInterval(iv);
  },[authed,user?.id]);

  const onAuth=u=>{setUser(u);setAuthed(true);};
  const onOnboarded=()=>{localStorage.setItem("rr_onboarded","1");setOnboarded(true);};
  const onLogout=()=>{localStorage.clear();setUser(null);setAuthed(false);setOnboarded(false);};
  const openChallenge=target=>{setChallengeTarget(target);haptic();};

  if(!authed) return <AuthScreen onAuth={onAuth}/>;
  if(!onboarded) return <Onboarding onDone={onOnboarded}/>;

  const renderPage=()=>{
    if(viewingUser!=null) return <ProfilePage userId={viewingUser} myUser={user} onBack={()=>setViewingUser(null)} toast={t=>setToast(t)} onLogout={onLogout} onUserUpdate={u=>setUser(u)} onOpenVideo={(vids,idx)=>setVideoViewer({videos:vids,startIdx:idx})} onChallenge={openChallenge}/>;
    switch(tab){
      case "ranks":      return <ArenaPage myUser={user} toast={t=>setToast(t)} onProfile={id=>setViewingUser(id)} onChallenge={openChallenge}/>;
      case "challenges": return <ChallengesPage myUser={user} toast={t=>setToast(t)} onProfile={id=>setViewingUser(id)} onChallenge={openChallenge}/>;
      case "feed":       return <FeedPage onProfile={id=>setViewingUser(id)} toast={t=>setToast(t)} myUser={user} onChallenge={openChallenge}/>;
      case "search":     return <SearchPage onProfile={id=>setViewingUser(id)} toast={t=>setToast(t)}/>;
      case "upload":     return <UploadPage onDone={()=>setTab("ranks")} toast={t=>setToast(t)}/>;
      case "profile":    return <ProfilePage userId={user?.id} myUser={user} toast={t=>setToast(t)} onLogout={onLogout} onUserUpdate={u=>setUser(u)} onOpenVideo={(vids,idx)=>setVideoViewer({videos:vids,startIdx:idx})} onChallenge={openChallenge}/>;
      default: return null;
    }
  };

  return(
    <div style={{display:"flex",flexDirection:"column",width:"100%",height:"100dvh",maxWidth:430,margin:"0 auto",background:BK,overflow:"hidden",position:"relative"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,overflow:"hidden"}}>{renderPage()}</div>
      {viewingUser==null&&<BottomNav tab={tab} setTab={t=>{setTab(t);setViewingUser(null);}} pendingChallenges={pendingChallenges} unreadNotifs={unreadNotifs}/>}
      {toast&&<Toast msg={toast} onDone={()=>setToast("")}/>}
      {videoViewer&&<VideoViewer videos={videoViewer.videos} startIdx={videoViewer.startIdx} onClose={()=>setVideoViewer(null)} onProfile={id=>setViewingUser(id)} toast={t=>setToast(t)}/>}
      {challengeTarget&&<ChallengeModal target={challengeTarget} myPts={user?.points||0} onClose={()=>setChallengeTarget(null)} onSent={()=>{setChallengeTarget(null);setToast("Challenge sent ⚔");hapticH();setTab("challenges");}}/>}
    </div>
  );
}
