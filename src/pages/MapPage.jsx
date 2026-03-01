import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./MapPage.css";
import DropSongModal from "./DropSongModal";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function MapPage() {
  const mapContainer = useRef(null);

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

  const handleDrop = (song) => {
    console.log("Dropped song:", song);
    setShowModal(false);
    // we'll save to Firebase here next
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
