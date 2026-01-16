import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import WorkflowStepper from '../components/WorkflowStepper'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import Alert from '../components/ui/Alert'
import useWorkflowStore from '../store/workflowStore'
import workflowService from '../services/workflowService'

const Detection = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isResuming = location.state?.isResuming || false
  const { 
    images, 
    photoIds,
    detections, 
    selectedImageIndex,
    setDetections, 
    setSelectedImageIndex,
    removeDetection,
    setPhotoIds,
    resetWorkflow
  } = useWorkflowStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [detectionResults, setDetectionResults] = useState([]) // Raw API response
  const [loadedImages, setLoadedImages] = useState({}) // Loaded image objects
  const [boundingBoxPositions, setBoundingBoxPositions] = useState([]) // Scaled box positions for overlays
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const hasRun = useRef(false)

  useEffect(() => {
    // Run only once on mount. 
    // In React 18 with StrictMode (which is enabled by default in Vite/Create React App), useEffect with empty dependency array [] runs twice in development to help catch bugs.
    if (hasRun.current) return
    hasRun.current = true
    
    const initializeDetection = async () => {
      // Guard: Unusual access - no new uploads and not resuming
      if (!isResuming && photoIds.length === 0) {
        navigate('/upload')
        return
      }

      if (isResuming) {
        // Load from DB
        try {
          setIsLoading(true)
          const sessionData = await workflowService.getIncompleteSession()
          if (sessionData && sessionData.results && sessionData.results.length > 0) {
            await processDetectionResults(sessionData.results)
          } else {
            setError('No incomplete session found')
            navigate('/upload')
          }
        } catch (err) {
          setError('Failed to load incomplete session')
          navigate('/upload')
        } finally {
          setIsLoading(false)
        }
      } else {
        // photoIds exist - run detection on new uploads
        runDetection()
      }
    }
    
    initializeDetection()
  }, [])

  // Draw canvas when selected image or detections change
  useEffect(() => {
    if (detectionResults.length > 0 && canvasRef.current) {
      drawImageWithBoxes()
    }
  }, [selectedImageIndex, detectionResults, loadedImages])

  // Process detection results (used by both normal and resume flows)
  const processDetectionResults = async (results) => {
    // Store raw results
    setDetectionResults(results)
    
    // Group detections by unique image_path for the store
    const groupedDetections = groupDetectionsByImage(results)
    setDetections(groupedDetections)
    
    // Load all images
    await loadImagesFromPaths(results)
  }

  const runDetection = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      console.log('Running detection on photo IDs:', photoIds)
      const response = await workflowService.detect({ photoIds })
      console.log('Detection response:', response)
      
      await processDetectionResults(response.results)
      
      // Clear photoIds after successful detection
      setPhotoIds([])
    } catch (err) {
      setError(err.response?.data?.message || 'Detection failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Group detections by unique image paths
  const groupDetectionsByImage = (results) => {
    const imageMap = new Map()
    
    results.forEach(result => {
      if (!imageMap.has(result.image_path)) {
        imageMap.set(result.image_path, [])
      }
      // Add all detections for this image
      result.detections.forEach(det => {
        imageMap.get(result.image_path).push(det)
      })
    })
    
    // Convert to array, removing duplicates
    return Array.from(imageMap.values()).map(dets => {
      // Remove duplicate detections based on coordinates
      const unique = []
      const seen = new Set()
      
      dets.forEach(det => {
        const key = `${det.x_min},${det.y_min},${det.width},${det.height}`
        if (!seen.has(key)) {
          seen.add(key)
          unique.push(det)
        }
      })
      
      return unique
    })
  }

  // Load images from server
  const loadImagesFromPaths = async (results) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    const imagePaths = [...new Set(results.map(r => r.image_path))] // Unique paths
    const loadedImgs = {}
    
    for (const path of imagePaths) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = `${baseURL}/${path}`
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            loadedImgs[path] = img
            resolve()
          }
          img.onerror = reject
        })
      } catch (err) {
        console.error(`Failed to load image: ${path}`, err)
      }
    }
    
    setLoadedImages(loadedImgs)
  }

  // Draw image with bounding boxes on canvas
  const drawImageWithBoxes = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const currentResult = getCurrentImageResult()
    if (!currentResult) return
    
    const img = loadedImages[currentResult.image_path]
    if (!img) return
    
    const ctx = canvas.getContext('2d')
    
    // Set canvas size to match container
    const container = canvas.parentElement
    const containerWidth = container.clientWidth
    const aspectRatio = img.height / img.width
    const canvasHeight = containerWidth * aspectRatio
    
    canvas.width = containerWidth
    canvas.height = canvasHeight
    
    // Calculate scale factors
    const scaleX = canvas.width / img.width
    const scaleY = canvas.height / img.height
    
    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    
    // Store scaled bounding box positions for overlay buttons
    const boxPositions = []
    
    // Draw bounding boxes (only for class_name === 0)
    currentResult.detections.filter(det => det.class_name === 0).forEach((det, index) => {
      const x = det.x_min * scaleX
      const y = det.y_min * scaleY
      const width = det.width * scaleX
      const height = det.height * scaleY
      
      // Store position for overlay button
      boxPositions.push({ x, y, width, height, originalIndex: currentResult.detections.indexOf(det) })
      
      // Green color for RabbitFish
      const color = '#10B981'
      
      // Draw rectangle
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, width, height)
      
      // Draw label background
      const label = `RabbitFish ${(det.confidence * 100).toFixed(1)}%`
      ctx.font = '14px sans-serif'
      const textMetrics = ctx.measureText(label)
      const textHeight = 20
      
      ctx.fillStyle = color
      ctx.fillRect(x, y - textHeight, textMetrics.width + 10, textHeight)
      
      // Draw label text
      ctx.fillStyle = 'white'
      ctx.fillText(label, x + 5, y - 5)
    })
    
    setBoundingBoxPositions(boxPositions)
  }

  // Get current image result based on selected index
  const getCurrentImageResult = () => {
    if (detectionResults.length === 0) return null
    
    // Get unique image paths
    const uniquePaths = [...new Set(detectionResults.map(r => r.image_path))]
    const currentPath = uniquePaths[selectedImageIndex]
    
    // Find the first result with this path (they all have same detections)
    return detectionResults.find(r => r.image_path === currentPath)
  }

  const handleDeleteDetection = async (detectionIndex) => {
    const currentResult = getCurrentImageResult()
    if (!currentResult || !currentResult.detections[detectionIndex]) return
    
    const detection = currentResult.detections[detectionIndex]
    const annotationId = detection.annotation_id
    
    if (!annotationId) {
      setError('Cannot delete detection: missing annotation ID')
      return
    }
    
    try {
      // Call API to delete annotation from database
      await workflowService.deleteBbox(annotationId)
      
      // Update local state after successful deletion
      removeDetection(selectedImageIndex, detectionIndex)
      
      // Also update local detectionResults
      const uniquePaths = [...new Set(detectionResults.map(r => r.image_path))]
      const currentPath = uniquePaths[selectedImageIndex]
      
      // Update all results with this image path
      const updatedResults = detectionResults.map(result => {
        if (result.image_path === currentPath) {
          return {
            ...result,
            detections: result.detections.filter((_, i) => i !== detectionIndex)
          }
        }
        return result
      })
      
      setDetectionResults(updatedResults)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete detection. Please try again.')
    }
  }

  const handleNext = () => {
    const totalDetections = detections.flat().length
    if (totalDetections === 0) {
      setError('At least one detection is required to continue')
      return
    }
    navigate('/identification')
  }

  const handleBackToUpload = () => {
    resetWorkflow()
    navigate('/upload')
  }

  // Get unique image paths for sidebar
  const getUniqueImagePaths = () => {
    return [...new Set(detectionResults.map(r => r.image_path))]
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
  const uniqueImagePaths = getUniqueImagePaths()

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
                  {uniqueImagePaths.map((path, index) => (
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
                        {detections[index]?.filter(d => d.class_name === 0).length || 0} detection(s)
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
                  <div ref={containerRef} className="bg-gray-900 rounded-lg mb-6 relative">
                    {getCurrentImageResult() && loadedImages[getCurrentImageResult().image_path] ? (
                      <>
                        <canvas 
                          ref={canvasRef}
                          className="w-full rounded-lg"
                        />
                        {/* Overlay delete buttons on bounding boxes */}
                        {boundingBoxPositions.map((box, index) => (
                          <button
                            key={index}
                            onClick={() => handleDeleteDetection(box.originalIndex)}
                            className="absolute bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-lg transition-colors"
                            style={{
                              left: `${box.x + box.width - 12}px`,
                              top: `${box.y - 12}px`,
                            }}
                            title="Delete detection"
                          >
                            <X size={12} />
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="aspect-video flex items-center justify-center">
                        <p className="text-white">Loading image...</p>
                      </div>
                    )}
                  </div>

                  {/* Detection Summary */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{currentDetections.filter(d => d.class_name === 0).length}</span> RabbitFish detected in this image
                    </p>
                  </div>
                </Card.Body>
              </Card>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleBackToUpload}
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
