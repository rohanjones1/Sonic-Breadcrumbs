import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./MapPage.css";
import DropSongModal from "./DropSongModal";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function MapPage() {
  const mapContainer = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      zoom: 15,
    });

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;

      map.setCenter([longitude, latitude]);

      // Create the pulsing dot element
      const el = document.createElement("div");
      el.className = "user-location-dot";

      new mapboxgl.Marker(el).setLngLat([longitude, latitude]).addTo(map);
    });

    return () => map.remove();
  }, []);

  const [showModal, setShowModal] = useState(false);

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
        lat: latitude,
        lng: longitude,
        timestamp: new Date(),
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName,
      });

      setShowModal(false);
    });
  };

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map" />
      <button className="drop-button" onClick={() => setShowModal(true)}>
        + Drop a Song
      </button>
      {showModal && (
        <DropSongModal
          onClose={() => setShowModal(false)}
          onDrop={handleDrop}
        />
      )}
    </div>
  );
}

export default MapPage;
