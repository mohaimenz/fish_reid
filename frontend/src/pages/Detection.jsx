import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import WorkflowStepper from '../components/WorkflowStepper'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import Alert from '../components/ui/Alert'
import useWorkflowStore from '../store/workflowStore'
import workflowService from '../services/workflowService'

const Detection = () => {
  const navigate = useNavigate()
  const { 
    images, 
    photoIds,
    detections, 
    selectedImageIndex,
    setDetections, 
    setSelectedImageIndex,
    removeDetection 
  } = useWorkflowStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (photoIds.length === 0) {
      navigate('/upload')
      return
    }
    
    runDetection()
  }, [])

  const runDetection = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      console.log('Running detection on photo IDs:', photoIds)
      const response = await workflowService.detect({ photoIds })
      setDetections(response.detections)
    } catch (err) {
      setError(err.response?.data?.message || 'Detection failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDetection = (detectionIndex) => {
    removeDetection(selectedImageIndex, detectionIndex)
  }

  const handleNext = () => {
    const totalDetections = detections.flat().length
    if (totalDetections === 0) {
      setError('At least one detection is required to continue')
      return
    }
    navigate('/identification')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <WorkflowStepper currentStep={2} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Running RabbitFish detection...</p>
          </div>
        </div>
      </div>
    )
  }

  const currentDetections = detections[selectedImageIndex] || []

  return (
    <div className="flex min-h-screen bg-gray-50">
      <WorkflowStepper currentStep={2} />
      
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">RabbitFish Detection</h1>
          <p className="text-gray-600 mb-8">
            Review and verify detected RabbitFish instances
          </p>

          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Image Thumbnails */}
            <div className="lg:col-span-1">
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-semibold">Images</h2>
                </Card.Header>
                <Card.Body className="space-y-2">
                  {images.map((_, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`
                        p-2 rounded-lg cursor-pointer transition-colors
                        ${index === selectedImageIndex 
                          ? 'bg-primary-100 border-2 border-primary-500' 
                          : 'bg-gray-100 hover:bg-gray-200'
                        }
                      `}
                    >
                      <p className="text-sm font-medium">Image {index + 1}</p>
                      <p className="text-xs text-gray-600">
                        {detections[index]?.length || 0} detection(s)
                      </p>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </div>

            {/* Main Detection View */}
            <div className="lg:col-span-3">
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-semibold">
                    Image {selectedImageIndex + 1} - Detections
                  </h2>
                </Card.Header>
                <Card.Body>
                  {/* Main Image with Bounding Boxes */}
                  <div className="bg-gray-900 rounded-lg aspect-video mb-6 flex items-center justify-center">
                    <p className="text-white">
                      Image with bounding boxes (Canvas/SVG overlay)
                    </p>
                  </div>

                  {/* Detection List */}
                  <div className="space-y-3">
                    {currentDetections.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        No detections found in this image
                      </p>
                    ) : (
                      currentDetections.map((detection, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              RabbitFish #{index + 1}
                            </p>
                            <p className="text-sm text-gray-600">
                              Confidence: {(detection.confidence * 100).toFixed(1)}%
                            </p>
                          </div>
                          <Button
                            variant="danger"
                            size="sm"
                            icon={<Trash2 size={16} />}
                            onClick={() => handleDeleteDetection(index)}
                          >
                            Delete
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </Card.Body>
              </Card>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => navigate('/upload')}
                >
                  Back to Upload
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleNext}
                  disabled={detections.flat().length === 0}
                >
                  Go to Identification
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Detection
