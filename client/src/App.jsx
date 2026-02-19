import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "";

// --- token helpers ---
function getToken() {
  return localStorage.getItem("token");
}
function setToken(t) {
  localStorage.setItem("token", t);
}
function clearToken() {
  localStorage.removeItem("token");
}

// --- API helper ---
async function api(path, { method = "GET", body, auth = false } = {}) {
  try {
    const headers = {};
    let payload = undefined;

    // If body exists, choose JSON vs FormData
    if (body !== undefined && body !== null) {
      if (body instanceof FormData) {
        payload = body; // don't set Content-Type manually
      } else {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
      }
    }

    // Add auth header if needed
    if (auth) {
      const t = getToken();
      if (t) headers["Authorization"] = `Bearer ${t}`;
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

export default function App() {
  const [page, setPage] = useState("auth"); // "auth" or "home"
  const [mode, setMode] = useState("login"); // "login" or "register"

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [authMsg, setAuthMsg] = useState("");
  const [me, setMe] = useState(null);

  // --- boot ---
  useEffect(() => {
console.log("App.jsx loaded ✅ v999");
    const t = getToken();
    if (t) {
      setPage("home");
      refreshAll();
    } else {
      setPage("auth");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshMe() {
    // If your backend has /api/me, this will work.
    // If not, you can delete refreshMe/refreshAll/me UI.
const r = await api("/api/auth/me", { auth: true });
    if (r.ok) setMe(r.data);
    return r;
  }

  async function refreshAll() {
    await refreshMe();
  }

  // --- AUTH (ONLY ONE doAuth) ---
  async function doAuth(e) {
    console.log("doAuth fired ✅");
    e.preventDefault();
    setAuthMsg("");

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

    const r = await api(endpoint, {
      method: "POST",
      body: { username: username.trim(), password },
    });

    console.log("AUTH endpoint:", endpoint);
    console.log("AUTH response:", r);

    if (!r.ok) {
      setAuthMsg(
        `Failed (${r.status}): ` +
          (r.data?.error ||
            r.data?.message ||
            r.data?.raw ||
            JSON.stringify(r.data))
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
    setPage("auth");
    setAuthMsg("");
  }

  // --- UI ---
  if (page === "auth") {
    return (
      <div style={{ maxWidth: 520, margin: "60px auto", fontFamily: "Arial" }}>
        <h1 style={{ marginBottom: 18 }}>
          {mode === "login" ? "Login" : "Register"}
        </h1>

        {/* mode switch buttons - NOT submit buttons */}
        <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => setMode("login")}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              opacity: mode === "login" ? 1 : 0.65,
            }}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => setMode("register")}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              opacity: mode === "register" ? 1 : 0.65,
            }}
          >
            Register
          </button>
        </div>

        {/* THE FORM */}
        <form
          onSubmit={doAuth}
          style={{
            display: "grid",
            gap: 14,
            padding: 18,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <input
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            style={{ padding: 12, borderRadius: 12 }}
          />

          <input
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            style={{ padding: 12, borderRadius: 12 }}
          />

          {/* ONLY ONE submit button */}
         <button
  type="submit"
  onClick={() => console.log("LOGIN BUTTON CLICKED ✅")}
  style={{
    padding: 14,
    borderRadius: 14,
    fontSize: 18,
    cursor: "pointer",
  }}
>
  {mode === "login" ? "Login" : "Create Account"}
</button>


          {authMsg && (
            <div style={{ marginTop: 6, color: "#ff6b6b" }}>{authMsg}</div>
          )}
        </form>
      </div>
    );
  }

// home page
return (
  <div style={{ maxWidth: 800, margin: "60px auto", fontFamily: "Arial" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h2>Home – Welcome, {me?.user?.username || "User"}!</h2>
      <button
        onClick={logout}
        style={{ padding: "8px 16px", background: "#e74c3c", color: "white", border: "none", borderRadius: 8 }}
      >
        Logout
      </button>
    </div>

    <div style={{ marginTop: 20, padding: 16, background: "#1e1e1e", borderRadius: 12 }}>
      <h3>Your Profile</h3>
      <pre style={{ background: "#2d2d2d", padding: 12, borderRadius: 8, overflow: "auto" }}>
        {JSON.stringify(me, null, 2)}
      </pre>
      <p>Points: <strong>{me?.user?.points || 0}</strong> | Rank: <strong>{me?.user?.rank || "Unknown"}</strong></p>
    </div>

    {/* ──────────────────────────────────────────────── */}
    {/*               VIDEO UPLOAD FORM                  */}
    {/* ──────────────────────────────────────────────── */}
    <div style={{ marginTop: 40 }}>
      <h3>Upload a Video</h3>
      
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          
          const r = await api("/api/videos", {
            method: "POST",
            body: formData,
            auth: true
          });
          console.log("Upload response:", r);
          if (r.ok) {
            alert("Video uploaded successfully!");
            refreshAll();
            e.target.reset();
          } else {
            alert("Upload failed: " + (r.data?.error || r.data?.message || "Unknown error " + r.status));
          }
        }}
        style={{ display: "grid", gap: 16, maxWidth: 500, marginTop: 16 }}
      >
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>Video Title</label>
          <input
            type="text"
            name="title"
            placeholder="My awesome video"
            required
            style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #444" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>Choose Video File</label>
          <input
            type="file"
            name="video"
            accept="video/*"
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: 14,
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            cursor: "pointer"
          }}
        >
          Upload Video
        </button>
      </form>
    </div>

    <button
      style={{ marginTop: 32, padding: 10, background: "#3498db", color: "white", border: "none", borderRadius: 8 }}
      onClick={refreshAll}
    >
      Refresh Profile
    </button>
  </div>
);
}
console.log("API base:", API);
<div style={{ marginTop: 40 }}>
  <h3>Upload a Video</h3>
  
  <form 
    onSubmit={async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const r = await api("/api/videos", {  // <-- change to your actual upload endpoint
        method: "POST",
        body: formData,
        auth: true
      });
      if (r.ok) {
        alert("Video uploaded!");
        // optional: refresh video list or points
        refreshAll();
      } else {
        alert("Upload failed: " + (r.data?.error || "Unknown error"));
      }
    }}
    style={{ display: "grid", gap: 12, maxWidth: 400 }}
  >
    <input 
      type="text" 
      name="title" 
      placeholder="Video title" 
      required 
      style={{ padding: 10, borderRadius: 8 }}
    />
    
    <input 
      type="file" 
      name="video" 
      accept="video/*" 
      required 
      style={{ padding: 10 }}
    />
    
    <button 
      type="submit" 
      style={{ padding: 12, background: "#4CAF50", color: "white", border: "none", borderRadius: 8 }}
    >
      Upload Video
    </button>
  </form>
</div>