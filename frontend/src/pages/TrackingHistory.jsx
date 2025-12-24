import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Image, MapIcon } from 'lucide-react'
import WorkflowStepper from '../components/WorkflowStepper'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import Alert from '../components/ui/Alert'
import useWorkflowStore from '../store/workflowStore'
import workflowService from '../services/workflowService'

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

  useEffect(() => {
    if (!selectedFishId) {
      navigate('/identification')
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <WorkflowStepper currentStep={4} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Loading tracking history...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <WorkflowStepper currentStep={4} />
      
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Tracking History
              </h1>
              <p className="text-gray-600">
                Historical observations of RabbitFish ID: {selectedFishId}
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
              <Card.Body className="p-0">
                <div className="h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">
                    Interactive Map with Markers (Leaflet + OpenStreetMap)
                  </p>
                </div>
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
                  {trackingHistory?.sightings?.map((sighting, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-24 text-sm text-gray-600">
                        {new Date(sighting.dateTime).toLocaleDateString()}
                      </div>
                      <div className="flex-1 ml-4 pb-8 border-l-2 border-gray-200 pl-4">
                        <p className="font-medium text-gray-900">
                          Location: {sighting.latitude}, {sighting.longitude}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Confidence: {(sighting.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )) || (
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
                  {trackingHistory?.images?.map((image, index) => (
                    <div key={index} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                      <p className="text-sm text-gray-500">Image {index + 1}</p>
                    </div>
                  )) || (
                    <p className="col-span-full text-center text-gray-500 py-8">
                      No images available
                    </p>
                  )}
                </div>
              </Card.Body>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default TrackingHistory
