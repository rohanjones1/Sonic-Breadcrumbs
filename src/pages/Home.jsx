import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

function Particle({ x, y, note, delay, duration, color }) {
  return (
    <div className="particle" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s`, animationDuration: `${duration}s`, color }}>
      {note}
    </div>
  );
}

function Ripple({ x, y, delay }) {
  return <div className="ripple" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }} />;
}

function SongCard({ title, artist, location, time, x, y, delay, color }) {
  return (
    <div className="song-card" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s`, "--card-accent": color }}>
      <div className="song-card-bar" style={{ background: color }} />
      <div className="song-card-info">
        <span className="song-card-title">{title}</span>
        <span className="song-card-artist">{artist}</span>
        <span className="song-card-meta">
          <span className="pin-dot" style={{ background: color }} />
          {location} · {time}
        </span>
      </div>
      <div className="song-card-wave">
        {[...Array(8)].map((_, i) => (
          <span key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s`, background: color }} />
        ))}
      </div>
    </div>
  );
}

const PARTICLES = [
  { note: "♪", x: 8, y: 20, delay: 0, duration: 8, color: "#c9a96e" },
  { note: "♫", x: 15, y: 55, delay: 1.5, duration: 10, color: "#e8c49a" },
  { note: "♩", x: 85, y: 15, delay: 0.5, duration: 9, color: "#a8b89a" },
  { note: "♬", x: 78, y: 70, delay: 2, duration: 7, color: "#c9a96e" },
  { note: "♪", x: 92, y: 45, delay: 3, duration: 11, color: "#d4956a" },
  { note: "♫", x: 25, y: 80, delay: 1, duration: 8.5, color: "#a8b89a" },
  { note: "♩", x: 60, y: 88, delay: 2.5, duration: 9.5, color: "#e8c49a" },
  { note: "♬", x: 5, y: 75, delay: 4, duration: 12, color: "#c9a96e" },
  { note: "♪", x: 70, y: 10, delay: 0.8, duration: 7.5, color: "#d4956a" },
  { note: "♫", x: 45, y: 5, delay: 3.5, duration: 10.5, color: "#a8b89a" },
];

const RIPPLES = [
  { x: 30, y: 40, delay: 0 },
  { x: 65, y: 30, delay: 1.8 },
  { x: 50, y: 65, delay: 0.9 },
  { x: 20, y: 60, delay: 2.7 },
  { x: 75, y: 55, delay: 1.2 },
];

const CARDS = [
  { title: "Blinding Lights", artist: "The Weeknd", location: "Times Square", time: "2h ago", x: 58, y: 38, delay: 0.3, color: "#c9a96e" },
  { title: "Espresso", artist: "Sabrina Carpenter", location: "Brooklyn Bridge", time: "45m ago", x: 65, y: 12, delay: 0.9, color: "#a8b89a" },
  { title: "BIRDS OF A FEATHER", artist: "Billie Eilish", location: "Central Park", time: "Just now", x: 62, y: 62, delay: 1.5, color: "#d4956a" },
];

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [clickRipples, setClickRipples] = useState([]);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { setTimeout(() => setLoaded(true), 500); }, []);

  const handleClick = useCallback((e) => {
    const id = Date.now() + Math.random();
    setClickRipples(prev => [...prev, { x: e.clientX, y: e.clientY, id }]);
    setTimeout(() => setClickRipples(prev => prev.filter(r => r.id !== id)), 1000);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let frame, t = 0;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cols = 20, rows = 14;
      const cw = canvas.width / cols, ch = canvas.height / rows;
      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const dx = Math.sin(t * 0.5 + i * 0.4 + j * 0.3) * 6;
          const dy = Math.cos(t * 0.4 + j * 0.4 + i * 0.2) * 6;
          const x = i * cw + dx, y = j * ch + dy;
          const alpha = 0.04 + 0.03 * Math.sin(t + i + j);
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(210,185,150,${alpha})`;
          ctx.fill();
        }
      }
      t += 0.015;
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <>
      <nav className="sb-nav">
        <span className="sb-logo">Sonic Breadcrumbs</span>
      </nav>

      {/* Click ripples outside overflow:hidden container */}
      {clickRipples.map(r => (
        <div
          key={r.id}
          className="click-ripple"
          style={{ left: r.x, top: r.y }}
        />
      ))}

      <div className={`sb-home ${loaded ? "loaded" : ""}`} onClick={handleClick}>
        <canvas ref={canvasRef} className="grid-canvas" />
        <div className="atmosphere" />
        {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}
        {RIPPLES.map((r, i) => <Ripple key={i} {...r} />)}
        {CARDS.map((c, i) => <SongCard key={i} {...c} />)}
        <main className="sb-main">
          <div className="eyebrow"><span className="live-dot" />Live near you</div>
          <h1 className="sb-headline">
            <span className="headline-line line1">Drop a Song.</span>
            <span className="headline-line line2">Leave a Memory.</span>
          </h1>
          <p className="sb-sub">
            Every day, pin a track to where you are.<br />
            Passers-by discover it for 24 hours — then it's gone.
          </p>
          <div className="sb-actions">
            <button className="btn-primary" onClick={(e) => { e.stopPropagation(); navigate('/login'); }}>
              <span className="btn-inner"><span className="btn-glow" />Sign In</span>
            </button>
            <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); navigate('/map'); }}>
              Explore the Map
            </button>
          </div>
          <div className="sb-stats">
            <div className="stat"><span className="stat-num">2.4k</span><span className="stat-label">drops today</span></div>
            <div className="stat-divider" />
            <div className="stat"><span className="stat-num">180+</span><span className="stat-label">cities</span></div>
            <div className="stat-divider" />
            <div className="stat"><span className="stat-num">850</span><span className="stat-label">active drops</span></div>
          </div>
        </main>
        <div className="bottom-fade" />
      </div>
    </>
  );
}