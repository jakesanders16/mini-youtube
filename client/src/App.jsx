import { useEffect, useMemo, useRef, useState } from "react";

const API = "https://mini-youtube-api-rgd4.onrender.com";

// ---- token helpers ----
function getToken() {
  return localStorage.getItem("token");
}
function setToken(t) {
  localStorage.setItem("token", t);
}
function clearToken() {
  localStorage.removeItem("token");
}

async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  let payload = body;

  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }async function api(path, { method = "GET", body, auth = false } = {}) {
  try {
    const headers = {};
    let payload = body;

    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    if (auth) {
      const t = getToken();
      headers["Authorization"] = `Bearer ${t || ""}`;
    }

    const r = await fetch(`${API}${path}`, { method, headers, body: payload });

    const text = await r.text();

    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text ? { raw: text } : null;
    }

    return { ok: r.ok, status: r.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: { error: "Network error", detail: String(err) },
    };
  }
}


  if (auth) {
    const t = getToken();
    headers["Authorization"] = `Bearer ${t || ""}`;
  }

  const r = await fetch(`${API}${path}`, { method, headers, body: payload });
  const text = await r.text();
  return { ok: r.ok, status: r.status, data: text ? JSON.parse(text) : null };
}

function timeAgo(iso) {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

function RankPill({ rank }) {
  const r = rank || "Rookie";
  const bg =
    r === "Legend"
      ? "#3b1d5a"
      : r === "Elite"
      ? "#1d3557"
      : r === "Beast"
      ? "#1b4332"
      : r === "Grinder"
      ? "#4a3f1a"
      : "#2a2a2a";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.18)",
        background: bg,
        color: "#fff",
        fontSize: 12,
        marginLeft: 8,
      }}
    >
      {r}
    </span>
  );
}

// “thumbnail” preview
function VideoThumb({ id }) {
  const ref = useRef(null);
  const src = `${API}/api/stream/${id}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onLoaded = () => {
      try {
        el.currentTime = 1;
        el.pause();
      } catch {}
    };
    el.addEventListener("loadedmetadata", onLoaded);
    return () => el.removeEventListener("loadedmetadata", onLoaded);
  }, [id]);

  return (
    <div
      style={{
        aspectRatio: "16/9",
        background: "#000",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <video
        ref={ref}
        src={src}
        muted
        playsInline
        preload="metadata"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home"); // home | watch | upload | auth | leaderboard
  const [videos, setVideos] = useState([]);
  const [playing, setPlaying] = useState(null);

  const [me, setMe] = useState(null);

  // leaderboard
  const [leaders, setLeaders] = useState([]);

  // upload
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [uploadMsg, setUploadMsg] = useState("");

  // auth
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMsg, setAuthMsg] = useState("");

  async function refreshVideos() {
    const v = await api("/api/videos");
    if (v.ok) setVideos(v.data || []);
  }

  async function refreshMe() {
    if (!getToken()) return setMe(null);
    const m = await api("/api/auth/me", { auth: true });
    if (m.ok) setMe(m.data.user);
    else setMe(null);
  }

  async function loadLeaderboard() {
    const r = await api("/api/leaderboard");
    if (r.ok) setLeaders(r.data || []);
  }

  async function refreshAll() {
    await Promise.all([refreshVideos(), refreshMe()]);
  }

  useEffect(() => {
    refreshAll();
  }, []);
console.log("App.jsx loaded ✅");
 async function doAuth(e) {
  e.preventDefault();
  setAuthMsg("");

  const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

  const r = await api(endpoint, {
    method: "POST",
    body: { username: username.trim(), password },
  });

  // SHOW EVERYTHING so we can fix it
  console.log("AUTH endpoint:", endpoint);
  console.log("AUTH response:", r);

  if (!r.ok) {
    setAuthMsg(
      `Failed (${r.status}): ` +
        (r.data?.error || r.data?.message || r.data?.raw || JSON.stringify(r.data))
    );
    return;
  }

  if (!r.data?.token) {
    setAuthMsg(`No token returned: ${JSON.stringify(r.data)}`);
    return;
  }

  setToken(r.data.token);
  setUsername("");
  setPassword("");
  setPage("home");
  await refreshAll();
}


  function logout() {
    clearToken();
    setMe(null);
    setPage("home");
  }

  async function uploadVideo(e) {
    e.preventDefault();
    setUploadMsg("");

    if (!me) {
      setPage("auth");
      return;
    }
    if (!title.trim() || !file) {
      setUploadMsg("Add title + pick a video");
      return;
    }

    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("video", file);

    const r = await api("/api/upload", { method: "POST", body: fd, auth: true });
    if (!r.ok) return setUploadMsg(r.data?.error || "Upload failed");

    setTitle("");
    setFile(null);
    setUploadMsg("Uploaded ✅ (+10 points)");
    setPage("home");
    await refreshAll();
  }

  const ordered = useMemo(() => videos, [videos]);

  const shell = {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "260px 1fr",
  };

  const asideStyle = {
    padding: 18,
    borderRight: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    backdropFilter: "blur(12px)",
  };

  const mainStyle = {
    padding: 24,
    overflow: "auto",
  };

  const card = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
  };

  return (
    <div style={shell}>
      {/* Sidebar */}
      <aside style={asideStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 900, letterSpacing: 0.2 }}>
          🏋️ GymTube
        </h2>

        {/* Me card */}
        <div style={{ ...card, marginBottom: 14 }}>
          {!me ? (
            <div style={{ color: "var(--muted)" }}>Not logged in</div>
          ) : (
            <>
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                {me.username}
                <RankPill rank={me.rank} />
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
                Points: <b style={{ color: "#fff" }}>{me.points}</b>
              </div>
            </>
          )}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <button
            onClick={() => {
              setPage("home");
              refreshVideos();
            }}
          >
            Home
          </button>
          <button onClick={() => setPage("upload")}>Upload</button>
          <button
            onClick={() => {
              setPage("leaderboard");
              loadLeaderboard();
            }}
          >
            Leaderboard
          </button>

          {!me ? (
            <button onClick={() => setPage("auth")}>Login / Register</button>
          ) : (
            <button onClick={logout}>Logout</button>
          )}
        </div>

        <div style={{ marginTop: 14, color: "var(--muted)", fontSize: 12, lineHeight: 1.4 }}>
          Rank is based on points.
          <br />
          Uploading gives +10 points.
        </div>
      </aside>

      {/* Main */}
      <main style={mainStyle}>
        {page === "home" && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <h2 style={{ marginTop: 0, marginBottom: 10 }}>Videos</h2>
              <button onClick={refreshVideos}>Refresh</button>
            </div>

            {ordered.length === 0 ? (
              <div style={{ color: "var(--muted)" }}>No videos yet — be the first 💪</div>
            ) : (
              <div style={{ display: "grid", gap: 18 }}>
                {ordered.map((v) => (
                  <div
                    key={v.id}
                    style={{ ...card, cursor: "pointer", maxWidth: 900 }}
                    onClick={() => {
                      setPlaying(v.id);
                      setPage("watch");
                    }}
                  >
                    <VideoThumb id={v.id} />
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>{v.title}</div>
                      <div
                        style={{
                          color: "var(--muted)",
                          fontSize: 13,
                          marginTop: 6,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontWeight: 800, color: "#fff" }}>
                          {v.username || "unknown"}
                        </span>
                        <RankPill rank={v.rank} />
                        <span>{timeAgo(v.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {page === "leaderboard" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>Leaderboard</h2>
              <button onClick={loadLeaderboard}>Refresh</button>
            </div>

            <div style={{ color: "var(--muted)", marginTop: 8 }}>
              Top 25 users by points.
            </div>

            <div style={{ marginTop: 14, maxWidth: 720 }}>
              {leaders.length === 0 ? (
                <div style={{ color: "var(--muted)" }}>
                  Nothing yet. Upload videos to earn points.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {leaders.map((u) => (
                    <div
                      key={u.id}
                      style={{
                        ...card,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900 }}>
                          #{u.place} {u.username}
                          <RankPill rank={u.rank} />
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                          Points: <b style={{ color: "#fff" }}>{u.points}</b>
                        </div>
                      </div>

                      {me?.id === u.id && (
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>You</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {page === "upload" && (
          <>
            <h2 style={{ marginTop: 0 }}>Upload</h2>

            <div style={{ ...card, maxWidth: 560 }}>
              <form onSubmit={uploadVideo} style={{ display: "grid", gap: 10 }}>
                <input
                  placeholder="Video title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.25)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.16)",
                  }}
                />

                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{ color: "var(--muted)" }}
                />

                <button type="submit">Upload</button>
              </form>

              {uploadMsg && <div style={{ marginTop: 10, color: "var(--muted)" }}>{uploadMsg}</div>}
              {!me && (
                <div style={{ marginTop: 10, color: "var(--muted)" }}>
                  Login required to upload.
                </div>
              )}
            </div>
          </>
        )}

        {page === "auth" && (
          <>
            <h2 style={{ marginTop: 0 }}>{mode === "login" ? "Login" : "Create Account"}</h2>

            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <button onClick={() => setMode("login")}>Login</button>
              <button onClick={() => setMode("register")}>Register</button>
            </div>

            <div style={{ ...card, maxWidth: 520 }}>
              <form onSubmit={doAuth} style={{ display: "grid", gap: 10 }}>
                <input
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.25)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.16)",
                  }}
                />
                <input
                  placeholder="password (6+ chars)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.25)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.16)",
                  }}
                />
                <button type="submit">{mode === "login" ? "Login" : "Create Account"}</button>
              </form>
<button type="submit">
  {mode === "login" ? "Login" : "Create Account"}
</button>

              {authMsg && <div style={{ marginTop: 10, color: "#ffb4b4" }}>{authMsg}</div>}
            </div>
          </>
        )}

        {page === "watch" && playing && (
          <>
            <button onClick={() => setPage("home")}>← Back</button>

            <div style={{ ...card, marginTop: 16, maxWidth: 1100 }}>
              <video
                controls
                autoPlay
                playsInline
                preload="metadata"
                src={`${API}/api/stream/${playing}`}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  background: "#000",
                }}
              />
            </div>
          </>
        )}
     
      </main>
      {/* Mobile Bottom Navigation */}
<div className="bottom-nav">
  <button
    className={page === "home" ? "active" : ""}
    onClick={() => setPage("home")}
  >
    <span>🏠</span>
    <span>Home</span>
  </button>

  <button
    className={page === "upload" ? "active" : ""}
    onClick={() => setPage("upload")}
  >
    <span>⬆️</span>
    <span>Upload</span>
  </button>

  <button
    className={page === "leaderboard" ? "active" : ""}
    onClick={() => setPage("leaderboard")}
  >
    <span>🏆</span>
    <span>Rank</span>
  </button>

  <button
    className={page === "auth" ? "active" : ""}
    onClick={() => setPage(me ? "home" : "auth")}
  >
    <span>{me ? "👤" : "🔐"}</span>
    <span>{me ? "Me" : "Login"}</span>
  </button>
</div>

    </div>

    
  );
}
