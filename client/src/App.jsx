// client/src/App.jsx — Home + Upload + Form Check Forum + Reply Voting (no login)
// Works with your server endpoints:
// - GET  /api/videos
// - POST /api/videos (FormData: title, video)
// - GET  /api/posts
// - POST /api/posts          { title, body, video_id? }
// - GET  /api/posts/:id/comments
// - POST /api/posts/:id/comments   { text }
// - POST /api/comments/:id/vote    { value: 1 or -1 }

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

    const r = await jfetch("/api/videos", {
      method: "POST",
      body: fd,
      isForm: true,
    });
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

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 12,
          maxWidth: 560,
          marginTop: 14,
        }}
      >
        <input
          name="title"
          placeholder="Video title (ex: 315 bench PR)"
          style={S.input}
        />
        <input type="file" name="video" accept="video/*" style={{ padding: 10 }} />
        <button type="submit" style={S.buttonGreen}>
          Upload
        </button>

        {err && <div style={{ color: "#ff6b6b" }}>{err}</div>}
        {ok && <div style={{ color: "#00c853" }}>{ok}</div>}

        <div style={S.card}>
          <div style={{ fontWeight: 800 }}>Pro tip</div>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            After you upload, go to <strong>Form Check</strong> and make a post
            asking for cues.
          </div>
        </div>
      </form>
    </div>
  );
}

// ---------- Form Check Forum + Voting ----------
function ForumPage() {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null); // post object
  const [comments, setComments] = useState([]); // post_comments rows with score/helped/didnt_help
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [err, setErr] = useState("");

  // create post
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [videoId, setVideoId] = useState(""); // optional numeric id

  // create comment
  const [replyText, setReplyText] = useState("");

  // voting busy state
  const [voteBusyId, setVoteBusyId] = useState(null);

  async function loadPosts() {
    setLoading(true);
    setErr("");
    const r = await jfetch("/api/posts");
    if (!r.ok) {
      setErr(`Failed (${r.status})`);
      setLoading(false);
      return;
    }
    setPosts(r.data?.posts || []);
    setLoading(false);
  }

  async function openThread(post) {
    if (!post?.id) return;
    setSelectedPost(post);
    setThreadLoading(true);

    const r = await jfetch(`/api/posts/${post.id}/comments`);
    if (r.ok) {
      setComments(r.data?.comments || []);
    } else {
      setComments([]);
    }
    setThreadLoading(false);
    setReplyText("");
  }

  async function createPost(e) {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (!t) return alert("Title required");
    if (!b) return alert("Body required");

    const payload = { title: t, body: b };
    const vid = String(videoId || "").trim();
    if (vid) payload.video_id = Number(vid);

    const r = await jfetch("/api/posts", { method: "POST", body: payload });
    if (!r.ok) return alert(r.data?.error || `Failed (${r.status})`);

    setTitle("");
    setBody("");
    setVideoId("");

    await loadPosts();

    // open the new thread
    const created = r.data?.post;
    if (created?.id) {
      await openThread(created);
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!selectedPost?.id) return;

    const text = replyText.trim();
    if (!text) return;

    const r = await jfetch(`/api/posts/${selectedPost.id}/comments`, {
      method: "POST",
      body: { text },
    });

    if (!r.ok) return alert(r.data?.error || `Failed (${r.status})`);

    // reload sorted comments
    await openThread(selectedPost);
    await loadPosts();
  }

  async function voteReply(commentId, value) {
    if (!selectedPost?.id) return;
    setVoteBusyId(commentId);

    const r = await jfetch(`/api/comments/${commentId}/vote`, {
      method: "POST",
      body: { value }, // 1 or -1
    });

    setVoteBusyId(null);

    if (!r.ok) {
      alert(r.data?.error || `Vote failed (${r.status})`);
      return;
    }

    // reload sorted comments so best advice floats up
    await openThread(selectedPost);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  const hasThread = !!selectedPost?.id;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Form Check Forum</h2>
      <div style={S.muted}>Ask for advice. People reply. Vote best advice up.</div>

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
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            placeholder="Optional: attach a video by ID (ex: 12)"
            style={S.input}
          />
          <button type="submit" style={S.buttonGreen}>
            Post
          </button>
          <div style={{ ...S.muted, marginTop: 2 }}>
            Tip: Copy the video’s ID from Home feed (the #number).
          </div>
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 900 }}>Latest posts</div>
            <button onClick={loadPosts} style={S.buttonDark}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ marginTop: 10, opacity: 0.7 }}>Loading…</div>
          ) : err ? (
            <div style={{ marginTop: 10, color: "#ff6b6b" }}>{err}</div>
          ) : !posts.length ? (
            <div style={{ marginTop: 10, opacity: 0.7 }}>
              No posts yet. Start it.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {posts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openThread(p)}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 12,
                    background:
                      hasThread && selectedPost?.id === p.id
                        ? "#1f1f1f"
                        : "#141414",
                    border: "1px solid #2b2b2b",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{p.title}</div>
                  <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
                    {new Date(p.created_at).toLocaleString()}
                    {p.video_url ? " • 🎥 attached" : ""}
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
            <div style={{ opacity: 0.75 }}>Open a post to see replies.</div>
          ) : (
            <>
              <div style={{ fontWeight: 1000, fontSize: 18 }}>
                {selectedPost.title}
              </div>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 4 }}>
                {new Date(selectedPost.created_at).toLocaleString()} • Post #
                {selectedPost.id}
              </div>

              <div
                style={{
                  marginTop: 12,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.35,
                }}
              >
                {selectedPost.body}
              </div>

              {selectedPost.video_url ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 6 }}>
                    Attached video
                  </div>
                  <video
                    controls
                    playsInline
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      background: "black",
                    }}
                    src={`${API}${selectedPost.video_url}`}
                  />
                </div>
              ) : null}

              <div style={{ marginTop: 16, fontWeight: 900 }}>Replies</div>

              {threadLoading ? (
                <div style={{ marginTop: 10, opacity: 0.7 }}>Loading replies…</div>
              ) : (
                <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                  {comments.length ? (
                    comments.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          background: "#141414",
                          border: "1px solid #2b2b2b",
                        }}
                      >
                        <div style={{ whiteSpace: "pre-wrap" }}>{r.text}</div>

                        {/* score + vote buttons */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            marginTop: 10,
                          }}
                        >
                          <div style={{ opacity: 0.7, fontSize: 12 }}>
                            Score:{" "}
                            <strong style={{ opacity: 1 }}>
                              {Number(r.score || 0)}
                            </strong>{" "}
                            • Helped {Number(r.helped || 0)} • Not it{" "}
                            {Number(r.didnt_help || 0)} •{" "}
                            {new Date(r.created_at).toLocaleString()}
                          </div>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              disabled={voteBusyId === r.id}
                              onClick={() => voteReply(r.id, 1)}
                              style={{
                                ...S.buttonDark,
                                padding: "10px 12px",
                                opacity: voteBusyId === r.id ? 0.6 : 1,
                              }}
                            >
                              Helped ✅
                            </button>
                            <button
                              type="button"
                              disabled={voteBusyId === r.id}
                              onClick={() => voteReply(r.id, -1)}
                              style={{
                                ...S.buttonDark,
                                padding: "10px 12px",
                                opacity: voteBusyId === r.id ? 0.6 : 1,
                              }}
                            >
                              Not it ❌
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ opacity: 0.7 }}>
                      No replies yet. Be the first.
                    </div>
                  )}
                </div>
              )}

              <form
                onSubmit={sendReply}
                style={{ display: "grid", gap: 10, marginTop: 14 }}
              >
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
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
        Voting is anonymous (IP+UA hashed). Best advice floats up automatically.
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
        No login = no points yet. Later we can do public streaks or device-based
        stats.
      </p>
      <div style={S.card}>
        Next ideas: “PR of the day”, “streaks”, “challenges”, “local gym
        leaderboard”.
      </div>
    </div>
  );
}

function LeaderboardPage() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Leaderboard</h2>
      <p style={S.muted}>Coming soon. We can start with “Top helpful replies”.</p>
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
