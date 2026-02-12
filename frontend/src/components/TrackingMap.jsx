import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon issue with bundlers.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const DEFAULT_CENTER = [0, 0]
const DEFAULT_ZOOM = 2

const fitBoundsPadding = [24, 24]

const MapBoundsUpdater = ({ sightings }) => {
  const map = useMap()

  useEffect(() => {
    if (!Array.isArray(sightings) || sightings.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
      return
    }

    if (sightings.length === 1) {
      map.setView([sightings[0].latitude, sightings[0].longitude], 13)
      return
    }

    const bounds = L.latLngBounds(
      sightings.map((s) => [s.latitude, s.longitude])
    )
    map.fitBounds(bounds, { padding: fitBoundsPadding })
  }, [map, sightings])

  return null
}

const computeBearingDegrees = (from, to) => {
  const deltaLatitude = to.latitude - from.latitude
  const deltaLongitude = to.longitude - from.longitude
  const radians = Math.atan2(deltaLatitude, deltaLongitude)
  return (radians * 180) / Math.PI
}

const buildArrowIcon = (bearingDegrees) =>
  L.divIcon({
    className: 'tracking-direction-arrow',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="transform: rotate(${bearingDegrees}deg); color: #1d4ed8; font-size: 16px; font-weight: 700; line-height: 1;">➤</div>`,
  })

const formatDateLabel = (rawDate) => {
  if (!rawDate) return 'Unknown date'
  const parsed = new Date(rawDate)
  if (Number.isNaN(parsed.getTime())) return 'Unknown date'
  return parsed.toLocaleString()
}

const TrackingMap = ({ sightings = [] }) => {
  const directedSegments = useMemo(() => {
    if (!Array.isArray(sightings) || sightings.length < 2) return []
    const segments = []
    for (let idx = 0; idx < sightings.length - 1; idx += 1) {
      const from = sightings[idx]
      const to = sightings[idx + 1]
      const bearingDegrees = computeBearingDegrees(from, to)
      segments.push({
        id: `${from.annotationId || idx}-${to.annotationId || idx + 1}`,
        from,
        to,
        isMostRecentSegment: idx === sightings.length - 2,
        arrowPosition: [
          (from.latitude + to.latitude) / 2,
          (from.longitude + to.longitude) / 2,
        ],
        arrowIcon: buildArrowIcon(bearingDegrees),
      })
    }
    return segments
  }, [sightings])

  return (
    <div className="w-full h-[460px] rounded-lg overflow-hidden border border-gray-300">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <MapBoundsUpdater sightings={sightings} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {directedSegments.map((segment) => (
          <Polyline
            key={`line-${segment.id}`}
            positions={[
              [segment.from.latitude, segment.from.longitude],
              [segment.to.latitude, segment.to.longitude],
            ]}
            pathOptions={{
              color: segment.isMostRecentSegment ? '#1d4ed8' : '#3b82f6',
              weight: segment.isMostRecentSegment ? 5 : 4,
              opacity: 0.85,
            }}
          />
        ))}

        {directedSegments.map((segment) => (
          <Marker
            key={`arrow-${segment.id}`}
            position={segment.arrowPosition}
            icon={segment.arrowIcon}
            interactive={false}
            keyboard={false}
          />
        ))}

        {sightings.map((sighting, index) => {
          const isLatest = index === sightings.length - 1
          const label = isLatest ? `Latest (${index + 1})` : `Sighting ${index + 1}`
          return (
            <Marker
              key={`${sighting.annotationId || index}-${index}`}
              position={[sighting.latitude, sighting.longitude]}
            >
              <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
                {label}
              </Tooltip>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900 mb-1">{label}</p>
                  <p className="text-gray-700">{formatDateLabel(sighting.dateTime)}</p>
                  <p className="text-gray-700">
                    {sighting.latitude.toFixed(5)}, {sighting.longitude.toFixed(5)}
                  </p>
                  <p className="text-gray-700 mt-1">
                    Confidence:{' '}
                    {typeof sighting.confidence === 'number'
                      ? `${(sighting.confidence * 100).toFixed(1)}%`
                      : 'N/A'}
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

export default TrackingMap
