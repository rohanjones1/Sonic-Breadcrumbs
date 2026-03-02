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

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
    );
    const data = await res.json();
    return data.features?.find(f => f.place_type.includes("place"))?.text || null;
  } catch {
    return null;
  }
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
        map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15 });
      });
    };
    document.body.appendChild(recenterBtn);

    map.on("load", () => {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        userLocationRef.current = { latitude, longitude };
        map.setCenter([longitude, latitude]);

        const el = document.createElement("div");
        el.className = "user-location-dot";
        new mapboxgl.Marker(el).setLngLat([longitude, latitude]).addTo(map);

        const snapshot = await getDocs(collection(db, "drops"));
        snapshot.forEach((doc) => {
          const drop = doc.data();
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
              `)
            )
            .addTo(map);
        });
      });
    });

    return () => { map.remove(); recenterBtn.remove(); };
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
      const city = await reverseGeocode(latitude, longitude);

      await addDoc(collection(db, "drops"), {
        trackName: song.trackName,
        artistName: song.artistName,
        artwork: song.artworkUrl100,
        previewUrl: song.previewUrl,
        genre: song.primaryGenreName || "Unknown",
        lat: latitude,
        lng: longitude,
        city: city || null,
        timestamp: new Date(),
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName,
      });

      const key = getCacheKey();
      if (key) delete auraCache.current[key];

      setShowModal(false);
    });
  };

  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [photoURL, setPhotoURL] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

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
      <button className="drop-button" onClick={handleOpenModal}>+ Drop a Song</button>

      <button className="profile-avatar-btn" onClick={() => setShowProfile(true)} title="View profile">
        {photoURL ? (
          <img src={photoURL} alt="Profile" className="profile-avatar-img" />
        ) : (
          <span className="profile-avatar-letter">{avatarLetter}</span>
        )}
      </button>

      {showProfile && (
        <>
          <div className="profile-panel-backdrop" onClick={() => setShowProfile(false)} />
          <div className="profile-panel">
            <button className="profile-panel-close" onClick={() => setShowProfile(false)}>✕</button>
            <div className="pp-avatar-wrap">
              <div className="pp-avatar" onClick={() => fileInputRef.current?.click()} title="Change photo">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="pp-avatar-img" />
                ) : (
                  <span className="pp-avatar-letter">{avatarLetter}</span>
                )}
                <div className="pp-avatar-overlay">{uploadingPhoto ? "..." : "📷"}</div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
              <p className="pp-change-photo">{uploadingPhoto ? "Uploading…" : "Change photo"}</p>
            </div>

            {profileData ? (
              <>
                <h2 className="pp-username">@{profileData.username}</h2>
                {profileData.bio && <p className="pp-bio">{profileData.bio}</p>}
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