import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const MAX_BIO = 200;

export default function Profile() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [songs, setSongs] = useState(['', '', '']);
  const [bio, setBio] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSongChange = (index, value) => {
    const updated = [...songs];
    updated[index] = value;
    setSongs(updated);
  };

  const validate = () => {
    const newErrors = {};
    if (!username.trim()) newErrors.username = 'Username is required.';
    else if (username.length < 3) newErrors.username = 'At least 3 characters.';
    if (songs.some((s) => !s.trim())) newErrors.songs = 'Please fill in all 3 songs.';
    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      const uid = auth.currentUser?.uid;
      if (uid) {
        await setDoc(doc(db, 'users', uid), {
          username,
          songs,
          bio,
          photoURL: null,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    }

    setSaving(false);
    navigate('/map');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --gold: #c9a84c;
          --gold-light: #f7e07a;
          --gold-dim: #a07830;
          --bg: #1e1a10;
          --surface: #2a2416;
          --surface2: #322c1a;
          --border: rgba(201,168,76,0.28);
          --text: #ede8d8;
          --muted: #8a7a55;
          --error: #c0392b;
        }

        body { background: var(--bg); }

        .profile-page {
          min-height: 100vh;
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .profile-page::before {
          content: '';
          position: fixed;
          top: -20%;
          left: -10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(201,168,76,0.13) 0%, transparent 70%);
          pointer-events: none;
        }
        .profile-page::after {
          content: '';
          position: fixed;
          bottom: -20%;
          right: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        .vinyl-bg {
          position: fixed;
          top: 50%;
          right: -180px;
          transform: translateY(-50%);
          width: 480px;
          height: 480px;
          border-radius: 50%;
          background: repeating-radial-gradient(
            circle,
            #1e1a10 0px,
            #1e1a10 8px,
            #252015 9px,
            #252015 18px
          );
          border: 2px solid rgba(201,168,76,0.1);
          opacity: 0.35;
          animation: spin 28s linear infinite;
          pointer-events: none;
        }
        .vinyl-bg::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: radial-gradient(circle, #c9a84c 0%, #7a5c1e 60%, #1e1a10 100%);
        }

        @keyframes spin {
          from { transform: translateY(-50%) rotate(0deg); }
          to   { transform: translateY(-50%) rotate(360deg); }
        }

        .card {
          position: relative;
          z-index: 1;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 2px;
          padding: 3rem 2.5rem 2.5rem;
          width: 100%;
          max-width: 480px;
          box-shadow:
            0 0 0 1px rgba(201,168,76,0.06),
            0 32px 80px rgba(0,0,0,0.8),
            0 0 60px rgba(201,168,76,0.04);
        }

        .card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--gold), transparent);
        }

        .brand {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.25em;
          color: var(--gold);
          text-transform: uppercase;
          text-align: center;
          margin-bottom: 1.75rem;
          opacity: 0.8;
        }

        .avatar-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--surface2);
          border: 1.5px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Playfair Display', serif;
          font-size: 2rem;
          font-weight: 700;
          color: var(--gold);
          position: relative;
          box-shadow: 0 0 30px rgba(201,168,76,0.12);
          transition: box-shadow 0.3s;
        }
        .avatar.has-letter { box-shadow: 0 0 40px rgba(201,168,76,0.22); }
        .avatar-ring {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 1px solid rgba(201,168,76,0.2);
        }

        h1 {
          font-family: 'Playfair Display', serif;
          font-size: 1.7rem;
          font-weight: 900;
          color: var(--text);
          text-align: center;
          margin-bottom: 0.3rem;
          letter-spacing: -0.01em;
        }
        .subtitle {
          text-align: center;
          color: var(--muted);
          font-size: 0.85rem;
          font-weight: 300;
          margin-bottom: 2.25rem;
          letter-spacing: 0.02em;
        }

        .section-label {
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--gold-dim);
          margin-bottom: 0.6rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .section-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .field { margin-bottom: 1.75rem; }

        input, textarea {
          width: 100%;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 2px;
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 300;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          padding: 0.7rem 0.9rem;
        }
        input::placeholder, textarea::placeholder { color: var(--muted); }
        input:focus, textarea:focus {
          border-color: rgba(201,168,76,0.5);
          box-shadow: 0 0 0 3px rgba(201,168,76,0.06);
        }
        input.err, textarea.err { border-color: var(--error); }

        textarea {
          resize: vertical;
          min-height: 90px;
          line-height: 1.6;
        }

        .char-count {
          text-align: right;
          font-size: 0.72rem;
          color: var(--muted);
          margin-top: 0.35rem;
          font-variant-numeric: tabular-nums;
        }

        .song-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .song-num {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 500;
          color: var(--gold);
          flex-shrink: 0;
          background: var(--surface2);
        }

        .error-msg {
          color: var(--error);
          font-size: 0.78rem;
          margin-top: 0.4rem;
          display: block;
        }

        .btn {
          width: 100%;
          padding: 0.85rem;
          margin-top: 0.5rem;
          background: linear-gradient(135deg, #c9a84c, #8a6010);
          border: none;
          border-radius: 2px;
          color: #0a0700;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: opacity 0.2s, transform 0.15s;
        }
        .btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .btn:active:not(:disabled) { transform: translateY(0); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
          transform: translateX(-100%);
          animation: shimmer 2.2s infinite;
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          60%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }

        .saving-dots::after {
          content: '';
          animation: dots 1.2s steps(4, end) infinite;
        }
        @keyframes dots {
          0%   { content: ''; }
          25%  { content: '.'; }
          50%  { content: '..'; }
          75%  { content: '...'; }
        }
      `}</style>

      <div className="profile-page">
        <div className="vinyl-bg" />
        <div className="card">
          <div className="brand">BeatDrop</div>

          <div className="avatar-wrap">
            <div className={`avatar ${username ? 'has-letter' : ''}`}>
              <div className="avatar-ring" />
              {username ? username[0].toUpperCase() : '♪'}
            </div>
          </div>

          <h1>Your Profile</h1>
          <p className="subtitle">Set the stage before you drop your first beat</p>

          <div className="field">
            <div className="section-label">Username</div>
            <input
              className={errors.username ? 'err' : ''}
              type="text"
              placeholder="e.g. vinylchaser"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {errors.username && <span className="error-msg">{errors.username}</span>}
          </div>

          <div className="field">
            <div className="section-label">3 Favorite Songs</div>
            {songs.map((song, i) => (
              <div className="song-row" key={i}>
                <div className="song-num">{i + 1}</div>
                <input
                  className={errors.songs && !song.trim() ? 'err' : ''}
                  type="text"
                  placeholder="Song title — Artist"
                  value={song}
                  onChange={(e) => handleSongChange(i, e.target.value)}
                  style={{ marginBottom: 0 }}
                />
              </div>
            ))}
            {errors.songs && <span className="error-msg">{errors.songs}</span>}
          </div>

          <div className="field">
            <div className="section-label">Bio</div>
            <textarea
              className={bio.length === MAX_BIO ? 'err' : ''}
              placeholder="What's your sound? Tell the world…"
              value={bio}
              maxLength={MAX_BIO}
              onChange={(e) => setBio(e.target.value)}
            />
            <div className="char-count">{bio.length} / {MAX_BIO}</div>
          </div>

          <button className="btn" onClick={handleSubmit} disabled={saving}>
            <div className="btn-shimmer" />
            {saving ? <span className="saving-dots">Saving</span> : 'Complete Profile'}
          </button>
        </div>
      </div>
    </>
  );
}