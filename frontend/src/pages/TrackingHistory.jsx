import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Image, MapIcon, X } from 'lucide-react'
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
  
  const [activeView, setActiveView] = useState('map') // map, timeline, gallery
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
  const selectedGalleryImage =
    selectedGalleryIndex === null ? null : galleryItems[selectedGalleryIndex] || null
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
      setError(err.response?.data?.message || 'Failed to load tracking history.')
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading tracking history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Tracking History
            </h1>
            <p className="text-gray-600">
              Historical observations of RabbitFish ID: {formatFishIdForDisplay(selectedFishId)}
            </p>
          </div>
          <Button onClick={handleNewTracking}>
            New Tracking
          </Button>
        </div>

        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* View Selector */}
        <div className="flex space-x-2 mb-6">
          <Button
            variant={activeView === 'map' ? 'primary' : 'outline'}
            onClick={() => setActiveView('map')}
            icon={<MapIcon size={16} />}
          >
            Map View
          </Button>
          <Button
            variant={activeView === 'timeline' ? 'primary' : 'outline'}
            onClick={() => setActiveView('timeline')}
            icon={<Calendar size={16} />}
          >
            Timeline
          </Button>
          <Button
            variant={activeView === 'gallery' ? 'primary' : 'outline'}
            onClick={() => setActiveView('gallery')}
            icon={<Image size={16} />}
          >
            Photo Gallery
          </Button>
        </div>

        {/* Map View */}
        {activeView === 'map' && (
          <Card>
            <Card.Body>
              {mapSightings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No geotagged sightings available for map view.
                </p>
              ) : (
                <div className="space-y-3">
                  <TrackingMap sightings={mapSightings} />
                  <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2">
                    <p className="text-sm text-blue-900">
                      Directed graph view: lines connect sightings from earliest to latest, and arrows show direction of movement.
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
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-24 text-sm text-gray-600">
                        {sighting.dateTime ? new Date(sighting.dateTime).toLocaleDateString() : 'N/A'}
                      </div>
                      <div className="flex-1 ml-4 pb-8 border-l-2 border-gray-200 pl-4">
                        <p className="font-medium text-gray-900">
                          Location: {sighting.latitude ?? 'N/A'}, {sighting.longitude ?? 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Confidence: {typeof sighting.confidence === 'number' ? `${(sighting.confidence * 100).toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No sighting history available
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
                        className="group aspect-square bg-gray-200 rounded-lg overflow-hidden relative text-left border border-transparent hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {src ? (
                          <img
                            src={src}
                            alt={`Fish sighting ${index + 1}`}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <p className="text-sm text-gray-500">No image path</p>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-xs text-white truncate">{sightingDate}</p>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <p className="col-span-full text-center text-gray-500 py-8">
                    No images available
                  </p>
                )}
              </div>
            </Card.Body>
          </Card>
        )}
      </div>

      {selectedGalleryImage && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Fish ID: {formatFishIdForDisplay(selectedFishId)}
                </p>
                <p className="text-xs text-gray-600">
                  {selectedGalleryImage.dateTime ? new Date(selectedGalleryImage.dateTime).toLocaleString() : 'Unknown date'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeGalleryModal}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="bg-gray-900 h-[70vh] flex items-center justify-center">
              {(selectedGalleryImage.imagePath || selectedGalleryImage.image_path) ? (
                <img
                  src={resolveImageUrl(selectedGalleryImage.imagePath || selectedGalleryImage.image_path)}
                  alt="Selected fish sighting"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <p className="text-gray-200 text-sm">No image available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrackingHistory
