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

// function getDistance(lat1, lng1, lat2, lng2) {
//   const R = 6371000; // Earth radius in meters
//   const dLat = ((lat2 - lat1) * Math.PI) / 180;
//   const dLng = ((lng2 - lng1) * Math.PI) / 180;
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos((lat1 * Math.PI) / 180) *
//       Math.cos((lat2 * Math.PI) / 180) *
//       Math.sin(dLng / 2) *
//       Math.sin(dLng / 2);
//   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

function MapPage() {
  const mapContainer = useRef(null);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

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
