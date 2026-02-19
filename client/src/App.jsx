import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { IconHome, IconUpload, IconChartBar, IconTrophy } from "@tabler/icons-react";

const API = import.meta.env.VITE_API_URL || "";

// ---------- Layout with Tabs ----------
function MainLayout({ children }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#0f0f0f",
        color: "white",
      }}
    >
      {/* Top Nav */}
      <div
        style={{
          padding: "16px 24px",
          background: "#1a1a1a",
          borderBottom: "1px solid #333",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, color: "#00c853" }}>Gains Arena</h1>
        <span style={{ opacity: 0.8, fontSize: 14 }}>
          Home only (auth removed)
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>{children}</div>
    </div>
  );
}

// ---------- Pages ----------
function HomePage() {
  return (
    <div>
      <h2>Home Feed</h2>
      <p>Tabs are live. Login + loading screen are gone.</p>
      <div
        style={{
          marginTop: 14,
          padding: 14,
          borderRadius: 14,
          background: "#151515",
          border: "1px solid #2b2b2b",
        }}
      >
        <strong>Next:</strong> we can hook videos list + upload to the backend once the site is stable.
      </div>
    </div>
  );
}

function UploadPage() {
  return (
    <div>
      <h2>Upload</h2>
      <p>We’ll hook this to the backend next. For now it’s UI only.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          alert("Upload hook comes next.");
        }}
        style={{ display: "grid", gap: 16, maxWidth: 500 }}
      >
        <input
          type="text"
          name="title"
          placeholder="Video Title"
          style={{
            padding: 12,
            borderRadius: 8,
            background: "#222",
            color: "white",
            border: "1px solid #444",
          }}
        />
        <input type="file" name="video" accept="video/*" style={{ padding: 12 }} />
        <button
          type="submit"
          style={{
            padding: 14,
            background: "#00c853",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Upload
        </button>
      </form>
    </div>
  );
}

function ProgressPage() {
  return (
    <div>
      <h2>Progress</h2>
      <p>No auth = no points for now. We’ll add public stats later.</p>
    </div>
  );
}

function LeaderboardPage() {
  return (
    <div>
      <h2>Leaderboard</h2>
      <p>Coming soon. (We’ll make this pull from a public endpoint.)</p>
    </div>
  );
}

// ---------- App (Home only w/ tabs) ----------
export default function App() {
  return (
    <MainLayout>
      <Tabs>
        <TabList style={{ display: "flex", justifyContent: "space-around" }}>
          <Tab>
            <IconHome size={24} /> Home
          </Tab>
          <Tab>
            <IconUpload size={24} /> Upload
          </Tab>
          <Tab>
            <IconChartBar size={24} /> Progress
          </Tab>
          <Tab>
            <IconTrophy size={24} /> Leaderboard
          </Tab>
        </TabList>

        <div style={{ marginTop: 16 }}>
          <TabPanel>
            <HomePage />
          </TabPanel>
          <TabPanel>
            <UploadPage />
          </TabPanel>
          <TabPanel>
            <ProgressPage />
          </TabPanel>
          <TabPanel>
            <LeaderboardPage />
          </TabPanel>
        </div>
      </Tabs>

      <div style={{ marginTop: 14, opacity: 0.6, fontSize: 12 }}>
        API BASE: {API || "(not set)"}
      </div>
    </MainLayout>
  );
}
