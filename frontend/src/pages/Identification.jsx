import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import WorkflowStepper from '../components/WorkflowStepper'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import Alert from '../components/ui/Alert'
import useWorkflowStore from '../store/workflowStore'
import workflowService from '../services/workflowService'

const Identification = () => {
  const navigate = useNavigate()
  const { 
    detections,
    identifications,
    selectedFishId,
    setIdentifications,
    setSelectedFishId 
  } = useWorkflowStore()
  
  const [currentFishIndex, setCurrentFishIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const allDetections = detections.flat()

  useEffect(() => {
    if (allDetections.length === 0) {
      navigate('/detection')
      return
    }
    
    runIdentification()
  }, [])

  const runIdentification = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await workflowService.identify({ detections: allDetections })
      setIdentifications(response.identifications)
    } catch (err) {
      setError(err.response?.data?.message || 'Identification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectMatch = (matchId) => {
    setSelectedFishId(matchId)
  }

  const handleNext = () => {
    if (!selectedFishId) {
      setError('Please select a fish match to continue')
      return
    }
    navigate('/tracking')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <WorkflowStepper currentStep={3} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Running fish re-identification...</p>
          </div>
        </div>
      </div>
    )
  }

  const currentIdentification = identifications[currentFishIndex]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <WorkflowStepper currentStep={3} />
      
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            RabbitFish Identification
          </h1>
          <p className="text-gray-600 mb-8">
            Select or confirm the identity of detected fish
          </p>

          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Detected Fish Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-semibold">Detected Fish</h2>
                </Card.Header>
                <Card.Body className="space-y-2">
                  {allDetections.map((_, index) => (
                    <div
                      key={index}
                      onClick={() => setCurrentFishIndex(index)}
                      className={`
                        p-3 rounded-lg cursor-pointer transition-colors
                        ${index === currentFishIndex 
                          ? 'bg-primary-100 border-2 border-primary-500' 
                          : 'bg-gray-100 hover:bg-gray-200'
                        }
                      `}
                    >
                      <p className="text-sm font-medium">Fish #{index + 1}</p>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </div>

            {/* Main Identification View */}
            <div className="lg:col-span-3">
              {/* Current Fish */}
              <Card className="mb-6">
                <Card.Header>
                  <h2 className="text-lg font-semibold">
                    Current Fish - #{currentFishIndex + 1}
                  </h2>
                </Card.Header>
                <Card.Body>
                  <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center">
                    <p className="text-white">Detected fish image</p>
                  </div>
                </Card.Body>
              </Card>

              {/* Top Matches */}
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-semibold">Top 3 Matches</h2>
                </Card.Header>
                <Card.Body>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {currentIdentification?.matches?.slice(0, 3).map((match, index) => (
                      <div
                        key={index}
                        onClick={() => handleSelectMatch(match.fishId)}
                        className={`
                          relative border-2 rounded-lg p-4 cursor-pointer transition-all
                          ${selectedFishId === match.fishId
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-300 hover:border-primary-300'
                          }
                        `}
                      >
                        {selectedFishId === match.fishId && (
                          <div className="absolute top-2 right-2">
                            <div className="bg-primary-600 text-white rounded-full p-1">
                              <Check size={16} />
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-gray-200 aspect-square rounded-lg mb-3 flex items-center justify-center">
                          <p className="text-sm text-gray-500">Match {index + 1}</p>
                        </div>
                        
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          Fish ID: {match.fishId}
                        </p>
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${match.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">
                            {(match.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(!currentIdentification?.matches || currentIdentification.matches.length === 0) && (
                    <p className="text-center text-gray-500 py-8">
                      No matches found for this fish
                    </p>
                  )}
                </Card.Body>
              </Card>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => navigate('/detection')}
                >
                  Back to Detection
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleNext}
                  disabled={!selectedFishId}
                >
                  See Tracking History
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Identification
