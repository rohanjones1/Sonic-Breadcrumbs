import { useState, useEffect } from "react";
import "./DropSongModal.css";

function DropSongModal({ onClose, onDrop }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    setLoading(true);
    const delay = setTimeout(async () => {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=5`,
      );
      const data = await res.json();
      setResults(data.results);
      setLoading(false);
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  const handleSelect = (song) => {
    setSelected(song);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Drop a Song</h2>

        <div className="search-row">
          <input
            type="text"
            placeholder="Search for a song..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Results */}
        {loading && <p>Searching...</p>}
        <ul className="results-list">
          {results.map((song) => (
            <li
              key={song.trackId}
              className={selected?.trackId === song.trackId ? "selected" : ""}
              onClick={() => handleSelect(song)}
            >
              <img src={song.artworkUrl100} alt={song.trackName} />
              <div>
                <p className="song-title">{song.trackName}</p>
                <p className="song-artist">{song.artistName}</p>
              </div>
              {selected?.trackId === song.trackId && (
                <span className="checkmark">✓</span>
              )}
            </li>
          ))}
        </ul>

        {/* Selected song preview + confirm */}
        {selected && (
          <div className="selected-preview">
            <audio src={selected.previewUrl} autoPlay controls />
            <div className="selected-info">
              <img src={selected.artworkUrl100} alt={selected.trackName} />
              <div>
                <p className="song-title">{selected.trackName}</p>
                <p className="song-artist">{selected.artistName}</p>
              </div>
            </div>
            <button
              className="drop-confirm-btn"
              onClick={() => onDrop(selected)}
            >
              📍 Drop this Song here
            </button>
          </div>
        )}

        <button className="close-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default DropSongModal;
