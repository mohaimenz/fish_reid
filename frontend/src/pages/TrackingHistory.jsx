import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Image, Link2, MapIcon, X } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import Alert from '../components/ui/Alert'
import TrackingMap from '../components/TrackingMap'
import useWorkflowStore from '../store/workflowStore'
import workflowService from '../services/workflowService'
import { formatFishIdForDisplay } from '../utils/fishId'

const TrackingHistory = () => {
  const navigate = useNavigate()
  const { 
    selectedFishId,
    trackingHistory,
    setTrackingHistory,
    resetWorkflow 
  } = useWorkflowStore()
  
  const [activeView, setActiveView] = useState('map') // map, timeline, gallery, pair
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(null)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

  const resolveImageUrl = (relativePath) => {
    if (!relativePath) return ''
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath
    }
    const base = apiBaseUrl.replace(/\/+$/, '')
    const path = relativePath.replace(/^\/+/, '')
    return `${base}/${path}`
  }

  const galleryItems = trackingHistory?.images || []
  const trackedFishAlias =
    trackingHistory?.fishAlias ||
    trackingHistory?.fish_alias ||
    trackingHistory?.fishName ||
    trackingHistory?.fish_name ||
    null
  const selectedGalleryImage =
    selectedGalleryIndex === null ? null : galleryItems[selectedGalleryIndex] || null
  const pairSummary = trackingHistory?.pairSummary || trackingHistory?.pair_summary || []
  const pairTimeline = trackingHistory?.pairTimeline || trackingHistory?.pair_timeline || []
  const mapSightings = useMemo(() => {
    const rawSightings = Array.isArray(trackingHistory?.sightings) ? trackingHistory.sightings : []
    const normalized = rawSightings
      .map((sighting, index) => {
        const latitude = Number(sighting.latitude)
        const longitude = Number(sighting.longitude)
        const parsedDate = sighting.dateTime ? new Date(sighting.dateTime) : null
        const hasValidDate = parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime())
        return {
          ...sighting,
          latitude,
          longitude,
          _orderIndex: index,
          _dateValue: hasValidDate ? parsedDate.getTime() : null,
        }
      })
      .filter((sighting) => Number.isFinite(sighting.latitude) && Number.isFinite(sighting.longitude))

    normalized.sort((a, b) => {
      if (a._dateValue !== null && b._dateValue !== null) {
        return a._dateValue - b._dateValue
      }
      if (a._dateValue !== null) return -1
      if (b._dateValue !== null) return 1
      return a._orderIndex - b._orderIndex
    })

    return normalized
  }, [trackingHistory])

  useEffect(() => {
    if (!selectedFishId) {
      navigate('/fishes')
      return
    }
    
    fetchTrackingHistory()
  }, [selectedFishId])

  const fetchTrackingHistory = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await workflowService.getTrackingHistory(selectedFishId)
      setTrackingHistory(response)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the sighting history.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewTracking = () => {
    resetWorkflow()
    navigate('/upload')
  }

  const closeGalleryModal = () => {
    setSelectedGalleryIndex(null)
  }

  if (isLoading) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-slate-600">Loading sighting history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Sighting History</h1>
            <p className="page-subtitle">
              Research record for{' '}
              {trackedFishAlias
                ? `${trackedFishAlias} (#${formatFishIdForDisplay(selectedFishId)})`
                : `fish #${formatFishIdForDisplay(selectedFishId)}`}
              .
            </p>
          </div>
          <Button onClick={handleNewTracking} variant="outline">
            Start a New Survey
          </Button>
        </div>

        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* View Selector */}
        <div className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveView('map')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeView === 'map'
                ? 'bg-primary-100 text-primary-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MapIcon size={16} />
            Map
          </button>
          <button
            type="button"
            onClick={() => setActiveView('timeline')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeView === 'timeline'
                ? 'bg-primary-100 text-primary-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar size={16} />
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setActiveView('gallery')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeView === 'gallery'
                ? 'bg-primary-100 text-primary-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Image size={16} />
            Gallery
          </button>
          <button
            type="button"
            onClick={() => setActiveView('pair')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeView === 'pair'
                ? 'bg-primary-100 text-primary-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Link2 size={16} />
            Pair History
          </button>
        </div>

        {/* Map View */}
        {activeView === 'map' && (
          <Card>
            <Card.Body>
              {mapSightings.length === 0 ? (
                <p className="py-8 text-center text-slate-500">
                  No geotagged sightings are available for the map yet.
                </p>
              ) : (
                <div className="space-y-3">
                  <TrackingMap sightings={mapSightings} />
                  <div className="rounded-md border border-blue-300 bg-blue-100 px-3 py-2">
                    <p className="text-sm text-blue-700">
                      Lines connect sightings from earliest to latest so you can follow the movement sequence over time.
                    </p>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Timeline View */}
        {activeView === 'timeline' && (
          <Card>
            <Card.Header>
              <h2 className="text-lg font-semibold">Sighting Timeline</h2>
            </Card.Header>
            <Card.Body>
              <div className="space-y-4">
                {trackingHistory?.sightings?.length > 0 ? (
                  trackingHistory.sightings.map((sighting, index) => (
                    <div key={index} className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary-500" />
                      <div className="flex-shrink-0 w-28 text-sm text-slate-600">
                        {sighting.dateTime ? new Date(sighting.dateTime).toLocaleDateString() : 'N/A'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">
                          Site coordinates: {sighting.latitude ?? 'N/A'}, {sighting.longitude ?? 'N/A'}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Confidence: {typeof sighting.confidence === 'number' ? `${(sighting.confidence * 100).toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-slate-500">
                    No sighting history is available yet.
                  </p>
                )}
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Photo Gallery View */}
        {activeView === 'gallery' && (
          <Card>
            <Card.Header>
              <h2 className="text-lg font-semibold">Photo Gallery</h2>
            </Card.Header>
            <Card.Body>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {galleryItems.length > 0 ? (
                  galleryItems.map((image, index) => {
                    const rawPath = image.imagePath || image.image_path
                    const src = resolveImageUrl(rawPath)
                    const sightingDate = image.dateTime ? new Date(image.dateTime).toLocaleString() : 'Unknown date'
                    return (
                      <button
                        type="button"
                        key={`${image.annotationId || index}-${index}`}
                        onClick={() => setSelectedGalleryIndex(index)}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-transparent bg-slate-100 text-left hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {src ? (
                          <img
                            src={src}
                            alt={`Fish sighting ${index + 1}`}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <p className="text-sm text-slate-500">No image path</p>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-xs text-white truncate">{sightingDate}</p>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <p className="col-span-full py-8 text-center text-slate-500">
                    No images are available yet.
                  </p>
                )}
              </div>
            </Card.Body>
          </Card>
        )}

        {activeView === 'pair' && (
          <Card>
            <Card.Header>
              <h2 className="text-lg font-semibold">Pair History Timeline</h2>
            </Card.Header>
            <Card.Body>
              {pairTimeline.length === 0 ? (
                <p className="py-8 text-center text-slate-500">
                  No confirmed pair history is available yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {pairTimeline.map((entry, index) => {
                    const pairFishId = entry?.pairFishId || entry?.pair_fish_id
                    const pairFishAlias = entry?.pairFishAlias || entry?.pair_fish_alias
                    const dateSeen = entry?.dateSeen || entry?.date_seen
                    const siteName = entry?.siteName || entry?.site_name
                    const sessionId = entry?.sessionId || entry?.session_id

                    return (
                      <div
                        key={`${pairFishId || 'pair'}-${sessionId || 'session'}-${index}`}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <p className="font-semibold text-slate-900">
                          Partner:{' '}
                          {pairFishId
                            ? pairFishAlias
                              ? `${pairFishAlias} (#${formatFishIdForDisplay(pairFishId)})`
                              : `Fish #${formatFishIdForDisplay(pairFishId)}`
                            : 'Unknown fish'}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Date: {dateSeen ? new Date(dateSeen).toLocaleString() : 'Unknown'}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Site: {siteName || 'Unknown'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Survey: {sessionId || 'Unknown'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}

              {pairSummary.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900">Partner Summary</h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {pairSummary.map((item) => {
                      const pairFishId = item?.pairFishId || item?.pair_fish_id
                      const pairFishAlias = item?.pairFishAlias || item?.pair_fish_alias
                      const coSightings = item?.coSightings || item?.co_sightings || 0
                      const lastSeenAt = item?.lastSeenAt || item?.last_seen_at

                      if (!pairFishId) return null
                      return (
                        <div
                          key={pairFishId}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <p className="text-sm font-semibold text-slate-900">
                            {pairFishAlias || `Fish #${formatFishIdForDisplay(pairFishId)}`}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            {coSightings} confirmed pair sightings
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Last seen: {lastSeenAt ? new Date(lastSeenAt).toLocaleString() : 'Unknown'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        )}
      </div>

      {selectedGalleryImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[20px] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.10)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {trackedFishAlias
                    ? `${trackedFishAlias} (#${formatFishIdForDisplay(selectedFishId)})`
                    : `Fish ID: ${formatFishIdForDisplay(selectedFishId)}`}
                </p>
                <p className="mono-text text-xs text-slate-600">
                  {selectedGalleryImage.dateTime ? new Date(selectedGalleryImage.dateTime).toLocaleString() : 'Unknown date'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeGalleryModal}
                className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex h-[70vh] items-center justify-center bg-slate-800">
              {(selectedGalleryImage.imagePath || selectedGalleryImage.image_path) ? (
                <img
                  src={resolveImageUrl(selectedGalleryImage.imagePath || selectedGalleryImage.image_path)}
                  alt="Selected fish sighting"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <p className="text-sm text-slate-200">No image available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrackingHistory
