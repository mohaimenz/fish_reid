import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon issue with Webpack
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Component to update map center and zoom when sites change
const MapUpdater = ({ center, zoom }) => {
  const map = useMap()
  useEffect(() => {
    if (center && zoom) {
      map.setView(center, zoom)
    }
  }, [center, zoom, map])
  return null
}

const MapSelector = ({ sites, onSiteSelect }) => {
  const [mapCenter, setMapCenter] = useState([0, 0])
  const [mapZoom, setMapZoom] = useState(2)

  useEffect(() => {
    if (sites && sites.length > 0) {
      // Center map on first site with adjustments for optimal viewing
      // Zoom level 13: Provides street-level detail where individual markers are clearly visible
      // Latitude offset -0.015: Shifts viewport down to ensure all sites are visible in frame
      setMapCenter([sites[0].lat - 0.015, sites[0].long])
      setMapZoom(13)
    }
  }, [sites])

  return (
    <div className="relative z-0 h-[400px] w-full overflow-hidden rounded-lg border border-primary-200 shadow-[0_8px_18px_rgba(20,105,117,0.08)]">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapUpdater center={mapCenter} zoom={mapZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {sites && sites.map(site => (
          <Marker
            key={site.id}
            position={[site.lat, site.long]}
            eventHandlers={{
              click: () => onSiteSelect(site)
            }}
          >
            <Tooltip direction="top" offset={[0, -20]} opacity={0.9}>
              {site.name}
            </Tooltip>
            
            <Popup>
              <div className="text-center">
                <strong>{site.name}</strong>
                <br />
                <span className="text-sm text-slate-600">
                  {site.lat.toFixed(4)}, {site.long.toFixed(4)}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default MapSelector
