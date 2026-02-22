// RepRoom App.jsx v5
import { useState, useEffect, useRef, useCallback } from "react";

const API = "https://mini-youtube-api-rgd4.onrender.com";
const token = () => localStorage.getItem("rr_token");
const authHdr = () => token() ? { Authorization:`Bearer ${token()}` } : {};
async function api(method, path, body) {
  const opts = { method, headers:{"Content-Type":"application/json",...authHdr()} };
  if (body) opts.body = JSON.stringify(body);
  try { const r = await fetch(API+path, opts); return r.json(); } catch { return {error:"Network error"}; }
}
const haptic = () => { try{navigator.vibrate?.(10);}catch{} };
const hapticH = () => { try{navigator.vibrate?.(40);}catch{} };

const LIFTS = ["Deadlift","Squat","Bench Press","Overhead Press","Other"];
const LE = { Deadlift:"🏋️", Squat:"🦵", "Bench Press":"💪", "Overhead Press":"🙌", Other:"🔥" };
const REACTIONS = ["💪","🔥","😤","👑","🤯"];
const BG = ["radial-gradient(ellipse at 30% 60%,#1a0f00,#060505)","radial-gradient(ellipse at 60% 40%,#001a08,#060505)","radial-gradient(ellipse at 40% 50%,#0a0018,#060505)","radial-gradient(ellipse at 50% 30%,#1a0008,#060505)","radial-gradient(ellipse at 20% 70%,#001818,#060505)","radial-gradient(ellipse at 70% 60%,#181800,#060505)"];
const fmt = n => n>=1000?`${(n/1000).toFixed(1)}k`:String(n||0);
const ago = d => { const s=(Date.now()-new Date(d))/1000; if(s<60)return"now"; if(s<3600)return`${~~(s/60)}m`; if(s<86400)return`${~~(s/3600)}h`; return`${~~(s/86400)}d`; };
const monthName = m => { const [y,mo]=m.split("-"); return new Date(+y,+mo-1,1).toLocaleString("en-US",{month:"long",year:"numeric"}); };

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;width:100%;overflow:hidden;background:#060505;color:#f2ece0;font-family:'Outfit',sans-serif;-webkit-font-smoothing:antialiased}
input,textarea,select,button{font-family:'Outfit',sans-serif;font-size:14px}
::-webkit-scrollbar{display:none}
.scr{overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1;min-height:0}
video{display:block}
.safe-top{padding-top:env(safe-area-inset-top,0px)}
`;

const GOLD="#c8a45a",GOLD2="#e2bc72",BK2="#0e0c0b",BK3="#161412",MUTED="#5a534a";
const iSt=(extra={})=>({width:"100%",background:BK2,border:"1px solid rgba(255,255,255,0.08)",color:"#f2ece0",padding:"12px 16px",borderRadius:12,fontSize:14,outline:"none",...extra});
const lbl=txt=><div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:MUTED,marginBottom:8}}>{txt}</div>;
const GBtn=({children,onClick,disabled,style={}})=>(
  <button onClick={onClick} disabled={disabled} style={{width:"100%",background:disabled?"#282420":"linear-gradient(135deg,#c8a45a,#e2bc72)",color:disabled?MUTED:"#000",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:900,cursor:disabled?"default":"pointer",...style}}>{children}</button>
);

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({msg,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[]);
  return <div style={{position:"fixed",bottom:96,left:"50%",transform:"translateX(-50%)",background:BK3,border:`1px solid ${GOLD}`,borderRadius:12,padding:"10px 22px",fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 4px 24px rgba(0,0,0,.8)",pointerEvents:"none",whiteSpace:"nowrap"}}>{msg}</div>;
}

// ── AVATAR ────────────────────────────────────────────────────────────────────
function Avatar({user,size=38,style={},onClick}){
  const COLS=["linear-gradient(135deg,#c8a45a,#e2bc72)","#1e3d5c","#1a4a2e","#3a1a5a","#5a1a00","#1a1a5a","#5a3a00"];
  const idx=(user?.id||0)%COLS.length;
  const base={width:size,height:size,borderRadius:"50%",flexShrink:0,...style,cursor:onClick?"pointer":"default"};
  const handleClick=onClick?()=>onClick():undefined;
  if(user?.avatar_url) return <img src={user.avatar_url.startsWith("http")?user.avatar_url:API+user.avatar_url} alt="" onClick={handleClick} style={{...base,objectFit:"cover"}}/>;
  return <div onClick={handleClick} style={{...base,background:COLS[idx],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:size*.38,color:idx===0?"#000":"#fff"}}>{(user?.username||"?")[0].toUpperCase()}</div>;
}

// ── PRO BADGE ─────────────────────────────────────────────────────────────────
const ProBadge=()=><span style={{background:"linear-gradient(135deg,#c8a45a,#e2bc72)",color:"#000",fontSize:8,fontWeight:900,padding:"2px 6px",borderRadius:6,letterSpacing:.5,textTransform:"uppercase",marginLeft:4}}>PRO</span>;

// ── AUTH ──────────────────────────────────────────────────────────────────────
function AuthScreen({onAuth}){
  const [mode,setMode]=useState("login");
  const [f,setF]=useState({username:"",email:"",password:""});
  const [err,setErr]=useState("");const [busy,setBusy]=useState(false);
  const submit=async()=>{
    setErr("");setBusy(true);haptic();
    const r=await api("POST",mode==="login"?"/api/auth/login":"/api/auth/register",mode==="login"?{email:f.email,password:f.password}:f);
    setBusy(false);
    if(r.error){setErr(r.error);return;}
    localStorage.setItem("rr_token",r.token);onAuth(r.user);
  };
  return(
    <div style={{height:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 28px",background:"#060505"}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:52,fontWeight:900,background:`linear-gradient(135deg,${GOLD2},${GOLD})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:6}}>RepRoom</div>
      <div style={{fontSize:11,color:MUTED,letterSpacing:3,textTransform:"uppercase",marginBottom:48}}>If it's not on video, it didn't happen.</div>
      <div style={{width:"100%",maxWidth:360}}>
        {mode==="register"&&<input value={f.username} onChange={e=>setF({...f,username:e.target.value})} placeholder="Username" style={{...iSt(),marginBottom:10}}/>}
        <input value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="Email" type="email" style={{...iSt(),marginBottom:10}}/>
        <input value={f.password} onChange={e=>setF({...f,password:e.target.value})} placeholder="Password" type="password" style={{...iSt(),marginBottom:14}} onKeyDown={e=>e.key==="Enter"&&submit()}/>
        {err&&<div style={{color:"#b83232",fontSize:13,marginBottom:12}}>{err}</div>}
        <GBtn onClick={submit} disabled={busy}>{busy?"...":mode==="login"?"Sign In":"Create Account"}</GBtn>
        <div onClick={()=>setMode(m=>m==="login"?"register":"login")} style={{textAlign:"center",marginTop:16,fontSize:13,color:MUTED,cursor:"pointer"}}>{mode==="login"?"New here? Create account":"Already have an account? Sign in"}</div>
      </div>
    </div>
  );
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
// Haversine distance in miles
function distMiles(lat1,lon1,lat2,lon2){
  const R=3958.8,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// Rough lat/lng from city name (hardcoded for seeded gyms, fallback to null)
const GYM_COORDS={
  "Iron Paradise":{lat:41.0034,lng:-73.6673},
  "Gold's Gym":{lat:33.9850,lng:-118.4695},
  "Equinox":{lat:40.7580,lng:-73.9855},
  "Planet Fitness":{lat:41.8781,lng:-87.6298},
  "LA Fitness":{lat:34.0522,lng:-118.2437},
  "CrossFit HQ":{lat:38.9072,lng:-77.0369},
  "24 Hour Fitness":{lat:37.7749,lng:-122.4194},
  "YMCA":{lat:42.3601,lng:-71.0589},
  "Anytime Fitness":{lat:30.2672,lng:-97.7431},
};

function Onboarding({onDone}){
  const [step,setStep]=useState(0);
  const [gyms,setGyms]=useState([]);
  const [gymId,setGymId]=useState(null);
  const [gender,setGender]=useState(null);
  const [lifts,setLifts]=useState([]);
  const [busy,setBusy]=useState(false);
  const [locState,setLocState]=useState("idle"); // idle | asking | granted | denied
  const [userCoords,setUserCoords]=useState(null);
  const [showLocPrompt,setShowLocPrompt]=useState(false);

  useEffect(()=>{api("GET","/api/gyms").then(r=>setGyms(r.gyms||[]));},[ ]);

  // Show location prompt on mount after short delay
  useEffect(()=>{const t=setTimeout(()=>setShowLocPrompt(true),600);return()=>clearTimeout(t);},[]);

  const requestLocation=()=>{
    setShowLocPrompt(false);setLocState("asking");haptic();
    navigator.geolocation.getCurrentPosition(
      pos=>{setUserCoords({lat:pos.coords.latitude,lng:pos.coords.longitude});setLocState("granted");hapticH();},
      ()=>setLocState("denied"),
      {timeout:8000,maximumAge:60000}
    );
  };

  const finish=async()=>{
    setBusy(true);hapticH();
    const body={};
    if(gymId&&gymId!=="other") body.gym_id=Number(gymId);
    if(gender) body.gender=gender;
    if(Object.keys(body).length) await api("PUT","/api/auth/me",body);
    setBusy(false);onDone();
  };

  const pill=(label,active,onClick)=>(
    <div onClick={onClick} style={{padding:"11px 18px",borderRadius:20,border:`1px solid ${active?GOLD:"rgba(255,255,255,0.08)"}`,background:active?"rgba(200,164,90,0.12)":BK2,cursor:"pointer",fontSize:14,fontWeight:700,color:active?GOLD2:MUTED,display:"inline-flex",alignItems:"center",gap:8}}>{label}</div>
  );

  // Sort/filter gyms by distance if we have coords
  const sortedGyms = userCoords
    ? [...gyms].map(g=>{
        const c=GYM_COORDS[g.name];
        const dist=c?distMiles(userCoords.lat,userCoords.lng,c.lat,c.lng):null;
        return{...g,dist};
      }).sort((a,b)=>{
        if(a.dist===null&&b.dist===null) return 0;
        if(a.dist===null) return 1;
        if(b.dist===null) return -1;
        return a.dist-b.dist;
      })
    : gyms;

  const nearbyGyms = userCoords ? sortedGyms.filter(g=>g.dist!==null&&g.dist<=15) : [];
  const otherGyms  = userCoords ? sortedGyms.filter(g=>g.dist===null||g.dist>15)  : sortedGyms;

  return(
    <>
    {/* Location permission prompt overlay */}
    {showLocPrompt&&step===0&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:500,display:"flex",alignItems:"flex-end",backdropFilter:"blur(12px)"}}>
        <div style={{background:BK2,border:"1px solid rgba(200,164,90,0.3)",borderRadius:"24px 24px 0 0",padding:"32px 24px 48px",width:"100%",maxWidth:430}}>
          <div style={{width:38,height:4,background:"#282420",borderRadius:2,margin:"0 auto 24px"}}/>
          <div style={{fontSize:52,textAlign:"center",marginBottom:16}}>📍</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:900,textAlign:"center",marginBottom:10}}>Find Your Gym</div>
          <div style={{fontSize:14,color:MUTED,textAlign:"center",lineHeight:1.6,marginBottom:28}}>Allow location access to see gyms near you first. We never store or share your location.</div>
          <GBtn onClick={requestLocation}>Use My Location</GBtn>
          <div onClick={()=>{setShowLocPrompt(false);setLocState("denied");}} style={{textAlign:"center",marginTop:14,fontSize:13,color:MUTED,cursor:"pointer"}}>Skip — show all gyms</div>
        </div>
      </div>
    )}

    <div style={{height:"100dvh",display:"flex",flexDirection:"column",padding:"40px 24px 32px",background:"#060505",overflow:"hidden"}}>
      <div style={{display:"flex",gap:6,marginBottom:40,flexShrink:0}}>
        {[0,1,2].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?GOLD:"#282420"}}/>)}
      </div>
      {step===0&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:900,marginBottom:4}}>Your Gym 🏛</div>
          {locState==="granted"&&nearbyGyms.length>0&&(
            <div style={{fontSize:13,color:GOLD2,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
              <span>📍</span> {nearbyGyms.length} gym{nearbyGyms.length>1?"s":""} within 15 miles
            </div>
          )}
          {locState==="asking"&&<div style={{fontSize:13,color:MUTED,marginBottom:12}}>Finding nearby gyms...</div>}
          {(locState==="idle"||locState==="denied")&&<div style={{fontSize:14,color:MUTED,marginBottom:16,lineHeight:1.5}}>Where do you train?</div>}
          <div className="scr" style={{flex:1,marginBottom:16,minHeight:0}}>
            {/* Nearby section */}
            {locState==="granted"&&nearbyGyms.length>0&&(
              <>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:GOLD,marginBottom:10}}>📍 Near You</div>
                {nearbyGyms.map(g=>(
                  <div key={g.id} onClick={()=>{setGymId(g.id);haptic();}} style={{padding:"15px 16px",borderRadius:14,border:`1px solid ${gymId===g.id?GOLD:"rgba(255,255,255,0.07)"}`,background:gymId===g.id?"rgba(200,164,90,0.08)":BK2,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:6}}>{g.name}{g.verified?<span style={{fontSize:12,color:GOLD}}>✓</span>:""}</div>
                      <div style={{fontSize:12,color:MUTED,marginTop:2,display:"flex",alignItems:"center",gap:8}}>
                        <span>{g.city}{g.state?`, ${g.state}`:""}</span>
                        {g.dist!=null&&<span style={{color:GOLD2,fontWeight:700}}>{g.dist<1?"<1":g.dist.toFixed(1)} mi</span>}
                        {g.partner?<span>🏆 Partner</span>:""}
                      </div>
                    </div>
                    {gymId===g.id&&<div style={{color:GOLD,fontSize:18}}>✓</div>}
                  </div>
                ))}
                {otherGyms.filter(g=>g.name!=="Other / Home Gym").length>0&&<div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:MUTED,marginBottom:10,marginTop:16}}>All Gyms</div>}
              </>
            )}
            {/* All / remaining gyms */}
            {(locState==="granted"?otherGyms:sortedGyms).filter(g=>g.name!=="Other / Home Gym").map(g=>(
              <div key={g.id} onClick={()=>{setGymId(g.id);haptic();}} style={{padding:"15px 16px",borderRadius:14,border:`1px solid ${gymId===g.id?GOLD:"rgba(255,255,255,0.07)"}`,background:gymId===g.id?"rgba(200,164,90,0.08)":BK2,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:6}}>{g.name}{g.verified?<span style={{fontSize:12,color:GOLD}}>✓</span>:""}</div>
                  <div style={{fontSize:12,color:MUTED,marginTop:2,display:"flex",alignItems:"center",gap:8}}>
                    <span>{g.city}{g.state?`, ${g.state}`:""}</span>
                    {g.dist!=null&&g.dist<=50&&<span style={{color:MUTED,fontWeight:600}}>{g.dist.toFixed(1)} mi</span>}
                    {g.partner?<span>🏆 Partner</span>:""}
                  </div>
                </div>
                {gymId===g.id&&<div style={{color:GOLD,fontSize:18}}>✓</div>}
              </div>
            ))}
            <div onClick={()=>{setGymId("other");haptic();}} style={{padding:"15px 16px",borderRadius:14,border:`1px solid ${gymId==="other"?GOLD:"rgba(255,255,255,0.07)"}`,background:gymId==="other"?"rgba(200,164,90,0.08)":BK2,cursor:"pointer",marginBottom:8}}>
              <div style={{fontWeight:700,fontSize:15}}>Other / Not Listed</div>
            </div>
          </div>
          <GBtn onClick={()=>{setStep(1);haptic();}} disabled={!gymId} style={{flexShrink:0}}>Continue →</GBtn>
        </div>
      )}
      {step===1&&(
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:900,marginBottom:8}}>Your Category 🏆</div>
          <div style={{fontSize:14,color:MUTED,marginBottom:28,lineHeight:1.5}}>You'll compete on a separate leaderboard by gender.</div>
          <div style={{display:"flex",gap:10,marginBottom:32}}>
            {[["male","♂ Male"],["female","♀ Female"],["other","⚡ Other"]].map(([v,l])=>(
              <div key={v} onClick={()=>{setGender(v);haptic();}} style={{flex:1,padding:"16px 8px",borderRadius:14,border:`1px solid ${gender===v?GOLD:"rgba(255,255,255,0.08)"}`,background:gender===v?"rgba(200,164,90,0.1)":BK2,cursor:"pointer",textAlign:"center",fontWeight:700,fontSize:14,color:gender===v?GOLD2:MUTED}}>{l}</div>
            ))}
          </div>
          <GBtn onClick={()=>{setStep(2);haptic();}} disabled={!gender}>Continue →</GBtn>
        </div>
      )}
      {step===2&&(
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:900,marginBottom:8}}>Your Lifts 🏋️</div>
          <div style={{fontSize:14,color:MUTED,marginBottom:28,lineHeight:1.5}}>What do you train?</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:36}}>
            {LIFTS.map(l=>pill(`${LE[l]} ${l}`,lifts.includes(l),()=>{setLifts(p=>p.includes(l)?p.filter(x=>x!==l):[...p,l]);haptic();}))}
          </div>
          <GBtn onClick={finish} disabled={busy||lifts.length===0}>{busy?"Setting up...":"Let's go 🚀"}</GBtn>
          <div onClick={onDone} style={{textAlign:"center",marginTop:14,fontSize:13,color:MUTED,cursor:"pointer"}}>Skip for now</div>
        </div>
      )}
    </div>
    </>
  );
}

// ── BOTTOM NAV ────────────────────────────────────────────────────────────────
function BottomNav({tab,setTab,pendingChallenges,unreadNotifs}){
  const items=[{id:"feed",icon:"🏠",lbl:"Feed"},{id:"search",icon:"🔍",lbl:"Search"},{id:"upload",isPost:true},{id:"ranks",icon:"👑",lbl:"Ranks"},{id:"profile",icon:"👤",lbl:"Me"}];
  return(
    <nav style={{flexShrink:0,paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 10px)",paddingTop:10,background:"rgba(6,5,5,0.97)",borderTop:"1px solid rgba(200,164,90,0.15)",display:"flex",alignItems:"center",justifyContent:"space-around",zIndex:100}}>
      {items.map(item=>item.isPost?(
        <div key="up" onClick={()=>{setTab("upload");haptic();}} style={{width:52,height:52,borderRadius:16,marginTop:-16,background:`linear-gradient(145deg,${GOLD2},${GOLD})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,cursor:"pointer",border:"3px solid #060505",boxShadow:`0 4px 20px rgba(200,164,90,0.4)`,color:"#000",fontWeight:900,flexShrink:0}}>＋</div>
      ):(
        <button key={item.id} onClick={()=>{setTab(item.id);haptic();}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",padding:"4px 12px",background:"none",border:"none",color:tab===item.id?GOLD:MUTED,position:"relative"}}>
          <span style={{fontSize:20}}>{item.icon}</span>
          <span style={{fontSize:9,fontWeight:700,letterSpacing:.8,textTransform:"uppercase"}}>{item.lbl}</span>
          {item.id==="profile"&&(pendingChallenges>0||unreadNotifs>0)&&<div style={{position:"absolute",top:0,right:6,width:8,height:8,borderRadius:"50%",background:"#e84040",border:"1.5px solid #060505"}}/>}
        </button>
      ))}
    </nav>
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
    <div style={{position:"absolute",inset:0}} onClick={()=>{if(showReactions){setShowReactions(false);}else{togglePlay();}}}>
      {video?.url?<video ref={vRef} src={API+video.url} loop playsInline style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{position:"absolute",inset:0,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:100}}>{LE[video?.lift_type]||"🏋️"}</div>}
      {paused&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:5,pointerEvents:"none"}}><div style={{width:70,height:70,borderRadius:"50%",background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>⏸</div></div>}
      <div style={{position:"absolute",top:0,left:0,right:0,height:"30%",background:"linear-gradient(to bottom,rgba(0,0,0,.7),transparent)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:"65%",background:"linear-gradient(to top,rgba(0,0,0,.95) 0%,rgba(0,0,0,.3) 60%,transparent)",pointerEvents:"none"}}/>
      {showReactions&&(
        <div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:10,bottom:200,zIndex:20,display:"flex",flexDirection:"column",gap:8,background:"rgba(14,12,11,0.95)",borderRadius:20,padding:"10px 8px",border:`1px solid rgba(200,164,90,0.25)`}}>
          {REACTIONS.map(e=>(
            <div key={e} onClick={()=>react(e)} style={{width:44,height:44,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,cursor:"pointer",background:myReaction===e?"rgba(200,164,90,0.3)":"transparent",border:myReaction===e?`1px solid ${GOLD}`:"1px solid transparent"}}>{e}</div>
          ))}
        </div>
      )}
      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:12,bottom:100,zIndex:10,display:"flex",flexDirection:"column",gap:18,alignItems:"center"}}>
        <div onClick={()=>{haptic();setShowReactions(s=>!s);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer"}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:myReaction?"rgba(200,164,90,0.3)":"rgba(255,255,255,0.12)",border:`1px solid ${myReaction?GOLD:"rgba(255,255,255,0.15)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{myReaction||"💪"}</div>
          <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.9)"}}>{fmt(reactionCount)}</div>
        </div>
        <div onClick={()=>{haptic();onComment();}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer"}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>💬</div>
          <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.9)"}}>{fmt(video?.comment_count)}</div>
        </div>
        <div onClick={save} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer"}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:saved?"rgba(200,164,90,0.3)":"rgba(255,255,255,0.12)",border:`1px solid ${saved?GOLD:"rgba(255,255,255,0.15)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🔖</div>
          <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.9)"}}>Save</div>
        </div>
      </div>
      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",bottom:76,left:14,right:76,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <Avatar user={{id:video?.user_id,username:video?.username,avatar_url:video?.avatar_url}} size={42} style={{border:`2px solid ${GOLD}`}} onClick={()=>onProfile(video?.user_id)}/>
          <div>
            <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:4}}>{video?.username}{video?.is_pro?<ProBadge/>:""}</div>
            <div style={{fontSize:11,color:GOLD2,fontWeight:500}}>{video?.gym_name||"RepRoom"}</div>
          </div>
        </div>
        {video?.lift_type&&<div style={{display:"inline-flex",alignItems:"center",gap:5,background:"rgba(200,164,90,0.18)",border:"1px solid rgba(200,164,90,0.35)",borderRadius:20,padding:"4px 10px",fontSize:11,fontWeight:700,color:GOLD2,marginBottom:8}}>{LE[video.lift_type]} {video.lift_type}{video.weight_lbs?` · ${video.weight_lbs}lbs`:""}</div>}
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,lineHeight:1.25,marginBottom:4,textShadow:"0 2px 10px rgba(0,0,0,.9)"}}>{video?.title}</div>
        {video?.tags&&<div style={{fontSize:11,color:GOLD2,opacity:.8}}>{video.tags}</div>}
      </div>
      {isCurrent&&!paused&&<div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",zIndex:10,opacity:.35,pointerEvents:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><div style={{width:14,height:9,borderLeft:"2px solid #fff",borderTop:"2px solid #fff",transform:"rotate(135deg)"}}/><div style={{fontSize:9,color:"#fff",letterSpacing:1}}>SWIPE</div></div>}
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
      <div style={{position:"absolute",bottom:open?0:"-100%",left:0,right:0,height:"72%",background:BK2,borderTop:`1px solid rgba(200,164,90,0.2)`,borderRadius:"22px 22px 0 0",zIndex:50,transition:"bottom .3s cubic-bezier(.32,0,.67,0)",display:"flex",flexDirection:"column"}}>
        <div style={{width:38,height:4,background:"#282420",borderRadius:2,margin:"14px auto 0",flexShrink:0}}/>
        <div style={{padding:"10px 18px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700}}>{comments.length} Comments</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:MUTED,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div className="scr" style={{padding:"14px 18px"}}>
          {comments.length===0&&<div style={{textAlign:"center",color:MUTED,fontSize:13,paddingTop:20}}>No comments yet. Be first!</div>}
          {comments.map(c=>(
            <div key={c.id} style={{display:"flex",gap:10,marginBottom:18}}>
              <Avatar user={{id:c.user_id,username:c.username,avatar_url:c.avatar_url}} size={34}/>
              <div><div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{c.username||"?"}</div><div style={{fontSize:13,color:"#c8bfb0",lineHeight:1.45}}>{c.text}</div><div style={{fontSize:10,color:MUTED,marginTop:4}}>{ago(c.created_at)}</div></div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,padding:"12px 14px",borderTop:"1px solid rgba(255,255,255,0.05)",flexShrink:0}}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Add a comment..." style={{flex:1,background:BK3,border:`1px solid rgba(200,164,90,0.2)`,color:"#f2ece0",borderRadius:22,padding:"10px 16px",fontSize:13,outline:"none"}}/>
          <button onClick={send} style={{width:40,height:40,background:GOLD,border:"none",borderRadius:"50%",color:"#000",fontSize:18,cursor:"pointer",fontWeight:900,flexShrink:0}}>↑</button>
        </div>
      </div>
    </>
  );
}

// ── FEED ──────────────────────────────────────────────────────────────────────
function FeedPage({onProfile,toast}){
  const [videos,setVideos]=useState([]);const [cur,setCur]=useState(0);
  const [feedTab,setFeedTab]=useState("foryou");const [commentVid,setCommentVid]=useState(null);
  const [loading,setLoading]=useState(true);
  const stackRef=useRef(null);const touchY=useRef(0);
  useEffect(()=>{setLoading(true);api("GET",`/api/videos${feedTab==="following"?"?feed=following":""}`).then(r=>{setVideos(r.videos||[]);setCur(0);setLoading(false);});},[feedTab]);
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
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative",background:"#060505",minHeight:0}}>
      <div style={{position:"absolute",top:0,left:0,right:0,zIndex:20,paddingTop:"calc(env(safe-area-inset-top,0px) + 14px)",paddingLeft:20,paddingRight:20,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,background:`linear-gradient(135deg,${GOLD2},${GOLD})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>RepRoom</div>
        <div style={{display:"flex",gap:18}}>
          {["foryou","following"].map(t=>(
            <div key={t} onClick={()=>{setFeedTab(t);haptic();}} style={{fontSize:13,fontWeight:600,color:feedTab===t?"#f2ece0":MUTED,cursor:"pointer",paddingBottom:2,borderBottom:feedTab===t?`1.5px solid ${GOLD}`:"1.5px solid transparent"}}>{t==="foryou"?"For You":"Following"}</div>
          ))}
        </div>
        <div style={{width:22}}/>
      </div>
      <div ref={stackRef} style={{position:"absolute",inset:0,overflow:"hidden"}}>
        {loading&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><div style={{fontSize:56}}>🏋️</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:GOLD}}>Loading...</div></div>}
        {!loading&&videos.length===0&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,padding:32,textAlign:"center"}}><div style={{fontSize:60}}>🏋️</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:24}}>No videos yet</div><div style={{fontSize:14,color:MUTED,lineHeight:1.6}}>Be the first to post a lift and claim #1.</div></div>}
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
function SearchPage({onProfile,toast}){
  const [q,setQ]=useState("");
  const [results,setResults]=useState({users:[],gyms:[]});
  const [loading,setLoading]=useState(false);
  useEffect(()=>{
    if(!q.trim()){setResults({users:[],gyms:[]});return;}
    const t=setTimeout(()=>{setLoading(true);api("GET",`/api/search?q=${encodeURIComponent(q)}`).then(r=>{setResults(r);setLoading(false);});},300);
    return()=>clearTimeout(t);
  },[q]);
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#060505",minHeight:0}}>
      <div style={{paddingTop:"calc(env(safe-area-inset-top,0px) + 20px)",paddingBottom:14,paddingLeft:18,paddingRight:18,flexShrink:0}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:900,marginBottom:14}}>Search</div>
        <div style={{position:"relative"}}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Find athletes, gyms..." style={{...iSt({paddingLeft:40})}}/>
          <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16,color:MUTED}}>🔍</span>
          {q&&<span onClick={()=>setQ("")} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:16,color:MUTED,cursor:"pointer"}}>✕</span>}
        </div>
      </div>
      <div className="scr" style={{padding:"0 18px"}}>
        {!q&&(
          <div style={{textAlign:"center",padding:"60px 20px",color:MUTED}}>
            <div style={{fontSize:48,marginBottom:12}}>🔍</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,marginBottom:8}}>Find Your Competition</div>
            <div style={{fontSize:13,lineHeight:1.6}}>Search for athletes by username or find gyms to join.</div>
          </div>
        )}
        {loading&&<div style={{textAlign:"center",padding:32,color:MUTED}}>Searching...</div>}
        {!loading&&q&&results.users.length===0&&results.gyms.length===0&&<div style={{textAlign:"center",padding:32,color:MUTED,fontSize:13}}>No results for "{q}"</div>}
        {results.users.length>0&&(
          <>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:MUTED,marginBottom:10,marginTop:4}}>Athletes</div>
            {results.users.map(u=>(
              <div key={u.id} onClick={()=>{onProfile(u.id);haptic();}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer"}}>
                <Avatar user={u} size={46}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:4}}>{u.username}{u.is_pro?<ProBadge/>:""}</div>
                  <div style={{fontSize:12,color:MUTED}}>{u.gym_name||"No gym"}{u.gender&&u.gender!=="other"?` · ${u.gender==="male"?"♂":"♀"} ${u.gender}`:""}</div>
                </div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:GOLD,fontWeight:900}}>{u.points}<span style={{fontSize:10,color:MUTED,marginLeft:3}}>pts</span></div>
              </div>
            ))}
          </>
        )}
        {results.gyms.length>0&&(
          <>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:MUTED,marginBottom:10,marginTop:16}}>Gyms</div>
            {results.gyms.map(g=>(
              <div key={g.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:14,background:BK2,border:"1px solid rgba(255,255,255,0.04)",marginBottom:8}}>
                <div style={{width:44,height:44,borderRadius:12,background:"rgba(200,164,90,0.1)",border:`1px solid rgba(200,164,90,0.2)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🏛</div>
                <div>
                  <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:6}}>{g.name}{g.verified?<span style={{color:GOLD,fontSize:13}}>✓</span>:""}{g.partner?<span style={{background:"rgba(200,164,90,0.15)",color:GOLD2,fontSize:9,padding:"2px 6px",borderRadius:4,fontWeight:700}}>PARTNER</span>:""}</div>
                  <div style={{fontSize:12,color:MUTED}}>{g.city}{g.state?`, ${g.state}`:""}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── TRENDING ──────────────────────────────────────────────────────────────────
function TrendingPage({onProfile}){
  const [videos,setVideos]=useState([]);const [loading,setLoading]=useState(true);
  useEffect(()=>{api("GET","/api/videos/trending").then(r=>{setVideos(r.videos||[]);setLoading(false);});},[]);
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#060505",minHeight:0}}>
      <div style={{paddingTop:"calc(env(safe-area-inset-top,0px) + 20px)",paddingBottom:14,paddingLeft:18,paddingRight:18,borderBottom:"1px solid rgba(255,255,255,0.05)",flexShrink:0}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:GOLD,marginBottom:4}}>🔥 This Month</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:900}}>Trending</div>
      </div>
      <div className="scr">
        {loading&&[1,2,3,4].map(i=><div key={i} style={{display:"flex",gap:12,padding:"14px 18px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><div style={{width:32,height:32,background:BK3,borderRadius:4}}/><div style={{flex:1}}><div style={{height:14,background:BK3,borderRadius:4,marginBottom:8,width:"70%"}}/><div style={{height:12,background:BK3,borderRadius:4,width:"40%"}}/></div></div>)}
        {videos.map((v,i)=>(
          <div key={v.id} onClick={()=>{onProfile(v.user_id);haptic();}} style={{display:"flex",gap:12,padding:"14px 18px",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer"}} onTouchStart={e=>e.currentTarget.style.background=BK2} onTouchEnd={e=>e.currentTarget.style.background="transparent"}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:900,color:i<3?GOLD:"#3a332c",width:30,flexShrink:0,lineHeight:1}}>{i+1}</div>
            <div style={{width:72,height:96,borderRadius:10,flexShrink:0,overflow:"hidden",background:BG[v.id%BG.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>
              {v.url?<video src={API+v.url} style={{width:"100%",height:"100%",objectFit:"cover"}} muted playsInline/>:<span>{LE[v.lift_type]||"🏋️"}</span>}
            </div>
            <div style={{flex:1}}>
              {v.lift_type&&<div style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(200,164,90,0.1)",border:"1px solid rgba(200,164,90,0.2)",borderRadius:20,padding:"3px 8px",fontSize:10,fontWeight:700,color:GOLD2,marginBottom:6}}>{LE[v.lift_type]} {v.lift_type}{v.weight_lbs?` · ${v.weight_lbs}lbs`:""}</div>}
              <div style={{fontWeight:700,fontSize:14,marginBottom:6,lineHeight:1.3}}>{v.title}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><Avatar user={{id:v.user_id,username:v.username,avatar_url:v.avatar_url}} size={18}/><span style={{fontSize:12,color:"#c8bfb0"}}>{v.username}{v.is_pro?<ProBadge/>:""}</span></div>
              <div style={{display:"flex",gap:12}}>
                <span style={{fontSize:11,color:i<3?GOLD:MUTED,fontWeight:600}}>💬 {fmt(v.comment_count)}</span>
                <span style={{fontSize:11,color:MUTED,fontWeight:600}}>💪 {fmt(v.reaction_count)}</span>
                <span style={{fontSize:11,color:MUTED,fontWeight:600}}>👁 {fmt(v.view_count)}</span>
              </div>
            </div>
          </div>
        ))}
        {!loading&&videos.length===0&&<div style={{textAlign:"center",padding:40,color:MUTED,fontSize:14}}>No videos this month yet.</div>}
      </div>
    </div>
  );
}

// ── PR PROGRESS CHART ─────────────────────────────────────────────────────────
function PRChart({history,lift}){
  const data=history.filter(h=>h.lift_type===lift).sort((a,b)=>new Date(a.set_at)-new Date(b.set_at));
  if(data.length<2) return <div style={{textAlign:"center",padding:"20px 0",color:MUTED,fontSize:12}}>Post more {lift} videos to see progress</div>;
  const max=Math.max(...data.map(d=>d.weight_lbs));
  const min=Math.min(...data.map(d=>d.weight_lbs));
  const range=max-min||1;
  const W=300,H=80,pad=8;
  const pts=data.map((d,i)=>({
    x:pad+(i/(data.length-1))*(W-pad*2),
    y:H-pad-(d.weight_lbs-min)/range*(H-pad*2),
    w:d.weight_lbs,
    date:d.set_at
  }));
  const pathD=pts.map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" ");
  return(
    <div style={{background:BK3,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
      <div style={{fontSize:11,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>{LE[lift]} {lift} Progress</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
        <defs>
          <linearGradient id={`grad_${lift.replace(" ","_")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={GOLD} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={`${pathD} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`} fill={`url(#grad_${lift.replace(" ","_")})`}/>
        <path d={pathD} stroke={GOLD} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="3" fill={GOLD}/>)}
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
        <span style={{fontSize:10,color:MUTED}}>{data[0].weight_lbs}lbs</span>
        <span style={{fontSize:11,fontWeight:800,color:GOLD2}}>PR: {max}lbs ↑</span>
      </div>
    </div>
  );
}

// ── HALL OF FAME ──────────────────────────────────────────────────────────────
function HallOfFame({onProfile,onClose}){
  const [winners,setWinners]=useState([]);
  useEffect(()=>{api("GET","/api/halloffame").then(r=>setWinners(r.winners||[]));},[]);
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(8px)"}}>
      <div style={{background:BK2,border:"1px solid rgba(200,164,90,0.3)",borderRadius:"24px 24px 0 0",padding:"28px 24px 48px",width:"100%",maxWidth:430,maxHeight:"80vh",display:"flex",flexDirection:"column"}}>
        <div style={{width:38,height:4,background:"#282420",borderRadius:2,margin:"0 auto 20px",flexShrink:0}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:900,marginBottom:4,flexShrink:0}}>🏆 Hall of Fame</div>
        <div style={{fontSize:13,color:MUTED,marginBottom:20,flexShrink:0}}>Monthly kings & queens of RepRoom</div>
        <div className="scr">
          {winners.length===0&&<div style={{textAlign:"center",color:MUTED,padding:32}}>No winners yet — end of month crowns the king!</div>}
          {winners.map((w,i)=>(
            <div key={w.id} onClick={()=>{onProfile(w.user_id);onClose();haptic();}} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",cursor:"pointer"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900,color:i===0?GOLD:"#3a332c",width:36,textAlign:"center",flexShrink:0}}>{i===0?"👑":`#${i+1}`}</div>
              <Avatar user={{id:w.user_id,username:w.username,avatar_url:w.avatar_url}} size={50} style={{border:`2px solid ${i===0?GOLD:"rgba(255,255,255,0.1)"}`}}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15}}>{w.username}</div>
                <div style={{fontSize:12,color:MUTED,marginTop:2}}>{monthName(w.month)}</div>
                <div style={{fontSize:11,color:MUTED}}>{w.gym_name||"RepRoom"}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:GOLD}}>{w.points}</div>
                <div style={{fontSize:9,color:MUTED,textTransform:"uppercase"}}>pts</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CHALLENGE MODAL ───────────────────────────────────────────────────────────
function ChallengeModal({target,myPts,onClose,onSent}){
  const [lift,setLift]=useState("Deadlift");const [dur,setDur]=useState(7);
  const [busy,setBusy]=useState(false);const [err,setErr]=useState("");
  const send=async()=>{setBusy(true);setErr("");hapticH();const r=await api("POST","/api/challenges",{opponent_id:target.id,lift_type:lift,duration_days:dur});setBusy(false);if(r.error){setErr(r.error);return;}onSent();};
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(8px)"}}>
      <div style={{background:BK2,border:"1px solid rgba(200,164,90,0.3)",borderRadius:"24px 24px 0 0",padding:"28px 24px 48px",width:"100%",maxWidth:430}}>
        <div style={{width:38,height:4,background:"#282420",borderRadius:2,margin:"0 auto 20px"}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900,textAlign:"center",marginBottom:4}}>Issue a Challenge</div>
        <div style={{textAlign:"center",color:MUTED,fontSize:13,marginBottom:20}}>You vs {target.username} · highest weight wins 50 pts.</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:20,marginBottom:20}}>
          <div style={{textAlign:"center"}}><Avatar user={{id:0,username:"You"}} size={48} style={{margin:"0 auto 6px"}}/><div style={{fontSize:12,fontWeight:700}}>You</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:GOLD}}>{myPts}pts</div></div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:MUTED}}>VS</div>
          <div style={{textAlign:"center"}}><Avatar user={target} size={48} style={{margin:"0 auto 6px"}}/><div style={{fontSize:12,fontWeight:700}}>{target.username}</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:GOLD}}>{target.pts||0}pts</div></div>
        </div>
        <div style={{marginBottom:14}}>{lbl("Pick the Lift")}<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{LIFTS.map(l=><div key={l} onClick={()=>{setLift(l);haptic();}} style={{padding:"8px 12px",borderRadius:20,border:`1px solid ${lift===l?GOLD:"rgba(255,255,255,0.1)"}`,fontSize:12,fontWeight:700,color:lift===l?GOLD:MUTED,cursor:"pointer",background:lift===l?"rgba(200,164,90,0.1)":"transparent"}}>{LE[l]} {l}</div>)}</div></div>
        <div style={{marginBottom:16}}>{lbl("Duration")}<div style={{display:"flex",gap:8}}>{[3,7,14].map(d=><div key={d} onClick={()=>{setDur(d);haptic();}} style={{flex:1,textAlign:"center",padding:10,border:`1px solid ${dur===d?GOLD:"rgba(255,255,255,0.08)"}`,borderRadius:12,fontSize:13,fontWeight:700,color:dur===d?GOLD:MUTED,cursor:"pointer",background:dur===d?"rgba(200,164,90,0.1)":"transparent"}}>{d===3?"3 Days":d===7?"1 Week":"2 Wks"}</div>)}</div></div>
        <div style={{background:"rgba(200,164,90,0.07)",border:"1px solid rgba(200,164,90,0.18)",borderRadius:12,padding:"12px 16px",textAlign:"center",marginBottom:16}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:GOLD2}}>25 pts each → 50 pt pot</div>
          <div style={{fontSize:11,color:MUTED,marginTop:2}}>Winner takes all</div>
        </div>
        {err&&<div style={{color:"#b83232",fontSize:13,marginBottom:12,textAlign:"center"}}>{err}</div>}
        <GBtn onClick={send} disabled={busy}>{busy?"Sending...":"⚔ Send Challenge"}</GBtn>
        <div onClick={onClose} style={{textAlign:"center",marginTop:14,fontSize:13,color:MUTED,cursor:"pointer"}}>Cancel</div>
      </div>
    </div>
  );
}

// ── RANKS ─────────────────────────────────────────────────────────────────────
function RanksPage({myUser,toast}){
  const [period,setPeriod]=useState("month");
  const [gender,setGender]=useState("all");
  const [mode,setMode]=useState("points");
  const [lb,setLb]=useState([]);
  const [battle,setBattle]=useState(null);
  const [meta,setMeta]=useState({});
  const [target,setTarget]=useState(null);
  const [loading,setLoading]=useState(true);
  const [showHOF,setShowHOF]=useState(false);
  useEffect(()=>{
    setLoading(true);
    const liftParam=mode==="points"?"all":mode;
    Promise.all([api("GET",`/api/leaderboard?period=${period}&gender=${gender}&lift=${liftParam}`),api("GET","/api/gyms/battle")]).then(([l,b])=>{setLb(l.leaderboard||[]);setMeta(l);setBattle(b);setLoading(false);});
  },[period,gender,mode]);
  const king=lb[0];const modeIsLift=mode!=="points";
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#060505",minHeight:0}}>
      <div className="scr">
        <div style={{paddingTop:"calc(env(safe-area-inset-top,0px) + 20px)",paddingBottom:10,paddingLeft:16,paddingRight:16}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <div>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:GOLD,marginBottom:2}}>⚔ Compete</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:900}}>The Rankings</div>
            </div>
            <div onClick={()=>setShowHOF(true)} style={{background:"rgba(200,164,90,0.1)",border:`1px solid rgba(200,164,90,0.25)`,borderRadius:12,padding:"8px 12px",cursor:"pointer",textAlign:"center"}}>
              <div style={{fontSize:18}}>🏆</div>
              <div style={{fontSize:9,fontWeight:700,color:GOLD,letterSpacing:.5,textTransform:"uppercase"}}>Hall of Fame</div>
            </div>
          </div>
          {!modeIsLift&&<div style={{fontSize:11,color:MUTED}}>Resets in {meta.resets_in_days||"?"} days · Points from comments &amp; reactions</div>}
          {modeIsLift&&<div style={{fontSize:11,color:MUTED}}>Top {mode} PRs all time</div>}
        </div>
        {king&&!modeIsLift&&(
          <div style={{margin:"0 16px 14px",borderRadius:18,padding:20,background:"linear-gradient(135deg,#110d00,#1e1800,#110d00)",border:"1px solid rgba(200,164,90,0.4)",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-60,right:-60,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(200,164,90,0.1),transparent 70%)"}}/>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:GOLD,marginBottom:12}}>👑 King of the Month</div>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <Avatar user={king} size={58} style={{border:`2px solid ${GOLD}`}}/>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,display:"flex",alignItems:"center",gap:4}}>{king.username}{king.is_pro?<ProBadge/>:""}</div>
                <div style={{fontSize:11,color:GOLD2,marginBottom:4}}>{king.gym_name||"RepRoom"}</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:900,color:GOLD2,lineHeight:1}}>{king.pts}</div>
                <div style={{fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:1}}>pts this month</div>
              </div>
              {king.id!==myUser?.id&&<button onClick={()=>{setTarget({...king});haptic();}} style={{background:`linear-gradient(135deg,${GOLD},${GOLD2})`,color:"#000",border:"none",borderRadius:12,padding:"10px 14px",fontSize:12,fontWeight:900,cursor:"pointer"}}>⚔ Challenge</button>}
            </div>
          </div>
        )}
        {battle?.gyms?.length>=2&&!modeIsLift&&(
          <div style={{margin:"0 16px 14px",padding:16,borderRadius:16,background:BK2,border:"1px solid rgba(255,255,255,0.05)"}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:MUTED,marginBottom:12}}>🏛 Gym Battle</div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:GOLD,marginBottom:3}}>{battle.gyms[0].name}</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900,color:GOLD}}>{battle.gyms[0].pts}</div></div>
              <div style={{width:30,height:30,borderRadius:"50%",background:BK3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:MUTED,flexShrink:0}}>VS</div>
              <div style={{flex:1,textAlign:"right"}}><div style={{fontSize:13,fontWeight:700,marginBottom:3}}>{battle.gyms[1]?.name}</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900,color:MUTED}}>{battle.gyms[1]?.pts}</div></div>
            </div>
            <div style={{height:3,background:"#1f1c1a",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:`linear-gradient(90deg,${GOLD},${GOLD2})`,width:`${Math.round(battle.gyms[0].pts/Math.max(battle.gyms[0].pts+(battle.gyms[1]?.pts||0),1)*100)}%`}}/></div>
          </div>
        )}
        <div style={{display:"flex",gap:6,padding:"0 16px 10px",overflowX:"auto"}}>
          {[["all","Everyone"],["male","♂ Male"],["female","♀ Female"],["other","⚡ Other"]].map(([v,l])=>(
            <div key={v} onClick={()=>{setGender(v);haptic();}} style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:700,border:`1px solid ${gender===v?"rgba(200,164,90,0.35)":"rgba(255,255,255,0.08)"}`,color:gender===v?GOLD:MUTED,cursor:"pointer",background:gender===v?"rgba(200,164,90,0.08)":"transparent",whiteSpace:"nowrap",flexShrink:0}}>{l}</div>
          ))}
        </div>
        <div style={{display:"flex",gap:6,padding:"0 16px 14px",overflowX:"auto"}}>
          {[["points","🏆 Points"],["Deadlift","🏋️ Deadlift"],["Squat","🦵 Squat"],["Bench Press","💪 Bench"],["Overhead Press","🙌 OHP"],["Other","🔥 Other"]].map(([v,l])=>(
            <div key={v} onClick={()=>{setMode(v);haptic();}} style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:700,border:`1px solid ${mode===v?"rgba(200,164,90,0.35)":"rgba(255,255,255,0.08)"}`,color:mode===v?GOLD:MUTED,cursor:"pointer",background:mode===v?"rgba(200,164,90,0.08)":"transparent",whiteSpace:"nowrap",flexShrink:0}}>{l}</div>
          ))}
        </div>
        {!modeIsLift&&(
          <div style={{display:"flex",gap:6,padding:"0 16px 14px"}}>
            {[["month","This Month"],["alltime","All Time"]].map(([v,l])=>(
              <div key={v} onClick={()=>{setPeriod(v);haptic();}} style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:700,border:`1px solid ${period===v?"rgba(200,164,90,0.35)":"rgba(255,255,255,0.08)"}`,color:period===v?GOLD:MUTED,cursor:"pointer",background:period===v?"rgba(200,164,90,0.08)":"transparent"}}>{l}</div>
            ))}
          </div>
        )}
        <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:6,paddingBottom:24}}>
          {loading&&[1,2,3,4,5].map(i=><div key={i} style={{height:62,borderRadius:14,background:BK2}}/>)}
          {lb.map((row,i)=>{
            const isMe=row.id===myUser?.id;
            return(
              <div key={row.user_id||row.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:isMe?"rgba(200,164,90,0.08)":BK2,border:`1px solid ${isMe?"rgba(200,164,90,0.28)":"rgba(255,255,255,0.04)"}`,borderRadius:14}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:900,width:28,textAlign:"center",flexShrink:0,color:i<3?GOLD:MUTED}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</div>
                <Avatar user={row} size={38}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                    {row.username}
                    {row.is_pro?<ProBadge/>:""}
                    {isMe&&<span style={{background:GOLD,color:"#000",fontSize:9,fontWeight:900,padding:"1px 6px",borderRadius:6}}>YOU</span>}
                    {i===0&&!modeIsLift&&<span style={{fontSize:14}}>👑</span>}
                  </div>
                  <div style={{fontSize:11,color:MUTED}}>{modeIsLift?`${row.gym_name||"—"}`:`${row.video_count||0} videos · ${row.gym_name||"No gym"}`}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:modeIsLift?20:22,fontWeight:900,color:GOLD}}>{modeIsLift?`${row.pts}lbs`:row.pts}</div>
                  {modeIsLift&&<div style={{fontSize:9,color:MUTED,textTransform:"uppercase"}}>PR</div>}
                </div>
                {!isMe&&!modeIsLift&&<button onClick={()=>{setTarget({...row});haptic();}} style={{background:"none",border:`1px solid rgba(200,164,90,0.3)`,color:GOLD,borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:800,cursor:"pointer"}}>⚔</button>}
              </div>
            );
          })}
          {!loading&&lb.length===0&&<div style={{textAlign:"center",padding:32,color:MUTED,fontSize:13}}>{modeIsLift?`No ${mode} PRs posted yet.`:"No one on the board yet. Post a lift!"}</div>}
        </div>
      </div>
      {target&&<ChallengeModal target={target} myPts={myUser?.points||0} onClose={()=>setTarget(null)} onSent={()=>{setTarget(null);toast("Challenge sent ⚔");hapticH();}}/>}
      {showHOF&&<HallOfFame onProfile={()=>{}} onClose={()=>setShowHOF(false)}/>}
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
    if(!file){setErr("Choose a video first");return;}if(!form.title.trim()){setErr("Add a caption");return;}
    setBusy(true);setErr("");haptic();
    const fd=new FormData();fd.append("video",file);fd.append("title",form.title);fd.append("lift_type",form.lift_type);fd.append("weight_lbs",form.weight_lbs);fd.append("tags",form.tags);
    const r=await fetch(`${API}/api/videos`,{method:"POST",headers:authHdr(),body:fd}).then(x=>x.json()).catch(()=>({error:"Upload failed"}));
    setBusy(false);if(r.error){setErr(r.error);return;}hapticH();toast("Posted! 🔥");onDone();
  };
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#060505",minHeight:0}}>
      <div className="scr" style={{paddingTop:"calc(env(safe-area-inset-top,0px) + 24px)",paddingLeft:18,paddingRight:18,paddingBottom:48}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:GOLD,marginBottom:6}}>Post Your Lift</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:900,marginBottom:20}}>New Video</div>
        <div onClick={()=>fileRef.current.click()} style={{borderRadius:18,marginBottom:22,cursor:"pointer",overflow:"hidden",minHeight:160,background:"rgba(200,164,90,0.05)",border:`1px dashed ${file?GOLD:"rgba(200,164,90,0.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
          {preview?<video src={preview} style={{width:"100%",maxHeight:280,objectFit:"cover"}} muted playsInline autoPlay loop/>:<div style={{textAlign:"center",padding:28}}><div style={{fontSize:44,marginBottom:10}}>🎬</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:900,marginBottom:4}}>Drop your clip</div><div style={{fontSize:12,color:MUTED,marginBottom:14}}>MP4 or MOV · max 500MB</div><div style={{background:GOLD,color:"#000",borderRadius:12,padding:"10px 22px",fontSize:13,fontWeight:800,display:"inline-block"}}>Choose Video</div></div>}
          {preview&&<div style={{position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,.7)",borderRadius:8,padding:"4px 10px",fontSize:11,color:"#fff",fontWeight:700}}>Tap to change</div>}
        </div>
        <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={pick}/>
        <div style={{marginBottom:14}}>{lbl("Lift Type")}<select value={form.lift_type} onChange={e=>setForm({...form,lift_type:e.target.value})} style={{...iSt()}}>{LIFTS.map(l=><option key={l}>{l}</option>)}</select></div>
        <div style={{marginBottom:14}}>{lbl("Weight (lbs)")}<input value={form.weight_lbs} onChange={e=>setForm({...form,weight_lbs:e.target.value})} placeholder="470" type="number" style={{...iSt()}}/></div>
        <div style={{marginBottom:14}}>{lbl("Caption")}<textarea value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="6 months of work. Finally." style={{...iSt({resize:"none",minHeight:72})}}/></div>
        <div style={{marginBottom:20}}>{lbl("Tags")}<input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="#deadlift #portchester #pr" style={{...iSt()}}/></div>
        <div style={{background:"rgba(200,164,90,0.07)",border:"1px solid rgba(200,164,90,0.18)",borderRadius:12,padding:"12px 14px",marginBottom:20,fontSize:12,color:"#c8bfb0",lineHeight:1.5}}>✦ <strong style={{color:GOLD}}>Points come from engagement.</strong> Every comment = +2 pts. Every 5 reactions = +1 pt.</div>
        {err&&<div style={{color:"#b83232",fontSize:13,marginBottom:12}}>{err}</div>}
        <GBtn onClick={submit} disabled={busy}>{busy?"Uploading... 📤":"🚀 Post to RepRoom"}</GBtn>
      </div>
    </div>
  );
}

// ── NOTIFICATIONS PANEL ───────────────────────────────────────────────────────
function NotifPanel({onClose,onProfile}){
  const [notifs,setNotifs]=useState([]);
  useEffect(()=>{api("GET","/api/notifications").then(r=>setNotifs(r.notifications||[]));},[]);
  const icons={comment:"💬",reaction:"💪",follow:"👤",challenge:"⚔",challenge_accepted:"✅",challenge_result:"🏆"};
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(8px)"}}>
      <div style={{background:BK2,border:"1px solid rgba(200,164,90,0.3)",borderRadius:"24px 24px 0 0",padding:"28px 24px 48px",width:"100%",maxWidth:430,maxHeight:"80vh",display:"flex",flexDirection:"column"}}>
        <div style={{width:38,height:4,background:"#282420",borderRadius:2,margin:"0 auto 20px",flexShrink:0}}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexShrink:0}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900}}>Notifications</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:MUTED,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div className="scr">
          {notifs.length===0&&<div style={{textAlign:"center",color:MUTED,padding:32,fontSize:13}}>No notifications yet.</div>}
          {notifs.map(n=>(
            <div key={n.id} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(200,164,90,0.1)",border:`1px solid rgba(200,164,90,0.2)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{icons[n.type]||"🔔"}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{n.title}</div>
                <div style={{fontSize:12,color:"#c8bfb0",lineHeight:1.4}}>{n.body}</div>
                <div style={{fontSize:10,color:MUTED,marginTop:4}}>{ago(n.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
function ProfilePage({userId,myUser,onBack,toast,onLogout,onUserUpdate,onOpenVideo}){
  const [data,setData]=useState(null);
  const [tab,setTab]=useState("videos");
  const [following,setFollowing]=useState(false);
  const [saves,setSaves]=useState([]);
  const [challenges,setChallenges]=useState([]);
  const [editing,setEditing]=useState(false);
  const [ef,setEf]=useState({username:"",bio:"",gender:"other"});
  const [eBusy,setEBusy]=useState(false);const [eErr,setEErr]=useState("");
  const [showNotifs,setShowNotifs]=useState(false);
  const [claimBusy,setClaimBusy]=useState(false);
  const avatarRef=useRef();
  const isMe=userId===myUser?.id;

  const load=useCallback(()=>{
    if(!userId)return;
    api("GET",`/api/users/${userId}`).then(r=>{
      setData(r);
      if(r.user) setEf({username:r.user.username||"",bio:r.user.bio||"",gender:r.user.gender||"other"});
      if(r.isFollowing!==undefined) setFollowing(r.isFollowing);
    });
    if(isMe){api("GET","/api/saves").then(r=>setSaves(r.videos||[]));api("GET","/api/challenges").then(r=>setChallenges(r.challenges||[]));}
  },[userId,isMe]);
  useEffect(()=>load(),[load]);

  const follow=async()=>{haptic();const r=await api("POST",`/api/users/${userId}/follow`);if(!r.error)setFollowing(r.following);};

  const uploadAvatar=async(e)=>{
    const file=e.target.files[0];if(!file)return;
    haptic();
    const fd=new FormData();fd.append("avatar",file);
    const r=await fetch(`${API}/api/auth/avatar`,{method:"POST",headers:authHdr(),body:fd}).then(x=>x.json()).catch(()=>({error:"Upload failed"}));
    if(r.error){toast("Avatar upload failed");return;}
    await load();if(onUserUpdate)onUserUpdate(r.user);toast("Photo updated ✓");
  };

  const saveProfile=async()=>{
    setEBusy(true);setEErr("");haptic();
    const body={bio:ef.bio,gender:ef.gender};
    if(ef.username.trim()) body.username=ef.username.trim();
    const r=await api("PUT","/api/auth/me",body);
    setEBusy(false);
    if(r.error){setEErr(r.error||"Save failed");return;}
    await load();if(onUserUpdate)onUserUpdate(r.user);setEditing(false);toast("Profile updated ✓");
  };

  const claimGym=async()=>{
    if(!data?.gym)return;
    setClaimBusy(true);haptic();
    const r=await api("POST",`/api/gyms/${data.gym.id}/claim`);
    setClaimBusy(false);
    if(r.error){toast(r.error);return;}
    toast("Gym claimed! 🏆 Pro badge earned!");await load();if(onUserUpdate)onUserUpdate({...myUser,is_pro:1});
  };

  if(!data) return <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:MUTED}}>Loading...</div>;
  const {user,videos,pbs,prHistory}=data;
  const displayVideos=tab==="saved"&&isMe?saves:videos;
  const pendingCount=challenges.filter(c=>c.status==="pending"&&c.opponent_id===myUser?.id).length;
  const liftTypes=[...new Set((prHistory||[]).map(h=>h.lift_type))];

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#060505",minHeight:0}}>
      {onBack&&<div onClick={onBack} style={{paddingTop:"calc(env(safe-area-inset-top,0px) + 14px)",paddingLeft:18,paddingBottom:0,flexShrink:0,cursor:"pointer",color:GOLD,fontSize:13,fontWeight:700}}>← Back</div>}
      <div className="scr">
        {/* Banner */}
        <div style={{height:130,position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#0e0900,#1c1400,#0a0800)",flexShrink:0}}>
          <div style={{position:"absolute",inset:0,opacity:.1,backgroundImage:"repeating-linear-gradient(45deg,#c8a45a 0,#c8a45a 1px,transparent 0,transparent 50%)",backgroundSize:"18px 18px"}}/>
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:"60%",background:"linear-gradient(to bottom,transparent,#060505)"}}/>
        </div>
        <div style={{padding:"0 16px 32px"}}>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginTop:-36,marginBottom:14,position:"relative",zIndex:2}}>
            {/* Tappable avatar with camera overlay */}
            <div style={{position:"relative",cursor:isMe?"pointer":"default"}} onClick={isMe?()=>avatarRef.current.click():undefined}>
              <Avatar user={user} size={76} style={{border:"3px solid #060505",boxShadow:"0 4px 20px rgba(200,164,90,0.3)"}}/>
              {isMe&&<div style={{position:"absolute",bottom:0,right:0,width:24,height:24,borderRadius:"50%",background:GOLD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,border:"2px solid #060505"}}>📷</div>}
              {isMe&&<input ref={avatarRef} type="file" accept="image/*" style={{display:"none"}} onChange={uploadAvatar}/>}
            </div>
            <div style={{display:"flex",gap:8,marginBottom:2}}>
              {isMe?(
                <>
                  <button onClick={()=>setShowNotifs(true)} style={{background:"transparent",border:`1px solid rgba(200,164,90,0.2)`,color:MUTED,borderRadius:10,padding:"8px 10px",fontSize:14,cursor:"pointer"}}>🔔</button>
                  <button onClick={()=>{setEditing(true);haptic();}} style={{background:"transparent",border:`1px solid rgba(200,164,90,0.35)`,color:GOLD,borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>{localStorage.clear();onLogout();}} style={{background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:MUTED,borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Out</button>
                </>
              ):(
                <button onClick={follow} style={{background:following?"transparent":GOLD,color:following?GOLD:"#000",border:following?`1px solid ${GOLD}`:"none",borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:800,cursor:"pointer"}}>{following?"Following":"Follow"}</button>
              )}
            </div>
          </div>

          <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900,marginBottom:2,display:"flex",alignItems:"center",gap:6}}>
            {user.username}{user.is_pro?<ProBadge/>:""}
          </div>
          <div style={{color:MUTED,fontSize:12,marginBottom:user.bio?8:12}}>
            @{user.username.toLowerCase()}{user.gender&&user.gender!=="other"?` · ${user.gender==="male"?"♂":"♀"} ${user.gender}`:""}
            {data.gym&&<span> · {data.gym.name}{data.gym.verified?" ✓":""}</span>}
          </div>
          {user.bio&&<div style={{fontSize:13,color:"#c8bfb0",lineHeight:1.55,marginBottom:14}}>{user.bio}</div>}

          {/* Stats */}
          <div style={{display:"flex",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,overflow:"hidden",marginBottom:16}}>
            {[{val:user.points,lbl:"Points",gold:true},{val:`#${user.monthly_rank||"—"}`,lbl:"Rank"},{val:videos.length,lbl:"Videos"}].map((s,i,arr)=>(
              <div key={i} style={{flex:1,padding:"12px 4px",textAlign:"center",background:BK2,borderRight:i<arr.length-1?"1px solid rgba(255,255,255,0.06)":"none"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,fontWeight:900,lineHeight:1,marginBottom:3,color:s.gold?GOLD:"#f2ece0"}}>{s.val}</div>
                <div style={{fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:.7,fontWeight:700}}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* Gym claim button */}
          {isMe&&data.gym&&!data.gym.claimed_by&&!user.is_pro&&(
            <div style={{background:"rgba(200,164,90,0.07)",border:"1px solid rgba(200,164,90,0.2)",borderRadius:14,padding:"12px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>🏛 Claim {data.gym.name}</div>
                <div style={{fontSize:11,color:MUTED}}>Verify your gym & earn a Pro badge</div>
              </div>
              <button onClick={claimGym} disabled={claimBusy} style={{background:GOLD,color:"#000",border:"none",borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:800,cursor:"pointer"}}>{claimBusy?"...":"Claim"}</button>
            </div>
          )}

          {/* Personal Bests */}
          {pbs?.length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:900,marginBottom:10}}>Personal Bests</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {pbs.map(pb=>(
                  <div key={pb.id} style={{background:BK2,border:"1px solid rgba(255,255,255,0.05)",borderRadius:14,padding:14}}>
                    <div style={{fontSize:10,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:.8,marginBottom:4}}>{pb.lift_type}</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:900,color:GOLD2,lineHeight:1}}>{pb.weight_lbs}<span style={{fontSize:12,color:MUTED,marginLeft:3}}>lbs</span></div>
                    <div style={{fontSize:10,color:MUTED,marginTop:4}}>{new Date(pb.set_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PR Progress Charts */}
          {prHistory?.length>=2&&liftTypes.length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:900,marginBottom:10}}>Progress 📈</div>
              {liftTypes.map(lift=><PRChart key={lift} history={prHistory} lift={lift}/>)}
            </div>
          )}

          {/* Tabs */}
          <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.06)",marginBottom:14}}>
            {(isMe?["videos","challenges","saved"]:["videos"]).map(t=>(
              <div key={t} onClick={()=>setTab(t)} style={{flex:1,textAlign:"center",padding:"10px 4px",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:.7,color:tab===t?GOLD:MUTED,cursor:"pointer",borderBottom:tab===t?`2px solid ${GOLD}`:"2px solid transparent",marginBottom:-1,position:"relative"}}>
                {t}
                {t==="challenges"&&pendingCount>0&&<span style={{position:"absolute",top:6,right:"25%",width:7,height:7,borderRadius:"50%",background:"#e84040",border:"1.5px solid #060505",display:"inline-block"}}/>}
              </div>
            ))}
          </div>

          {/* Video grid — tappable to open in feed viewer */}
          {tab!=="challenges"&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2}}>
              {displayVideos.map((v,idx)=>(
                <div key={v.id} onClick={()=>onOpenVideo&&onOpenVideo(displayVideos,idx)} style={{aspectRatio:"9/16",position:"relative",overflow:"hidden",background:BG[v.id%BG.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,cursor:"pointer"}}>
                  {v.url?<video src={API+v.url} style={{width:"100%",height:"100%",objectFit:"cover"}} muted playsInline/>:<span>{LE[v.lift_type]||"🏋️"}</span>}
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.75) 0%,transparent 50%)"}}/>
                  <div style={{position:"absolute",bottom:4,left:5,fontSize:10,fontWeight:800,color:"#fff"}}>💬 {fmt(v.comment_count)}</div>
                  {v.weight_lbs&&<div style={{position:"absolute",top:4,left:5,fontSize:9,fontWeight:800,color:GOLD2}}>{v.weight_lbs}lbs</div>}
                </div>
              ))}
              {displayVideos.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:28,color:MUTED,fontSize:13}}>{tab==="saved"?"No saved videos.":"No videos yet. Post your first lift!"}</div>}
            </div>
          )}

          {/* Challenges */}
          {tab==="challenges"&&isMe&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {challenges.length===0&&<div style={{textAlign:"center",color:MUTED,fontSize:13,padding:28}}>No challenges yet. Go challenge someone on the Ranks page!</div>}
              {challenges.map(ch=>{
                const isChal=ch.challenger_id===myUser?.id;
                const oppName=isChal?ch.opp_name:ch.chal_name;
                const sc={pending:MUTED,active:GOLD,complete:"#2a7a4a",declined:"#b83232",tie:"#c8bfb0"}[ch.status]||MUTED;
                return(
                  <div key={ch.id} style={{background:BK2,border:"1px solid rgba(255,255,255,0.05)",borderRadius:14,padding:"14px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                      <div style={{fontWeight:700,fontSize:14}}>vs {oppName}</div>
                      <div style={{fontSize:11,fontWeight:700,color:sc,textTransform:"uppercase",letterSpacing:.5}}>{ch.status}</div>
                    </div>
                    <div style={{fontSize:12,color:MUTED}}>{LE[ch.lift_type]} {ch.lift_type} · {ch.duration_days} days · {ch.pot_pts}pt pot</div>
                    {ch.status==="pending"&&!isChal&&(
                      <div style={{display:"flex",gap:8,marginTop:10}}>
                        <button onClick={async()=>{hapticH();await api("POST",`/api/challenges/${ch.id}/accept`);load();}} style={{flex:1,background:GOLD,color:"#000",border:"none",borderRadius:8,padding:"8px",fontSize:12,fontWeight:800,cursor:"pointer"}}>Accept ⚔</button>
                        <button onClick={async()=>{await api("POST",`/api/challenges/${ch.id}/decline`);load();}} style={{flex:1,background:"transparent",color:"#b83232",border:"1px solid #b83232",borderRadius:8,padding:"8px",fontSize:12,fontWeight:800,cursor:"pointer"}}>Decline</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editing&&(
        <div onClick={e=>e.target===e.currentTarget&&setEditing(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(8px)"}}>
          <div style={{background:BK2,border:"1px solid rgba(200,164,90,0.3)",borderRadius:"24px 24px 0 0",padding:"28px 24px 48px",width:"100%",maxWidth:430}}>
            <div style={{width:38,height:4,background:"#282420",borderRadius:2,margin:"0 auto 20px"}}/>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900,marginBottom:20}}>Edit Profile</div>
            {lbl("Username")}<input value={ef.username} onChange={e=>setEf({...ef,username:e.target.value})} style={{...iSt({marginBottom:14})}}/>
            {lbl("Bio")}<textarea value={ef.bio} onChange={e=>setEf({...ef,bio:e.target.value})} placeholder="Tell the gym who you are..." style={{...iSt({resize:"none",minHeight:72,marginBottom:14})}}/>
            {lbl("Gender Category")}
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              {[["male","♂ Male"],["female","♀ Female"],["other","⚡ Other"]].map(([v,l])=>(
                <div key={v} onClick={()=>{setEf({...ef,gender:v});haptic();}} style={{flex:1,textAlign:"center",padding:"10px 6px",borderRadius:12,border:`1px solid ${ef.gender===v?GOLD:"rgba(255,255,255,0.08)"}`,background:ef.gender===v?"rgba(200,164,90,0.1)":BK3,cursor:"pointer",fontSize:12,fontWeight:700,color:ef.gender===v?GOLD2:MUTED}}>{l}</div>
              ))}
            </div>
            {eErr&&<div style={{color:"#b83232",fontSize:13,marginBottom:12}}>{eErr}</div>}
            <GBtn onClick={saveProfile} disabled={eBusy}>{eBusy?"Saving...":"Save Changes"}</GBtn>
            <div onClick={()=>setEditing(false)} style={{textAlign:"center",marginTop:14,fontSize:13,color:MUTED,cursor:"pointer"}}>Cancel</div>
          </div>
        </div>
      )}

      {showNotifs&&<NotifPanel onClose={()=>setShowNotifs(false)} onProfile={()=>{}}/>}
    </div>
  );
}

// ── VIDEO VIEWER (profile grid tap) ───────────────────────────────────────────
function VideoViewer({videos,startIdx,onClose,onProfile,toast}){
  const [cur,setCur]=useState(startIdx||0);
  const [commentVid,setCommentVid]=useState(null);
  const touchY=useRef(0);
  const stackRef=useRef(null);
  const go=useCallback(dir=>{haptic();setCur(c=>Math.max(0,Math.min(videos.length-1,c+dir)));},[videos.length]);
  useEffect(()=>{
    const el=stackRef.current;if(!el)return;
    const ts=e=>{touchY.current=e.touches[0].clientY;};
    const te=e=>{const dy=touchY.current-e.changedTouches[0].clientY;if(dy>50)go(1);else if(dy<-50)go(-1);};
    el.addEventListener("touchstart",ts,{passive:true});el.addEventListener("touchend",te,{passive:true});
    return()=>{el.removeEventListener("touchstart",ts);el.removeEventListener("touchend",te);};
  },[go]);
  return(
    <div style={{position:"fixed",inset:0,background:"#060505",zIndex:300,display:"flex",flexDirection:"column"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,zIndex:20,paddingTop:"calc(env(safe-area-inset-top,0px) + 14px)",paddingLeft:16,paddingRight:16}}>
        <button onClick={onClose} style={{background:"rgba(0,0,0,.5)",border:"none",color:"#fff",fontSize:16,padding:"8px 14px",borderRadius:20,cursor:"pointer",fontWeight:700}}>✕ Close</button>
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
  const [tab,setTab]=useState("feed");
  const [viewingUser,setViewingUser]=useState(null);
  const [toast,setToast]=useState("");
  const [pendingChallenges,setPendingChallenges]=useState(0);
  const [unreadNotifs,setUnreadNotifs]=useState(0);
  const [videoViewer,setVideoViewer]=useState(null); // {videos,startIdx}

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
    const checkNotifs=()=>api("GET","/api/notifications/unread").then(r=>setUnreadNotifs(r.count||0));
    check();checkNotifs();
    const iv=setInterval(()=>{check();checkNotifs();},60000);
    return()=>clearInterval(iv);
  },[authed,user?.id]);

  const onAuth=u=>{setUser(u);setAuthed(true);};
  const onOnboarded=()=>{localStorage.setItem("rr_onboarded","1");setOnboarded(true);};
  const onLogout=()=>{localStorage.clear();setUser(null);setAuthed(false);setOnboarded(false);};

  if(!authed) return <AuthScreen onAuth={onAuth}/>;
  if(!onboarded) return <Onboarding onDone={onOnboarded}/>;

  const renderPage=()=>{
    if(viewingUser!=null) return <ProfilePage userId={viewingUser} myUser={user} onBack={()=>setViewingUser(null)} toast={t=>setToast(t)} onLogout={onLogout} onUserUpdate={u=>setUser(u)} onOpenVideo={(vids,idx)=>setVideoViewer({videos:vids,startIdx:idx})}/>;
    switch(tab){
      case "feed":    return <FeedPage onProfile={id=>setViewingUser(id)} toast={t=>setToast(t)}/>;
      case "search":  return <SearchPage onProfile={id=>setViewingUser(id)} toast={t=>setToast(t)}/>;
      case "ranks":   return <RanksPage myUser={user} toast={t=>setToast(t)}/>;
      case "upload":  return <UploadPage onDone={()=>setTab("feed")} toast={t=>setToast(t)}/>;
      case "profile": return <ProfilePage userId={user?.id} myUser={user} toast={t=>setToast(t)} onLogout={onLogout} onUserUpdate={u=>setUser(u)} onOpenVideo={(vids,idx)=>setVideoViewer({videos:vids,startIdx:idx})}/>;
      default: return null;
    }
  };

  return(
    <div style={{display:"flex",flexDirection:"column",width:"100%",height:"100dvh",maxWidth:430,margin:"0 auto",background:"#060505",overflow:"hidden",position:"relative"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,overflow:"hidden"}}>{renderPage()}</div>
      {viewingUser==null&&<BottomNav tab={tab} setTab={t=>{setTab(t);setViewingUser(null);}} pendingChallenges={pendingChallenges} unreadNotifs={unreadNotifs}/>}
      {toast&&<Toast msg={toast} onDone={()=>setToast("")}/>}
      {videoViewer&&<VideoViewer videos={videoViewer.videos} startIdx={videoViewer.startIdx} onClose={()=>setVideoViewer(null)} onProfile={id=>setViewingUser(id)} toast={t=>setToast(t)}/>}
    </div>
  );
}
