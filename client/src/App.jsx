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
  }

if (auth) {
  const t = getToken();
  console.log("AUTH HEADER TOKEN LEN:", (t || "").length);
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
        border: "1px solid #333",
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
    <div style={{ aspectRatio: "16/9", background: "#000" }}>
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

async function doAuth(e) {
  e.preventDefault();
  setAuthMsg("");

  const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
  const r = await api(endpoint, {
    method: "POST",
    body: { username, password },
  });

  if (!r.ok) {
    setAuthMsg(r.data?.error || "Auth failed");
    return;
  }
  setToken(r.data.token);

  setUsername("");
  setPassword("");
  setPage("home");

  await refreshMe();
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

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        height: "100vh",
        background: "#0f0f0f",
        color: "#fff",
      }}
    >
      {/* Sidebar */}
      <aside style={{ padding: 16, borderRight: "1px solid #222" }}>
        <h2 style={{ marginTop: 0 }}>GymTube</h2>

        {/* Me card */}
        <div
          style={{
            border: "1px solid #222",
            borderRadius: 14,
            padding: 12,
            marginBottom: 12,
            background: "#111",
          }}
        >
          {!me ? (
            <div style={{ color: "#aaa" }}>Not logged in</div>
          ) : (
            <>
              <div style={{ fontWeight: 800 }}>
                {me.username}
                <RankPill rank={me.rank} />
              </div>
              <div style={{ color: "#aaa", fontSize: 13, marginTop: 6 }}>
                Points: <b style={{ color: "#fff" }}>{me.points}</b>
              </div>
            </>
          )}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <button onClick={() => { setPage("home"); refreshVideos(); }}>Home</button>
          <button onClick={() => setPage("upload")}>Upload</button>
          <button onClick={() => { setPage("leaderboard"); loadLeaderboard(); }}>
            Leaderboard
          </button>

          {!me ? (
            <button onClick={() => setPage("auth")}>Login / Register</button>
          ) : (
            <button onClick={logout}>Logout</button>
          )}
        </div>

        <div style={{ marginTop: 14, color: "#aaa", fontSize: 12, lineHeight: 1.4 }}>
          Rank is based on points.
          <br />
          Uploading gives +10 points.
        </div>
      </aside>

      {/* Main */}
      <main style={{ padding: 20, overflow: "auto" }}>
        {page === "home" && (
          <>
            <h2 style={{ marginTop: 0 }}>Videos</h2>

            {ordered.length === 0 ? (
              <div style={{ color: "#aaa" }}>No videos yet.</div>
            ) : (
              ordered.map((v) => (
                <div
                  key={v.id}
                  onClick={() => { setPlaying(v.id); setPage("watch"); }}
                  style={{
                    marginBottom: 18,
                    cursor: "pointer",
                    border: "1px solid #222",
                    borderRadius: 12,
                    overflow: "hidden",
                    maxWidth: 900,
                  }}
                >
                  <VideoThumb id={v.id} />
                  <div style={{ padding: 10 }}>
                    <b>{v.title}</b>
                    <div style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>
                      <span style={{ fontWeight: 700, color: "#fff" }}>
                        {v.username || "unknown"}
                      </span>
                      <RankPill rank={v.rank} />
                      <span style={{ marginLeft: 8 }}>{timeAgo(v.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {page === "leaderboard" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>Leaderboard</h2>
              <button onClick={loadLeaderboard}>Refresh</button>
            </div>

            <div style={{ color: "#aaa", marginTop: 8 }}>
              Top 25 users by points.
            </div>

            <div style={{ marginTop: 14, maxWidth: 700 }}>
              {leaders.length === 0 ? (
                <div style={{ color: "#aaa" }}>
                  Nothing yet. Upload videos to earn points.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {leaders.map((u) => (
                    <div
                      key={u.id}
                      style={{
                        border: "1px solid #222",
                        borderRadius: 14,
                        padding: 12,
                        background: "#111",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800 }}>
                          #{u.place} {u.username}
                          <RankPill rank={u.rank} />
                        </div>
                        <div style={{ color: "#aaa", fontSize: 13, marginTop: 4 }}>
                          Points: <b style={{ color: "#fff" }}>{u.points}</b>
                        </div>
                      </div>

                      {me?.id === u.id && (
                        <div style={{ color: "#aaa", fontSize: 12 }}>You</div>
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

            <form onSubmit={uploadVideo} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
              <input
                placeholder="Video title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: "#121212",
                  color: "#fff",
                  border: "1px solid #333",
                }}
              />

              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ color: "#aaa" }}
              />

              <button type="submit">Upload</button>
            </form>

            {uploadMsg && <div style={{ marginTop: 10, color: "#aaa" }}>{uploadMsg}</div>}
            {!me && <div style={{ marginTop: 10, color: "#aaa" }}>Login required to upload.</div>}
          </>
        )}

        {page === "auth" && (
          <>
            <h2 style={{ marginTop: 0 }}>{mode === "login" ? "Login" : "Create Account"}</h2>

            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <button onClick={() => setMode("login")}>Login</button>
              <button onClick={() => setMode("register")}>Register</button>
            </div>

            <form onSubmit={doAuth} style={{ display: "grid", gap: 10, maxWidth: 420 }}>
              <input
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: "#121212",
                  color: "#fff",
                  border: "1px solid #333",
                }}
              />
              <input
                placeholder="password (6+ chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: "#121212",
                  color: "#fff",
                  border: "1px solid #333",
                }}
              />
              <button type="submit">{mode === "login" ? "Login" : "Create Account"}</button>
            </form>

            {authMsg && <div style={{ marginTop: 10, color: "#ffb4b4" }}>{authMsg}</div>}
          </>
        )}

        {page === "watch" && playing && (
          <>
            <button onClick={() => setPage("home")}>Back</button>
            <video
              controls
              autoPlay
              playsInline
              src={`${API}/api/stream/${playing}`}
              style={{ width: "100%", maxWidth: 1000, marginTop: 12, background: "#000" }}
            />
          </>
        )}
      </main>
    </div>
  );
}
