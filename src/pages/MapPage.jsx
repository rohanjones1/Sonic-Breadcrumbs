import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./MapPage.css";
import DropSongModal from "./DropSongModal";
import { db, storage } from "../firebase";
import { collection, addDoc, doc, getDoc, updateDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth } from "../firebase";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const NEARBY_RADIUS_KM = 0.5;

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function MapPage() {
  const mapContainer = useRef(null);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [nearbyDrops, setNearbyDrops] = useState([]);
  const userLocationRef = useRef(null);
  const auraCache = useRef({});

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      zoom: 15,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    const recenterBtn = document.createElement("button");
    recenterBtn.className = "recenter-btn";
    recenterBtn.innerHTML = "◎";
    recenterBtn.onclick = () => {
      navigator.geolocation.getCurrentPosition((pos) => {
        map.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 15,
        });
      });
    };
    document.body.appendChild(recenterBtn);

    map.on("load", () => {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        userLocationRef.current = { latitude, longitude };
        map.setCenter([longitude, latitude]);

        // Your location dot
        const el = document.createElement("div");
        el.className = "user-location-dot";
        new mapboxgl.Marker(el).setLngLat([longitude, latitude]).addTo(map);

        // Fetch drops
        const snapshot = await getDocs(collection(db, "drops"));
        snapshot.forEach((doc) => {
          const drop = doc.data();
          console.log("drop:", drop.trackName, drop.lat, drop.lng); // add this line
          if (!drop.lat || !drop.lng) return;

          const dropEl = document.createElement("div");
          dropEl.className = "drop-marker";
          dropEl.innerHTML = `
          <div class="drop-pin">
            <img src="${drop.artwork}" alt="${drop.trackName}" />
          </div>
        `;

          new mapboxgl.Marker(dropEl)
            .setLngLat([drop.lng, drop.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25, maxWidth: "none" }).setHTML(`
              <div class="popup-content">
                <img class="popup-artwork" src="${drop.artwork}" />
                <div class="popup-info">
                  <p class="popup-track">${drop.trackName}</p>
                  <p class="popup-artist">${drop.artistName}</p>
                  <audio class="popup-audio" controls src="${drop.previewUrl}" />
                </div>
              </div>
            `),
            )
            .addTo(map);
        });
      });
    });

    return () => {
      map.remove();
      recenterBtn.remove();
    };
  }, []);

  const fetchNearbyDrops = async () => {
    const { latitude, longitude } = userLocationRef.current || {};
    if (!latitude || !longitude) return;

    const snapshot = await getDocs(collection(db, "drops"));
    const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const nearby = all.filter((drop) => {
      const dist = getDistanceKm(latitude, longitude, drop.lat, drop.lng);
      return dist <= NEARBY_RADIUS_KM;
    });

    setNearbyDrops(nearby);
  };

  const getCacheKey = () => {
    const { latitude, longitude } = userLocationRef.current || {};
    if (!latitude || !longitude) return null;
    return `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  };

  const getCachedAura = () => {
    const key = getCacheKey();
    if (!key) return null;
    return auraCache.current[key] || null;
  };

  const setCachedAura = (aura) => {
    const key = getCacheKey();
    if (!key) return;
    auraCache.current[key] = aura;
  };

  const handleOpenModal = () => {
    fetchNearbyDrops();
    setShowModal(true);
  };

  const handleDrop = async (song) => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;

      await addDoc(collection(db, "drops"), {
        trackName: song.trackName,
        artistName: song.artistName,
        artwork: song.artworkUrl100,
        previewUrl: song.previewUrl,
        genre: song.primaryGenreName || "Unknown",
        lat: latitude,
        lng: longitude,
        timestamp: new Date(),
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName,
      });

      const key = getCacheKey();
      if (key) delete auraCache.current[key];

      setShowModal(false);
    });
  };

  // ── Profile panel state ──────────────────────────────────────────────────
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [photoURL, setPhotoURL] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Load profile from Firestore when panel opens
  useEffect(() => {
    if (!showProfile) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfileData(data);
        if (data.photoURL) setPhotoURL(data.photoURL);
      }
    });
  }, [showProfile]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, `profilePictures/${uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", uid), { photoURL: url });
      setPhotoURL(url);
      setProfileData((prev) => ({ ...prev, photoURL: url }));
    } catch (err) {
      console.error("Photo upload failed:", err);
    }
    setUploadingPhoto(false);
  };

  const avatarLetter = profileData?.username
    ? profileData.username[0].toUpperCase()
    : auth.currentUser?.displayName?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map" />
      <button className="drop-button" onClick={handleOpenModal}>
        + Drop a Song
      </button>
      {/* ── Profile avatar button (top-left) ── */}
      <button
        className="profile-avatar-btn"
        onClick={() => setShowProfile(true)}
        title="View profile"
      >
        {photoURL ? (
          <img src={photoURL} alt="Profile" className="profile-avatar-img" />
        ) : (
          <span className="profile-avatar-letter">{avatarLetter}</span>
        )}
      </button>

      {/* ── Profile slide-in panel ── */}
      {showProfile && (
        <>
          <div
            className="profile-panel-backdrop"
            onClick={() => setShowProfile(false)}
          />
          <div className="profile-panel">
            {/* Close button */}
            <button
              className="profile-panel-close"
              onClick={() => setShowProfile(false)}
            >
              ✕
            </button>

            {/* Avatar + photo upload */}
            <div className="pp-avatar-wrap">
              <div
                className="pp-avatar"
                onClick={() => fileInputRef.current?.click()}
                title="Change photo"
              >
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="pp-avatar-img" />
                ) : (
                  <span className="pp-avatar-letter">{avatarLetter}</span>
                )}
                <div className="pp-avatar-overlay">
                  {uploadingPhoto ? "..." : "📷"}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />
              <p className="pp-change-photo">
                {uploadingPhoto ? "Uploading…" : "Change photo"}
              </p>
            </div>

            {profileData ? (
              <>
                <h2 className="pp-username">@{profileData.username}</h2>

                {profileData.bio && (
                  <p className="pp-bio">{profileData.bio}</p>
                )}

                <div className="pp-section-label">Favorite Songs</div>
                <ul className="pp-songs">
                  {profileData.songs?.map((song, i) => (
                    <li key={i} className="pp-song-row">
                      <span className="pp-song-num">{i + 1}</span>
                      <span className="pp-song-text">{song}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="pp-loading">Loading…</p>
            )}
          </div>
        </>
      )}

      {/* ── Profile panel styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap');

        /* Avatar button */
        .profile-avatar-btn {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 10;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 2px solid rgba(201,168,76,0.7);
          background: #2a2416;
          cursor: pointer;
          padding: 0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.15);
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        .profile-avatar-btn:hover {
          border-color: #c9a84c;
          box-shadow: 0 2px 18px rgba(0,0,0,0.6), 0 0 14px rgba(201,168,76,0.25);
          transform: scale(1.06);
        }
        .profile-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        .profile-avatar-letter {
          font-family: 'Playfair Display', serif;
          font-size: 1.2rem;
          font-weight: 700;
          color: #c9a84c;
          line-height: 1;
        }

        /* Backdrop */
        .profile-panel-backdrop {
          position: fixed;
          inset: 0;
          z-index: 20;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(2px);
        }

        /* Panel */
        .profile-panel {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 30;
          width: 300px;
          background: #1e1a10;
          border-right: 1px solid rgba(201,168,76,0.2);
          box-shadow: 4px 0 40px rgba(0,0,0,0.7);
          padding: 2rem 1.5rem 2rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0;
          animation: slideInLeft 0.25s ease;
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }

        /* Gold top bar on panel */
        .profile-panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #c9a84c, transparent);
        }

        .profile-panel-close {
          position: absolute;
          top: 14px;
          right: 14px;
          background: none;
          border: none;
          color: #8a7a55;
          font-size: 1rem;
          cursor: pointer;
          line-height: 1;
          padding: 4px;
          transition: color 0.2s;
        }
        .profile-panel-close:hover { color: #c9a84c; }

        /* Avatar in panel */
        .pp-avatar-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1.25rem;
          margin-top: 0.5rem;
        }
        .pp-avatar {
          width: 86px;
          height: 86px;
          border-radius: 50%;
          border: 2px solid rgba(201,168,76,0.35);
          background: #2a2416;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          cursor: pointer;
          overflow: hidden;
          box-shadow: 0 0 24px rgba(201,168,76,0.15);
          transition: border-color 0.2s;
        }
        .pp-avatar:hover { border-color: rgba(201,168,76,0.7); }
        .pp-avatar:hover .pp-avatar-overlay { opacity: 1; }
        .pp-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .pp-avatar-letter {
          font-family: 'Playfair Display', serif;
          font-size: 2rem;
          font-weight: 700;
          color: #c9a84c;
        }
        .pp-avatar-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          opacity: 0;
          transition: opacity 0.2s;
          border-radius: 50%;
        }
        .pp-change-photo {
          margin-top: 0.5rem;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.72rem;
          color: #8a7a55;
          letter-spacing: 0.05em;
        }

        /* Username */
        .pp-username {
          font-family: 'Playfair Display', serif;
          font-size: 1.3rem;
          font-weight: 900;
          color: #ede8d8;
          text-align: center;
          margin-bottom: 0.6rem;
          letter-spacing: -0.01em;
        }

        /* Bio */
        .pp-bio {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          font-weight: 300;
          color: #8a7a55;
          text-align: center;
          line-height: 1.6;
          margin-bottom: 1.5rem;
          padding: 0 0.25rem;
        }

        /* Section label */
        .pp-section-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #a07830;
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .pp-section-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(201,168,76,0.18);
        }

        /* Songs */
        .pp-songs {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .pp-song-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          background: #2a2416;
          border: 1px solid rgba(201,168,76,0.14);
          border-radius: 2px;
          padding: 0.55rem 0.75rem;
        }
        .pp-song-num {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 1px solid rgba(201,168,76,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-weight: 500;
          color: #c9a84c;
          flex-shrink: 0;
          font-family: 'DM Sans', sans-serif;
        }
        .pp-song-text {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem;
          font-weight: 300;
          color: #ede8d8;
          line-height: 1.3;
        }

        .pp-loading {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          color: #8a7a55;
          text-align: center;
          margin-top: 2rem;
        }
      `}</style>

      
      {showModal && (
        <DropSongModal
          onClose={() => setShowModal(false)}
          onDrop={handleDrop}
          drops={nearbyDrops}
          getCachedAura={getCachedAura}
          setCachedAura={setCachedAura}
        />
      )}
    </div>
  );
}

export default MapPage;