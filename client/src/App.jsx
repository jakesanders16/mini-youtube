import { useEffect, useState } from "react";
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';  // basic styles, customize later
import { IconHome, IconUpload, IconChartBar, IconTrophy } from '@tabler/icons-react';const API = import.meta.env.VITE_API_URL || "";

function getToken() { /* keep as is */ }
function setToken(t) { /* keep as is */ }
function clearToken() { /* keep as is */ }
import { useNavigate } from "react-router-dom";
async function api(path, { method = "GET", body, auth = false } = {}) { /* keep as is */ }

// Ranks definition (points thresholds)
const RANKS = [
  { name: "Rookie", min: 0, max: 99 },
  { name: "Pro", min: 100, max: 499 },
  { name: "Elite", min: 500, max: 999 },
  { name: "Legend", min: 1000, max: Infinity },
];

// AuthPage component (keep from before, but simplified)
function AuthPage({ onLogin }) {
  /* keep your auth form code here, call onLogin() after successful login */
}

// Main App
export default function App() {
  const [me, setMe] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [prHistory, setPrHistory] = useState([]);  // for auto-PR check

  useEffect(() => {
    const t = getToken();
    if (t) {
      refreshMe();
      fetchPrHistory();
    }
  }, []);

  async function refreshMe() {
    const r = await api("/api/auth/me", { auth: true });
    if (r.ok) setMe(r.data);
  }

  async function fetchPrHistory() {
    const r = await api("/api/my-prs", { auth: true });  // add this endpoint on backend later
    if (r.ok) setPrHistory(r.data || []);
  }

  function logout() {
    clearToken();
    setMe(null);
  }

  function handleLogin() {
    refreshMe();
  }

  if (!getToken()) {
    return <AuthPage onLogin={handleLogin} />;
  }

  // Find current rank and progress
  const currentRank = RANKS.find(r => me.user.points >= r.min && me.user.points < r.max) || RANKS[0];
  const nextRank = RANKS[RANKS.indexOf(currentRank) + 1] || currentRank;
  const progressPercent = ((me.user.points - currentRank.min) / (currentRank.max - currentRank.min)) * 100;

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
      <Tabs selectedIndex={tabIndex} onSelect={(index) => setTabIndex(index)} style={{ flex: 1 }}>
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
          <Tab><IconBarChart /> Progress</Tab>
          <Tab><IconTrophy /> Leaderboard</Tab>
        </TabList>

        {/* Tab Content */}
        <TabPanel>
          <h2>Home Feed</h2>
          <p>Latest workout videos from the community. Like/comment to give points!</p>
          {/* Add video list fetch here, e.g. <VideoFeed /> */}
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

            // Innovative PR check: Compare to history
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
            <select name="liftType" required>
              <option value="">Choose Lift Type</option>
              <option value="bench">Bench Press</option>
              <option value="squat">Squat</option>
              <option value="deadlift">Deadlift</option>
              <option value="other">Other</option>
            </select>
            <input name="weight" type="number" placeholder="Weight (lbs)" required />
            <input name="reps" type="number" placeholder="Reps" required />
            <input name="title" type="text" placeholder="Title" required />
            <input name="video" type="file" accept="video/*" required />
            <button type="submit">Upload PR</button>
          </form>
        </TabPanel>

        <TabPanel>
          <h2>Progress to Next Rank</h2>
          <p>Current Rank: {currentRank.name}</p>
          <div style={{ background: "#333", borderRadius: 8, height: 20, overflow: "hidden" }}>
            <div style={{ width: `${progressPercent}%`, background: "#00c853", height: "100%", transition: "width 0.5s" }}></div>
          </div>
          <p>{me.user.points} / {currentRank.max} points (Next: {nextRank.name})</p>
          <p>Tip: Upload a PR for +100 pts!</p>
        </TabPanel>

        <TabPanel>
          <h2>Leaderboard</h2>
          <p>Top gainers: (Stub: 1. UserY - 1200 pts)</p>
          {/* Fetch /api/leaderboard */}
        </TabPanel>
      </Tabs>
    </div>
  );
}