import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./MapPage.css";
import DropSongModal from "./DropSongModal";
import { db } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
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

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      userLocationRef.current = { latitude, longitude };
      map.setCenter([longitude, latitude]);

      const el = document.createElement("div");
      el.className = "user-location-dot";
      new mapboxgl.Marker(el).setLngLat([longitude, latitude]).addTo(map);
    });

    return () => map.remove();
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

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map" />
      <button className="drop-button" onClick={handleOpenModal}>
        + Drop a Song
      </button>
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