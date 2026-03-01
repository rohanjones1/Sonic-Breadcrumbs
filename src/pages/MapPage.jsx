import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import './MapPage.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function MapPage() {
  const mapContainer = useRef(null)

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      zoom: 15
    })

    navigator.geolocation.getCurrentPosition((pos) => {
      map.setCenter([pos.coords.longitude, pos.coords.latitude])
    })

    return () => map.remove()
  }, [])

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map" />
      <button className="drop-button">
        + Drop a Song
      </button>
    </div>
  )
}

export default MapPage