import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const isResuming = location.state?.isResuming || false
  const routeSessionId = location.state?.sessionId || null
  const { 
    images, 
    photoIds,
    currentSessionId,
    detections, 
    selectedImageIndex,
    setDetections, 
    setSelectedImageIndex,
    removeDetection,
    setPhotoIds,
    setCurrentSessionId,
    resetWorkflow
  } = useWorkflowStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [detectionResults, setDetectionResults] = useState([]) // Raw API response
  const [loadedImages, setLoadedImages] = useState({}) // Loaded image objects
  const [boundingBoxPositions, setBoundingBoxPositions] = useState([]) // Scaled box positions for overlays
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [drawingBox, setDrawingBox] = useState(null) // {startX, startY, endX, endY}
  const [tempAnnotation, setTempAnnotation] = useState(null) // Drawn box waiting to be saved
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const hasRun = useRef(false)

  useEffect(() => {
    // Run only once on mount. 
    // In React 18 with StrictMode (which is enabled by default in Vite/Create React App), useEffect with empty dependency array [] runs twice in development to help catch bugs.
    if (hasRun.current) return
    hasRun.current = true
    
    const initializeDetection = async () => {
      if (photoIds.length > 0) {
        // New upload flow: run detection on current photo IDs.
        runDetection(routeSessionId || currentSessionId)
        return
      }

      const shouldTryResume = isResuming || !!routeSessionId || !!currentSessionId
      if (shouldTryResume) {
        // Session resume flow: load saved detections for selected/current session.
        try {
          const effectiveSessionId = routeSessionId || currentSessionId || null
          setIsLoading(true)
          const sessionData = await workflowService.getIncompleteSession(effectiveSessionId, true)
          if (sessionData?.session_id) {
            setCurrentSessionId(sessionData.session_id)
          }
          if (sessionData && sessionData.results && sessionData.results.length > 0) {
            await processDetectionResults(sessionData.results)
          } else {
            setDetectionResults([])
            setDetections([])
            setError('No detections found for this session.')
          }
        } catch (err) {
          setError('Failed to load incomplete session.')
          navigate('/upload')
        } finally {
          setIsLoading(false)
        }
      } else {
        navigate('/upload')
      }
    }
    
    initializeDetection()
  }, [])

  // Draw canvas when selected image or detections change
  useEffect(() => {
    if (detectionResults.length > 0 && canvasRef.current) {
      drawImageWithBoxes()
    }
  }, [selectedImageIndex, detectionResults, loadedImages, drawingBox, tempAnnotation])

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

  const runDetection = async (sessionId, { rerunDetection = false } = {}) => {
    setIsLoading(true)
    setError('')
    
    try {
      console.log('Running detection on photo IDs:', photoIds)
      const payload = { photoIds: rerunDetection ? [] : photoIds }
      if (sessionId) {
        payload.sessionId = sessionId
      }
      if (rerunDetection) {
        payload.rerunDetection = true
      }
      const response = await workflowService.detect(payload)
      console.log('Detection response:', response)
      if (response?.session_id) {
        setCurrentSessionId(response.session_id)
      }
      
      await processDetectionResults(response.results)
      
      // Clear photoIds after successful detection
      setPhotoIds([])
    } catch (err) {
      setError(err.response?.data?.message || 'Detection failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRunDetectionAgain = async () => {
    const targetSessionId = routeSessionId || currentSessionId
    if (!targetSessionId) {
      setError('No workflow session selected.')
      return
    }

    const confirmed = window.confirm(
      'Running detection again will remove all existing detections, manual annotations, and associated identifications for this session. Do you want to continue?'
    )
    if (!confirmed) {
      return
    }

    await runDetection(targetSessionId, { rerunDetection: true })
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
    
    // Draw active drawing box
    if (drawingBox) {
      const x = Math.min(drawingBox.startX, drawingBox.endX)
      const y = Math.min(drawingBox.startY, drawingBox.endY)
      const w = Math.abs(drawingBox.endX - drawingBox.startX)
      const h = Math.abs(drawingBox.endY - drawingBox.startY)
      
      ctx.strokeStyle = '#EAB308'
      ctx.lineWidth = 3
      ctx.setLineDash([5, 5])
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])
    }
    
    // Draw temporary annotation (after mouse up, before save)
    if (tempAnnotation) {
      const x = tempAnnotation.x_min * scaleX
      const y = tempAnnotation.y_min * scaleY
      const w = tempAnnotation.width * scaleX
      const h = tempAnnotation.height * scaleY
      
      ctx.strokeStyle = '#EAB308'
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, w, h)
      
      const label = 'RabbitFish 100.0%'
      ctx.font = '14px sans-serif'
      const textMetrics = ctx.measureText(label)
      const textHeight = 20
      
      ctx.fillStyle = '#EAB308'
      ctx.fillRect(x, y - textHeight, textMetrics.width + 10, textHeight)
      ctx.fillStyle = 'white'
      ctx.fillText(label, x + 5, y - 5)
    }
    
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
    const preservedSessionId = currentSessionId
    resetWorkflow()
    if (preservedSessionId) {
      setCurrentSessionId(preservedSessionId)
    }
    navigate('/upload')
  }

  const handleMouseDown = (e) => {
    if (!isDrawingMode || tempAnnotation) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setDrawingBox({ startX: x, startY: y, endX: x, endY: y })
  }

  const handleMouseMove = (e) => {
    if (!drawingBox) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setDrawingBox({ ...drawingBox, endX: x, endY: y })
  }

  const handleMouseUp = () => {
    if (!drawingBox) return
    
    const currentResult = getCurrentImageResult()
    const img = loadedImages[currentResult.image_path]
    const canvas = canvasRef.current
    const scaleX = img.width / canvas.width
    const scaleY = img.height / canvas.height
    
    // Convert canvas coords to image coords
    const x_min = Math.min(drawingBox.startX, drawingBox.endX) * scaleX
    const y_min = Math.min(drawingBox.startY, drawingBox.endY) * scaleY
    const width = Math.abs(drawingBox.endX - drawingBox.startX) * scaleX
    const height = Math.abs(drawingBox.endY - drawingBox.startY) * scaleY
    
    // Create temp annotation
    setTempAnnotation({
      x_min: Math.round(x_min),
      y_min: Math.round(y_min),
      width: Math.round(width),
      height: Math.round(height),
      class_name: 0,
      confidence: 1.0
    })
    
    setDrawingBox(null)
    setIsDrawingMode(false)
  }

  const handleSaveAnnotation = async () => {
    if (!tempAnnotation) return
    
    try {
      const currentResult = getCurrentImageResult()
      const upload_id = currentResult.user_upload_id || currentResult.id
      
      const response = await workflowService.saveManualAnnotation({
        user_upload_id: upload_id,
        sessionId: currentSessionId,
        ...tempAnnotation
      })
      
      // Add annotation_id and add to detections
      const newAnnotation = { ...tempAnnotation, annotation_id: response.annotation_id }
      
      // Update detectionResults and local store
      const updatedResults = detectionResults.map(result => {
        if (result.image_path === currentResult.image_path) {
          return {
            ...result,
            detections: [...result.detections, newAnnotation]
          }
        }
        return result
      })
      
      setDetectionResults(updatedResults)
      
      // Also update the store
      const groupedDetections = groupDetectionsByImage(updatedResults)
      setDetections(groupedDetections)
      
      setTempAnnotation(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save annotation')
    }
  }

  const handleDeleteImage = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete everything of this image from the system?"
    )
    
    if (!confirmed) return
    
    const currentResult = getCurrentImageResult()
    if (!currentResult) {
      setError('No image is available to delete.')
      return
    }
    const uploadId = currentResult.user_upload_id || currentResult.id
    
    try {
      await workflowService.deleteImage(uploadId)
      
      // Remove image from local state
      const updatedResults = detectionResults.filter(
        r => (r.user_upload_id || r.id) !== uploadId
      )
      
      // If no images left, use existing resetWorkflow() and navigate
      if (updatedResults.length === 0) {
        resetWorkflow()
        navigate('/upload')
      } else {
        setDetectionResults(updatedResults)
        
        // Update workflow store using existing setDetections()
        const groupedDetections = groupDetectionsByImage(updatedResults)
        setDetections(groupedDetections)
        
        // Adjust selectedImageIndex if needed
        const uniquePaths = [...new Set(updatedResults.map(r => r.image_path))]
        if (selectedImageIndex >= uniquePaths.length) {
          setSelectedImageIndex(0)
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete image')
    }
  }

  // Get unique image paths for sidebar
  const getUniqueImagePaths = () => {
    return [...new Set(detectionResults.map(r => r.image_path))]
  }

  if (isLoading) {
    return (
      <div className="page-shell">
        <div className="page-container workflow-layout">
          <WorkflowStepper currentStep={2} />
          <div className="workflow-main flex min-h-[320px] items-center justify-center">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-4 text-gray-600">Running RabbitFish detection...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentDetections = detections[selectedImageIndex] || []
  const uniqueImagePaths = getUniqueImagePaths()

  return (
    <div className="page-shell">
      <div className="page-container workflow-layout">
        <WorkflowStepper currentStep={2} />
        <div className="workflow-main">
          <div className="w-full">
          <h1 className="page-title mb-2">RabbitFish Detection</h1>
          <p className="page-subtitle mb-8">
            Review and verify detected RabbitFish instances
          </p>

          <div className="mb-6">
            <Button
              variant="danger"
              onClick={handleRunDetectionAgain}
              disabled={isLoading || !(routeSessionId || currentSessionId)}
            >
              Run Detection Again
            </Button>
          </div>

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
                  <h2 className="text-lg font-semibold">Uploaded Images</h2>
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
                  {/* Draw Mode Toggle */}
                  <div className="mb-4">
                    <Button
                      variant={isDrawingMode ? "primary" : "outline"}
                      onClick={() => {
                        setIsDrawingMode(!isDrawingMode)
                        if (tempAnnotation) setTempAnnotation(null)
                      }}
                      disabled={tempAnnotation !== null || !getCurrentImageResult()}
                    >
                      {isDrawingMode ? 'Drawing Mode Enabled' : 'Draw Annotation'}
                    </Button>
                    {isDrawingMode && (
                      <span className="ml-3 text-sm text-gray-600">
                        Click and drag on the image to draw a bounding box
                      </span>
                    )}
                  </div>

                  {/* Main Image with Bounding Boxes */}
                  <div ref={containerRef} className="bg-gray-900 rounded-lg mb-6 relative">
                    {/* Delete Image Button */}
                    {getCurrentImageResult() && (
                      <button
                        onClick={handleDeleteImage}
                        className="absolute -top-3 -right-3 z-10 rounded-full border border-red-300 bg-white p-2 text-red-700 shadow-sm transition-colors hover:bg-red-50"
                        title="Delete this image and all its annotations"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                    
                    {getCurrentImageResult() && loadedImages[getCurrentImageResult().image_path] ? (
                      <>
                        <canvas 
                          ref={canvasRef}
                          className="w-full rounded-lg"                          onMouseDown={handleMouseDown}
                          onMouseMove={handleMouseMove}
                          onMouseUp={handleMouseUp}
                          style={{ cursor: isDrawingMode ? 'crosshair' : 'default' }}                        />
                        {/* Overlay delete buttons on bounding boxes */}
                        {boundingBoxPositions.map((box, index) => (
                          <button
                            key={index}
                            onClick={() => handleDeleteDetection(box.originalIndex)}
                            className="absolute rounded-full border border-red-300 bg-white p-1 text-red-700 shadow-sm transition-colors hover:bg-red-50"
                            style={{
                              left: `${box.x + box.width - 12}px`,
                              top: `${box.y - 12}px`,
                            }}
                            title="Delete detection"
                          >
                            <Trash2 size={12} />
                          </button>
                        ))}
                        
                        {/* Save/Delete overlay for temp annotation */}
                        {tempAnnotation && (
                          <div className="absolute top-4 right-4 flex gap-2">
                            <Button
                              variant="primary"
                              onClick={handleSaveAnnotation}
                            >
                              Save Annotation
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => setTempAnnotation(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="aspect-video flex items-center justify-center">
                        <p className="text-white">No detections available for this session.</p>
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
    </div>
  )
}

export default Detection
