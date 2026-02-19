import { useState, useEffect } from "react";
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { IconHome, IconUpload, IconChartBar, IconTrophy } from '@tabler/icons-react';
import { useNavigate } from "react-router-dom";

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

// Ranks definition
const RANKS = [
  { name: "Rookie", min: 0, max: 99 },
  { name: "Pro", min: 100, max: 499 },
  { name: "Elite", min: 500, max: 999 },
  { name: "Legend", min: 1000, max: Infinity },
];

// Auth Page
function AuthPage({ onLogin }) {
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
      setAuthMsg(`No token returned`);
      return;
    }

    setToken(r.data.token);
    onLogin();
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

// Main App
export default function App() {
  const [me, setMe] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [prHistory, setPrHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const t = getToken();
    if (t) {
      refreshMe();
      fetchPrHistory();
      navigate("/home");
    }
  }, []);

  async function refreshMe() {
    const r = await api("/api/auth/me", { auth: true });
    if (r.ok) setMe(r.data);
  }

  async function fetchPrHistory() {
    const r = await api("/api/my-prs", { auth: true });
    if (r.ok) setPrHistory(r.data || []);
  }

  function logout() {
    clearToken();
    setMe(null);
    navigate("/");
  }

  function handleLogin() {
    refreshMe();
    navigate("/home");
  }

  if (!getToken()) {
    return <AuthPage onLogin={handleLogin} />;
  }

  if (!me) {
    return <div style={{ padding: 40, color: "white" }}>Loading...</div>;
  }

  const currentRank = RANKS.find(r => me.user.points >= r.min && me.user.points < r.max) || RANKS[0];
  const nextRank = RANKS[RANKS.indexOf(currentRank) + 1] || currentRank;
  const progressPercent = ((me.user.points - currentRank.min) / (currentRank.max - currentRank.min)) * 100 || 0;

  return (
    <div style={{ 
      height: "100vh", 
      background: "linear-gradient(#0f0f0f, #1a1a1a)", 
      color: "white", 
      fontFamily: "Arial, sans-serif",
      padding: "20px 0"
    }}>
      {/* Top Header */}
      <header style={{ textAlign: "center", marginBottom: 30 }}>
        <h1 style={{ fontSize: 36, color: "#00c853" }}>Gains Arena</h1>
        <p>Upload PRs, earn points, dominate the ranks!</p>
      </header>

      {/* Tabs */}
      <Tabs selectedIndex={tabIndex} onSelect={setTabIndex} style={{ flex: 1 }}>
        <TabList style={{ 
          display: "flex", 
          justifyContent: "space-around", 
          background: "#1a1a1a", 
          padding: "10px 0", 
          borderRadius: 16, 
          position: "fixed", 
          bottom: 0, 
          width: "100%" 
        }}>
          <Tab><IconHome /> Home</Tab>
          <Tab><IconUpload /> Upload PR</Tab>
          <Tab><IconChartBar /> Progress</Tab>
          <Tab><IconTrophy /> Leaderboard</Tab>
        </TabList>

        <TabPanel>
          <h2>Home Feed</h2>
          <p>Latest workout videos from the community. Like/comment to give points!</p>
          <div> (Stub: Video 1 - Bench PR by UserX ) </div>
        </TabPanel>

        <TabPanel>
          <h2>Upload PR Video</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const liftType = formData.get("liftType");
            const weight = parseFloat(formData.get("weight"));
            const reps = parseInt(formData.get("reps"));

            const pastPr = prHistory.find(pr => pr.type === liftType);
            const isNewPr = !pastPr || (weight * reps > pastPr.weight * pastPr.reps);
            formData.append("isPr", isNewPr);

            const r = await api("/api/videos", { method: "POST", body: formData, auth: true });
            if (r.ok) {
              alert(`Uploaded! ${isNewPr ? "New PR! +100 pts" : "+50 pts"}`);
              refreshMe();
              fetchPrHistory();
            } else {
              alert("Failed: " + r.data?.error);
            }
          }}>
            <select name="liftType" required style={{ width: "100%", padding: 12, marginBottom: 12 }}>
              <option value="">Choose Lift Type</option>
              <option value="bench">Bench Press</option>
              <option value="squat">Squat</option>
              <option value="deadlift">Deadlift</option>
              <option value="other">Other</option>
            </select>
            <input name="weight" type="number" placeholder="Weight (lbs)" required style={{ width: "100%", padding: 12, marginBottom: 12 }} />
            <input name="reps" type="number" placeholder="Reps" required style={{ width: "100%", padding: 12, marginBottom: 12 }} />
            <input name="title" type="text" placeholder="Title" required style={{ width: "100%", padding: 12, marginBottom: 12 }} />
            <input name="video" type="file" accept="video/*" required style={{ width: "100%", padding: 12, marginBottom: 12 }} />
            <button type="submit" style={{ padding: 14, background: "#00c853", color: "white", border: "none", borderRadius: 8, width: "100%" }}>
              Upload PR
            </button>
          </form>
        </TabPanel>

        <TabPanel>
          <h2>Progress to Next Rank</h2>
          <p>Current Rank: {currentRank.name}</p>
          <div style={{ background: "#333", borderRadius: 8, height: 20, overflow: "hidden", margin: "10px 0" }}>
            <div style={{ width: `${progressPercent}%`, background: "#00c853", height: "100%", transition: "width 0.5s" }}></div>
          </div>
          <p>{me.user.points} / {currentRank.max} points (Next: {nextRank.name})</p>
          <p>Tip: Upload a PR for +100 pts!</p>
        </TabPanel>

        <TabPanel>
          <h2>Leaderboard</h2>
          <p>Top gainers coming soon...</p>
        </TabPanel>
      </Tabs>
    </div>
  );
}