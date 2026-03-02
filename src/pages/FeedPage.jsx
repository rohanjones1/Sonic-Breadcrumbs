import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
} from "firebase/firestore";

// ── Haversine for distance label ─────────────────────────────────────────────
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeAgo(date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatLocation(lat, lng) {
  // Returns approximate cardinal direction label; you could swap in reverse-geocoding
  return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
}

export default function FeedPage() {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid;

  // ── State ─────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState("feed"); // "feed" | "friends"
  const [following, setFollowing] = useState([]); // array of UIDs
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState("");

  const [friendProfiles, setFriendProfiles] = useState({}); // uid → {username, photoURL}

  // ── Load current user's following list ────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists()) {
        setFollowing(snap.data().following || []);
      }
    });
  }, [uid]);

  // ── Load feed drops whenever following changes ────────────────────────────
  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const loadFeed = async () => {
      if (following.length === 0) {
        setDrops([]);
        setLoading(false);
        return;
      }

      // Firestore "in" supports up to 30 items; chunk if needed
      const chunks = [];
      for (let i = 0; i < following.length; i += 30)
        chunks.push(following.slice(i, i + 30));

      let allDrops = [];
      for (const chunk of chunks) {
        const q = query(collection(db, "drops"), where("userId", "in", chunk));
        const snap = await getDocs(q);
        snap.forEach((d) => allDrops.push({ id: d.id, ...d.data() }));
      }

      // Sort newest first
      allDrops.sort(
        (a, b) =>
          (b.timestamp?.toDate?.() ?? new Date(b.timestamp)) -
          (a.timestamp?.toDate?.() ?? new Date(a.timestamp))
      );

      setDrops(allDrops);

      // Load friend profiles for display names / avatars
      const profiles = {};
      await Promise.all(
        following.map(async (fuid) => {
          const snap = await getDoc(doc(db, "users", fuid));
          if (snap.exists()) profiles[fuid] = snap.data();
        })
      );
      setFriendProfiles(profiles);
      setLoading(false);
    };

    loadFeed();
  }, [following, uid]);

  // ── Search users ──────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchMsg("");
    setSearchResults([]);

    const snap = await getDocs(collection(db, "users"));
    const results = [];
    snap.forEach((d) => {
      const data = d.data();
      if (
        d.id !== uid &&
        data.username?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        results.push({ uid: d.id, ...data });
      }
    });

    setSearchResults(results);
    if (results.length === 0) setSearchMsg("No users found.");
    setSearching(false);
  };

  const handleFollow = async (targetUid) => {
    if (!uid) return;
    const isFollowing = following.includes(targetUid);
    const userRef = doc(db, "users", uid);

    if (isFollowing) {
      await updateDoc(userRef, { following: arrayRemove(targetUid) });
      setFollowing((prev) => prev.filter((id) => id !== targetUid));
    } else {
      await updateDoc(userRef, { following: arrayUnion(targetUid) });
      setFollowing((prev) => [...prev, targetUid]);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --gold: #c9a84c;
          --gold-dim: #a07830;
          --bg: #1e1a10;
          --surface: #2a2416;
          --surface2: #322c1a;
          --border: rgba(201,168,76,0.2);
          --text: #ede8d8;
          --muted: #8a7a55;
        }

        .feed-page {
          min-height: 100vh;
          background: var(--bg);
          font-family: 'DM Sans', sans-serif;
          color: var(--text);
          display: flex;
          flex-direction: column;
          max-width: 100%;
          margin: 0 auto;
          position: relative;
        }

        /* ── Top bar ── */
        .feed-topbar {
          position: sticky;
          top: 0;
          z-index: 10;
          background: rgba(30,26,16,0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
          padding: 1rem 1.25rem 0;
        }
        .feed-topbar-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .back-btn {
          background: none;
          border: none;
          color: var(--muted);
          font-size: 1.1rem;
          cursor: pointer;
          padding: 4px 8px 4px 0;
          transition: color 0.2s;
          font-family: 'DM Sans', sans-serif;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          letter-spacing: 0.05em;
        }
        .back-btn:hover { color: var(--gold); }
        .feed-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.2rem;
          font-weight: 900;
          color: var(--text);
          letter-spacing: -0.01em;
        }
        .feed-title span {
          color: var(--gold);
        }

        /* ── Tabs ── */
        .feed-tabs {
          display: flex;
          gap: 0;
        }
        .feed-tab {
          flex: 1;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--muted);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 0.6rem 0;
          cursor: pointer;
          transition: color 0.2s, border-color 0.2s;
        }
        .feed-tab.active {
          color: var(--gold);
          border-bottom-color: var(--gold);
        }

        /* ── Content area ── */
        .feed-content {
          align-items: center;
          flex: 1;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* ── Empty / loading state ── */
        .feed-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          gap: 0.75rem;
          text-align: center;
        }
        .feed-empty-icon {
          font-size: 2.5rem;
          opacity: 0.4;
        }
        .feed-empty-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.1rem;
          color: var(--text);
          opacity: 0.6;
        }
        .feed-empty-sub {
          font-size: 0.8rem;
          color: var(--muted);
          font-weight: 300;
          line-height: 1.6;
          max-width: 260px;
        }

        /* ── Drop card ── */
        .drop-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 3px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          position: relative;
          animation: fadeUp 0.35s ease both;
          min-width: 700px;
        }
        .drop-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.35), transparent);
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .drop-card-header {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.75rem 0.9rem 0.5rem;
        }
        .friend-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--surface2);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Playfair Display', serif;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--gold);
          flex-shrink: 0;
          overflow: hidden;
        }
        .friend-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .drop-card-meta {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .drop-card-username {
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--gold);
        }
        .drop-card-time-loc {
          font-size: 0.68rem;
          color: var(--muted);
          font-weight: 300;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .drop-card-time-loc span::before {
          content: '·';
          margin-right: 0.35rem;
        }

        .drop-card-body {
          display: flex;
          gap: 0.75rem;
          padding: 0.5rem 0.9rem 0.9rem;
          align-items: center;
        }
        .drop-artwork {
          width: 62px;
          height: 62px;
          border-radius: 2px;
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid rgba(201,168,76,0.15);
        }
        .drop-info {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .drop-track {
          font-family: 'Playfair Display', serif;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
          line-height: 1.2;
        }
        .drop-artist {
          font-size: 0.78rem;
          color: var(--muted);
          font-weight: 300;
        }
        .drop-location {
          margin-top: 0.3rem;
          font-size: 0.68rem;
          color: var(--gold-dim);
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        /* ── Friends / search tab ── */
        .search-wrap {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .search-input {
          flex: 1;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 2px;
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          font-weight: 300;
          padding: 0.6rem 0.85rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .search-input::placeholder { color: var(--muted); }
        .search-input:focus { border-color: rgba(201,168,76,0.5); }
        .search-btn {
          background: linear-gradient(135deg, #c9a84c, #8a6010);
          border: none;
          border-radius: 2px;
          color: #0a0700;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.6rem 1rem;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .search-btn:hover { opacity: 0.85; }
        .search-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .search-msg {
          font-size: 0.78rem;
          color: var(--muted);
          text-align: center;
          padding: 1rem 0;
        }

        .user-row {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 3px;
          padding: 0.7rem 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          animation: fadeUp 0.25s ease both;
        }
        .user-row-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--surface2);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Playfair Display', serif;
          font-size: 1rem;
          font-weight: 700;
          color: var(--gold);
          flex-shrink: 0;
          overflow: hidden;
        }
        .user-row-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .user-row-name {
          flex: 1;
          font-size: 0.88rem;
          font-weight: 500;
          color: var(--text);
        }
        .follow-btn {
          background: none;
          border: 1px solid var(--gold);
          border-radius: 2px;
          color: var(--gold);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.35rem 0.8rem;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .follow-btn:hover {
          background: var(--gold);
          color: #0a0700;
        }
        .follow-btn.following {
          background: rgba(201,168,76,0.1);
          color: var(--muted);
          border-color: var(--border);
        }

        .section-label {
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--gold-dim);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0.5rem 0 0.75rem;
        }
        .section-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .shimmer-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 3px;
          padding: 1rem;
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        .shimmer-box {
          border-radius: 2px;
          background: linear-gradient(90deg, var(--surface) 25%, var(--surface2) 50%, var(--surface) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className="feed-page">
        {/* ── Top bar ── */}
        <div className="feed-topbar">
          <div className="feed-topbar-row">
            <button className="back-btn" onClick={() => navigate("/map")}>
              ← Map
            </button>
            <div className="feed-title">
              Friend <span>Feed</span>
            </div>
            <div style={{ width: 60 }} />
          </div>
          <div className="feed-tabs">
            <button
              className={`feed-tab ${tab === "feed" ? "active" : ""}`}
              onClick={() => setTab("feed")}
            >
              Drops
            </button>
            <button
              className={`feed-tab ${tab === "friends" ? "active" : ""}`}
              onClick={() => setTab("friends")}
            >
              Friends
            </button>
          </div>
        </div>

        {/* ── Feed tab ── */}
        {tab === "feed" && (
          <div className="feed-content">
            {loading ? (
              [0, 1, 2].map((i) => (
                <div className="shimmer-card" key={i}>
                  <div className="shimmer-box" style={{ width: 62, height: 62, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <div className="shimmer-box" style={{ height: 14, width: "60%" }} />
                    <div className="shimmer-box" style={{ height: 11, width: "40%" }} />
                    <div className="shimmer-box" style={{ height: 10, width: "30%" }} />
                  </div>
                </div>
              ))
            ) : drops.length === 0 ? (
              <div className="feed-empty">
                <div className="feed-empty-icon">🎵</div>
                <div className="feed-empty-title">No drops yet</div>
                <div className="feed-empty-sub">
                  Follow friends to see where they've been dropping music. Head to the Friends tab to search by username.
                </div>
              </div>
            ) : (
              drops.map((drop, i) => {
                const profile = friendProfiles[drop.userId] || {};
                const letter = profile.username?.[0]?.toUpperCase() ?? "?";
                const ts = drop.timestamp?.toDate
                  ? drop.timestamp.toDate()
                  : new Date(drop.timestamp);
                return (
                  <div
                    className="drop-card"
                    key={drop.id}
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <div className="drop-card-header">
                      <div className="friend-avatar">
                        {profile.photoURL ? (
                          <img src={profile.photoURL} alt={profile.username} />
                        ) : (
                          letter
                        )}
                      </div>
                      <div className="drop-card-meta">
                        <div className="drop-card-username">
                          @{profile.username ?? "unknown"}
                        </div>
                        <div className="drop-card-time-loc">
                          {timeAgo(ts)}
                          {drop.lat && drop.lng && (
                            <span>{formatLocation(drop.lat, drop.lng)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="drop-card-body">
                      {drop.artwork && (
                        <img
                          className="drop-artwork"
                          src={drop.artwork}
                          alt={drop.trackName}
                        />
                      )}
                      <div className="drop-info">
                        <div className="drop-track">{drop.trackName}</div>
                        <div className="drop-artist">{drop.artistName}</div>
                        {drop.lat && drop.lng && (
                          <div className="drop-location">
                            📍 {formatLocation(drop.lat, drop.lng)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Friends tab ── */}
        {tab === "friends" && (
          <div className="feed-content">
            <div className="search-wrap">
              <input
                className="search-input"
                placeholder="Search by username…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                className="search-btn"
                onClick={handleSearch}
                disabled={searching}
              >
                {searching ? "…" : "Find"}
              </button>
            </div>

            {searchResults.length > 0 && (
              <>
                <div className="section-label">Results</div>
                {searchResults.map((user) => {
                  const isFollowing = following.includes(user.uid);
                  return (
                    <div className="user-row" key={user.uid}>
                      <div className="user-row-avatar">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.username} />
                        ) : (
                          user.username?.[0]?.toUpperCase() ?? "?"
                        )}
                      </div>
                      <div className="user-row-name">@{user.username}</div>
                      <button
                        className={`follow-btn ${isFollowing ? "following" : ""}`}
                        onClick={() => handleFollow(user.uid)}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {searchMsg && <div className="search-msg">{searchMsg}</div>}

            {following.length > 0 && (
              <>
                <div className="section-label">Following</div>
                {following.map((fuid) => {
                  const profile = friendProfiles[fuid] || {};
                  return (
                    <div className="user-row" key={fuid}>
                      <div className="user-row-avatar">
                        {profile.photoURL ? (
                          <img src={profile.photoURL} alt={profile.username} />
                        ) : (
                          profile.username?.[0]?.toUpperCase() ?? "?"
                        )}
                      </div>
                      <div className="user-row-name">
                        @{profile.username ?? fuid}
                      </div>
                      <button
                        className="follow-btn following"
                        onClick={() => handleFollow(fuid)}
                      >
                        Unfollow
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {following.length === 0 && searchResults.length === 0 && !searchMsg && (
              <div className="feed-empty">
                <div className="feed-empty-icon">🔍</div>
                <div className="feed-empty-title">Find your people</div>
                <div className="feed-empty-sub">
                  Search for friends by username and follow them to see their drops in your feed.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
