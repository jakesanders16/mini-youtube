import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { IconHome, IconUpload, IconChartBar, IconTrophy } from '@tabler/icons-react';

const API = import.meta.env.VITE_API_URL || "";

// Token helpers
function getToken() {
  return localStorage.getItem("token");
}
function setToken(t) {
  localStorage.setItem("token", t);
}
function clearToken() {
  localStorage.removeItem("token");
}

// API helper
async function api(path, { method = "GET", body, auth = false } = {}) {
  try {
    const headers = {};
    let payload = undefined;

    if (body !== undefined && body !== null) {
      if (body instanceof FormData) {
        payload = body;
      } else {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
      }
    }

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

// Ranks
const RANKS = [
  { name: "Rookie", min: 0, max: 99 },
  { name: "Pro", min: 100, max: 499 },
  { name: "Elite", min: 500, max: 999 },
  { name: "Legend", min: 1000, max: Infinity },
];

// Auth Page
function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMsg, setAuthMsg] = useState("");

  async function doAuth(e) {
    e.preventDefault();
    setAuthMsg("");

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

    const r = await api(endpoint, {
      method: "POST",
      body: { username: username.trim(), password },
    });

    if (!r.ok) {
      setAuthMsg(`Failed (${r.status}): ${r.data?.error || JSON.stringify(r.data)}`);
      return;
    }

    if (!r.data?.token) {
      setAuthMsg("No token returned");
      return;
    }

    setToken(r.data.token);
    navigate("/home");
  }

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 24, background: "#1a1a1a", borderRadius: 16 }}>
      <h1 style={{ textAlign: "center", marginBottom: 24 }}>{mode === "login" ? "Login" : "Register"}</h1>
      
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 24 }}>
        <button 
          onClick={() => setMode("login")} 
          style={{ padding: "10px 20px", background: mode === "login" ? "#00c853" : "#333", color: "white", border: "none", borderRadius: 8 }}
        >
          Login
        </button>
        <button 
          onClick={() => setMode("register")} 
          style={{ padding: "10px 20px", background: mode === "register" ? "#00c853" : "#333", color: "white", border: "none", borderRadius: 8 }}
        >
          Register
        </button>
      </div>

      <form onSubmit={doAuth} style={{ display: "grid", gap: 16 }}>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: 12, borderRadius: 8, background: "#222", color: "white", border: "1px solid #444" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 12, borderRadius: 8, background: "#222", color: "white", border: "1px solid #444" }}
        />
        <button 
          type="submit" 
          style={{ padding: 14, background: "#00c853", color: "white", border: "none", borderRadius: 8, fontWeight: "bold" }}
        >
          {mode === "login" ? "Login" : "Create Account"}
        </button>
      </form>
      
      {authMsg && <p style={{ color: "#ff4444", textAlign: "center", marginTop: 12 }}>{authMsg}</p>}
    </div>
  );
}

// Main Layout
function MainLayout({ children, me, logout }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0f0f0f", color: "white" }}>
      {/* Top Nav */}
      <div style={{ padding: "16px 24px", background: "#1a1a1a", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: 24, color: "#00c853" }}>Gains Arena</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span>Points: {me?.user?.points || 0}</span>
          <button onClick={logout} style={{ padding: "8px 16px", background: "#ff4444", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
        {children}
      </div>

      {/* Bottom Tabs */}
      <div style={{ background: "#1a1a1a", padding: "12px 0", borderTop: "1px solid #333" }}>
        <TabList style={{ display: "flex", justifyContent: "space-around" }}>
          <Tab><IconHome size={24} /> Home</Tab>
          <Tab><IconUpload size={24} /> Upload</Tab>
          <Tab><IconChartBar size={24} /> Progress</Tab>
          <Tab><IconTrophy size={24} /> Leaderboard</Tab>
        </TabList>
      </div>
    </div>
  );
}

// Home Page
function HomePage() {
  return (
    <div>
      <h2>Home Feed</h2>
      <p>Latest workout videos from the community. Like/comment to earn points!</p>
      {/* Add video list here later */}
    </div>
  );
}

// Upload Page
function UploadPage({ me, refreshMe }) {
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    const r = await api("/api/videos", { method: "POST", body: formData, auth: true });
    if (r.ok) {
      alert("Video uploaded successfully!");
      refreshMe();
      e.target.reset();
    } else {
      setError(r.data?.error || "Upload failed");
    }
  }

  return (
    <div>
      <h2>Upload a Video</h2>
      <p>Share your workout and earn points!</p>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, maxWidth: 500 }}>
        <input type="text" name="title" placeholder="Video Title" required style={{ padding: 12, borderRadius: 8, background: "#222", color: "white", border: "1px solid #444" }} />
        <input type="file" name="video" accept="video/*" required style={{ padding: 12 }} />
        <button type="submit" style={{ padding: 14, background: "#00c853", color: "white", border: "none", borderRadius: 8, fontWeight: "bold" }}>
          Upload
        </button>
        {error && <p style={{ color: "#ff4444" }}>{error}</p>}
      </form>
    </div>
  );
}

// Progress Page
function ProgressPage({ me }) {
  const currentRank = RANKS.find(r => me?.user?.points >= r.min && me?.user?.points < r.max) || RANKS[0];
  const nextRank = RANKS[RANKS.indexOf(currentRank) + 1] || currentRank;
  const progressPercent = ((me?.user?.points - currentRank.min) / (currentRank.max - currentRank.min)) * 100 || 0;

  return (
    <div>
      <h2>Progress to Next Rank</h2>
      <p>Current Rank: <strong>{currentRank.name}</strong></p>
      <div style={{ background: "#333", borderRadius: 8, height: 20, overflow: "hidden", margin: "10px 0" }}>
        <div style={{ width: `${progressPercent}%`, background: "#00c853", height: "100%", transition: "width 0.5s" }}></div>
      </div>
      <p>{me?.user?.points || 0} points / {currentRank.max} (Next: {nextRank.name})</p>
      <p>Tip: Upload a PR for +100 points!</p>
    </div>
  );
}

// Leaderboard Page
function LeaderboardPage() {
  return (
    <div>
      <h2>Leaderboard</h2>
      <p>Top gainers coming soon...</p>
    </div>
  );
}

// Main App
export default function App() {
  const [me, setMe] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = getToken();
    if (t) {
      refreshMe().then(() => navigate("/home"));
    } else {
      navigate("/");
    }
  }, []);

  async function refreshMe() {
    const r = await api("/api/auth/me", { auth: true });
    if (r.ok) setMe(r.data);
  }

  function logout() {
    clearToken();
    setMe(null);
    navigate("/");
  }

  if (!getToken()) {
    return <AuthPage />;
  }

  if (!me) {
    return <div style={{ padding: 40, color: "white", textAlign: "center" }}>Loading your gains...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", color: "white" }}>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/home" element={
          <MainLayout me={me} logout={logout}>
            <HomePage />
          </MainLayout>
        } />
        <Route path="/upload" element={
          <MainLayout me={me} logout={logout}>
            <UploadPage me={me} refreshMe={refreshMe} />
          </MainLayout>
        } />
        <Route path="/progress" element={
          <MainLayout me={me} logout={logout}>
            <ProgressPage me={me} />
          </MainLayout>
        } />
        <Route path="/leaderboard" element={
          <MainLayout me={me} logout={logout}>
            <LeaderboardPage />
          </MainLayout>
        } />
      </Routes>
    </div>
  );
}