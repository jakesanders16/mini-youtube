// client/src/App.jsx — Home + Upload + Form Check Forum (no login)
import { useEffect, useMemo, useState } from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import {
  IconHome,
  IconUpload,
  IconMessageCircle,
  IconChartBar,
  IconTrophy,
} from "@tabler/icons-react";

const API = import.meta.env.VITE_API_URL || "";

// ---------- tiny fetch helper ----------
async function jfetch(path, { method = "GET", body, isForm = false } = {}) {
  const url = `${API}${path}`;
  const opts = { method, headers: {} };

  if (body !== undefined) {
    if (isForm) {
      opts.body = body; // FormData
    } else {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }

  const r = await fetch(url, opts);
  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: r.ok, status: r.status, data };
}

// ---------- shared styles ----------
const S = {
  card: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    background: "#151515",
    border: "1px solid #2b2b2b",
  },
  input: {
    padding: 12,
    borderRadius: 10,
    background: "#222",
    color: "white",
    border: "1px solid #444",
    outline: "none",
  },
  buttonGreen: {
    padding: 14,
    background: "#00c853",
    color: "white",
    border: "none",
    borderRadius: 10,
    fontWeight: 800,
    cursor: "pointer",
  },
  buttonDark: {
    padding: 12,
    background: "#2a2a2a",
    color: "white",
    border: "1px solid #3a3a3a",
    borderRadius: 10,
    fontWeight: 700,
    cursor: "pointer",
  },
  muted: { opacity: 0.7, fontSize: 13 },
};

// ---------- Layout ----------
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
          gap: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h1 style={{ margin: 0, fontSize: 24, color: "#00c853" }}>
            Gains Arena
          </h1>
          <span style={{ opacity: 0.7, fontSize: 12 }}>
            No login • Videos + Form Check Forum
          </span>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>API</div>
          <div style={{ fontSize: 12 }}>
            {API ? API : "(VITE_API_URL not set)"}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>{children}</div>
    </div>
  );
}

// ---------- Videos Feed ----------
function HomeFeed({ refreshKey }) {
  const [videos, setVideos] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setErr("");
    const r = await jfetch("/api/videos");
    if (!r.ok) {
      setErr(`Failed (${r.status})`);
      setLoading(false);
      return;
    }
    setVideos(r.data?.videos || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (loading) return <div style={S.muted}>Loading videos…</div>;
  if (err) return <div style={{ color: "#ff6b6b" }}>{err}</div>;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Home Feed</h2>
      <div style={S.muted}>
        Latest uploads. Use Upload tab to post. Use Form Check tab to ask for
        advice.
      </div>

      {!videos.length ? (
        <div style={S.card}>No videos yet. Upload the first one 🔥</div>
      ) : (
        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
          {videos.map((v) => (
            <div
              key={v.id}
              style={{
                padding: 14,
                borderRadius: 14,
                background: "#141414",
                border: "1px solid #2b2b2b",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>{v.title}</div>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 4 }}>
                #{v.id} • {new Date(v.created_at).toLocaleString()}
              </div>

              <video
                controls
                playsInline
                style={{
                  width: "100%",
                  marginTop: 10,
                  borderRadius: 12,
                  background: "black",
                }}
                src={`${API}${v.url}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Upload ----------
function UploadPage({ onUploaded }) {
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");

    const form = e.target;
    const fd = new FormData(form);

    const title = String(fd.get("title") || "").trim();
    const file = fd.get("video");

    if (!title) return setErr("Title required");
    if (!file || !file.name) return setErr("Pick a video file");

    const r = await jfetch("/api/videos", { method: "POST", body: fd, isForm: true });
    if (!r.ok) {
      setErr(r.data?.error || `Upload failed (${r.status})`);
      return;
    }

    setOk("Uploaded ✅");
    form.reset();
    onUploaded?.();
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Upload</h2>
      <div style={S.muted}>Post a lift. No login. Straight to the feed.</div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 560, marginTop: 14 }}>
        <input name="title" placeholder="Video title (ex: 315 bench PR)" style={S.input} />
        <input type="file" name="video" accept="video/*" style={{ padding: 10 }} />
        <button type="submit" style={S.buttonGreen}>Upload</button>

        {err && <div style={{ color: "#ff6b6b" }}>{err}</div>}
        {ok && <div style={{ color: "#00c853" }}>{ok}</div>}

        <div style={S.card}>
          <div style={{ fontWeight: 800 }}>Pro tip</div>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            After you upload, go to <strong>Form Check</strong> and make a post asking for cues.
          </div>
        </div>
      </form>
    </div>
  );
}

// ---------- Form Check Forum ----------
function ForumPage() {
  const [posts, setPosts] = useState([]);
  const [selected, setSelected] = useState(null); // {post, replies}
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // create post
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // reply
  const [reply, setReply] = useState("");

  async function loadList() {
    setLoading(true);
    setErr("");
    const r = await jfetch("/api/forum/posts?limit=100");
    if (!r.ok) {
      setErr(`Failed (${r.status})`);
      setLoading(false);
      return;
    }
    setPosts(r.data?.posts || []);
    setLoading(false);
  }

  async function openThread(id) {
    const r = await jfetch(`/api/forum/posts/${id}`);
    if (!r.ok) return;
    setSelected({ post: r.data.post, replies: r.data.replies || [] });
    setReply("");
  }

  async function createPost(e) {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    const u = videoUrl.trim();

    if (!t) return alert("Title required");
    if (!b) return alert("Body required");

    const payload = { title: t, body: b };
    if (u) payload.video_url = u; // can be /uploads/... or https://...

    const r = await jfetch("/api/forum/posts", { method: "POST", body: payload });
    if (!r.ok) return alert(r.data?.error || `Failed (${r.status})`);

    setTitle("");
    setBody("");
    setVideoUrl("");
    await loadList();
    await openThread(r.data?.post?.id);
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!selected?.post?.id) return;

    const b = reply.trim();
    if (!b) return;

    const r = await jfetch(`/api/forum/posts/${selected.post.id}/replies`, {
      method: "POST",
      body: { body: b },
    });

    if (!r.ok) return alert(r.data?.error || `Failed (${r.status})`);

    // refresh thread
    await openThread(selected.post.id);
    setReply("");
    await loadList();
  }

  useEffect(() => {
    loadList();
  }, []);

  const hasThread = !!selected?.post;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Form Check Forum</h2>
      <div style={S.muted}>
        Ask for advice. People reply with cues. No accounts.
      </div>

      {/* Create Post */}
      <div style={{ ...S.card, marginTop: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Create a post</div>

        <form onSubmit={createPost} style={{ display: "grid", gap: 10 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (ex: Squat depth check)"
            style={S.input}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What do you want help with? (pain, bar path, cues, stance, etc)"
            style={{ ...S.input, minHeight: 90, resize: "vertical" }}
          />
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Optional: paste video url (ex: /uploads/123__squat.mp4 or a full https link)"
            style={S.input}
          />
          <button type="submit" style={S.buttonGreen}>
            Post
          </button>
        </form>
      </div>

      {/* List + Thread */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 14,
          marginTop: 14,
        }}
      >
        {/* Posts list */}
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>Latest posts</div>
            <button onClick={loadList} style={S.buttonDark}>Refresh</button>
          </div>

          {loading ? (
            <div style={{ marginTop: 10, opacity: 0.7 }}>Loading…</div>
          ) : err ? (
            <div style={{ marginTop: 10, color: "#ff6b6b" }}>{err}</div>
          ) : !posts.length ? (
            <div style={{ marginTop: 10, opacity: 0.7 }}>No posts yet. Start it.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {posts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openThread(p.id)}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 12,
                    background: hasThread && selected?.post?.id === p.id ? "#1f1f1f" : "#141414",
                    border: "1px solid #2b2b2b",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{p.title}</div>
                  <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
                    {new Date(p.created_at).toLocaleString()} • {p.reply_count || 0} replies
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 13, marginTop: 6 }}>
                    {String(p.body || "").slice(0, 140)}
                    {String(p.body || "").length > 140 ? "…" : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thread */}
        <div style={S.card}>
          {!hasThread ? (
            <div style={{ opacity: 0.75 }}>
              Open a post to see replies.
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 1000, fontSize: 18 }}>{selected.post.title}</div>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 4 }}>
                {new Date(selected.post.created_at).toLocaleString()} • Post #{selected.post.id}
              </div>

              <div style={{ marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.35 }}>
                {selected.post.body}
              </div>

              {selected.post.video_url ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 6 }}>
                    Attached video
                  </div>

                  {/* If they used /uploads/... we make it absolute */}
                  {selected.post.video_url.startsWith("/uploads/") ? (
                    <video
                      controls
                      playsInline
                      style={{ width: "100%", borderRadius: 12, background: "black" }}
                      src={`${API}${selected.post.video_url}`}
                    />
                  ) : (
                    <a
                      href={selected.post.video_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#00c853" }}
                    >
                      Open video link
                    </a>
                  )}
                </div>
              ) : null}

              <div style={{ marginTop: 16, fontWeight: 900 }}>Replies</div>

              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {(selected.replies || []).length ? (
                  selected.replies.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#141414",
                        border: "1px solid #2b2b2b",
                      }}
                    >
                      <div style={{ whiteSpace: "pre-wrap" }}>{r.body}</div>
                      <div style={{ opacity: 0.6, fontSize: 12, marginTop: 8 }}>
                        {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ opacity: 0.7 }}>No replies yet. Be the first.</div>
                )}
              </div>

              <form onSubmit={sendReply} style={{ display: "grid", gap: 10, marginTop: 14 }}>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write advice (cues, form tips, what you’d change)…"
                  style={{ ...S.input, minHeight: 80, resize: "vertical" }}
                />
                <button type="submit" style={S.buttonGreen}>
                  Reply
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14, opacity: 0.6, fontSize: 12 }}>
        Tip: If you want a “pick from uploaded videos” button next, I’ll add it.
      </div>
    </div>
  );
}

// ---------- Placeholder pages ----------
function ProgressPage() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Progress</h2>
      <p style={S.muted}>
        No login = no points yet. Later we can do public streaks or device-based stats.
      </p>
      <div style={S.card}>
        Next ideas: “PR of the day”, “streaks”, “challenges”, “local gym leaderboard”.
      </div>
    </div>
  );
}

function LeaderboardPage() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Leaderboard</h2>
      <p style={S.muted}>
        Coming soon. We can start with “Top uploads this week” (public).
      </p>
      <div style={S.card}>
        Next ideas: Most helpful commenters • Most viewed • Most posted.
      </div>
    </div>
  );
}

// ---------- App ----------
export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const tabListStyle = useMemo(
    () => ({
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      gap: 8,
      padding: 8,
      background: "#121212",
      borderRadius: 12,
      border: "1px solid #2b2b2b",
    }),
    []
  );

  return (
    <MainLayout>
      <Tabs>
        <TabList style={tabListStyle}>
          <Tab>
            <IconHome size={22} /> Home
          </Tab>
          <Tab>
            <IconUpload size={22} /> Upload
          </Tab>
          <Tab>
            <IconMessageCircle size={22} /> Form Check
          </Tab>
          <Tab>
            <IconChartBar size={22} /> Progress
          </Tab>
          <Tab>
            <IconTrophy size={22} /> Leaderboard
          </Tab>
        </TabList>

        <div style={{ marginTop: 16 }}>
          <TabPanel>
            <HomeFeed refreshKey={refreshKey} />
          </TabPanel>

          <TabPanel>
            <UploadPage onUploaded={() => setRefreshKey((k) => k + 1)} />
          </TabPanel>

          <TabPanel>
            <ForumPage />
          </TabPanel>

          <TabPanel>
            <ProgressPage />
          </TabPanel>

          <TabPanel>
            <LeaderboardPage />
          </TabPanel>
        </div>
      </Tabs>
    </MainLayout>
  );
}
