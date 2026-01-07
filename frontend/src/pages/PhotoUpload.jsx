import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Calendar, Upload as UploadIcon, X } from 'lucide-react'
import WorkflowStepper from '../components/WorkflowStepper'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import Alert from '../components/ui/Alert'
import useWorkflowStore from '../store/workflowStore'
import workflowService from '../services/workflowService'

const PhotoUpload = () => {
  const navigate = useNavigate()
  const { images, metadata, setImages, setMetadata, updateMetadata } = useWorkflowStore()
  
  const [previews, setPreviews] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    
    // Create previews
    const newPreviews = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    }))
    
    setPreviews(prev => [...prev, ...newPreviews])
    setImages([...images, ...files])
  }

  const removeImage = (index) => {
    URL.revokeObjectURL(previews[index].url)
    setPreviews(prev => prev.filter((_, i) => i !== index))
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
  }

  const handleMapClick = (lat, lng) => {
    updateMetadata('latitude', lat)
    updateMetadata('longitude', lng)
  }

  const handleSubmit = async () => {
    setError('')
    
    // Validation
    if (images.length === 0) {
      setError('Please upload at least one image')
      return
    }
    
    if (!metadata.latitude || !metadata.longitude) {
      setError('Please provide location coordinates')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Create form data
      const formData = new FormData()
      images.forEach((image, index) => {
        formData.append('images', image)
      })
      formData.append('latitude', metadata.latitude)
      formData.append('longitude', metadata.longitude)
      formData.append('dateTime', metadata.dateTime)
      
      // Submit to API
      const data = await workflowService.uploadImages(formData)
      console.log('Upload successful:', data)
      if(data.uploaded_photo_ids) {
        // Store uploaded photo IDs if needed
        useWorkflowStore.getState().setPhotoIds(data.uploaded_photo_ids)
      }
      // Navigate to detection
      navigate('/detection')
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <WorkflowStepper currentStep={1} />
      
      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Photo Upload</h1>
          <p className="text-gray-600 mb-8">
            Upload underwater images and provide location metadata
          </p>

          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div>
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-semibold">Upload Images</h2>
                </Card.Header>
                <Card.Body>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <UploadIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-700 font-medium mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-gray-500">
                        PNG, JPG or JPEG (no size limit)
                      </p>
                    </label>
                  </div>

                  {/* Image Previews */}
                  {previews.length > 0 && (
                    <div className="mt-6 grid grid-cols-3 gap-4">
                      {previews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview.url}
                            alt={preview.name}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>

            {/* Metadata Section */}
            <div>
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-semibold">Location & Time</h2>
                </Card.Header>
                <Card.Body className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Latitude"
                      type="number"
                      step="any"
                      value={metadata.latitude}
                      onChange={(e) => updateMetadata('latitude', e.target.value)}
                      icon={<MapPin size={16} />}
                      required
                    />
                    <Input
                      label="Longitude"
                      type="number"
                      step="any"
                      value={metadata.longitude}
                      onChange={(e) => updateMetadata('longitude', e.target.value)}
                      icon={<MapPin size={16} />}
                      required
                    />
                  </div>

                  <Input
                    label="Date & Time"
                    type="datetime-local"
                    value={metadata.dateTime.slice(0, 16)}
                    onChange={(e) => updateMetadata('dateTime', e.target.value)}
                    icon={<Calendar size={16} />}
                    required
                  />

                  {/* Map Placeholder */}
                  <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">
                      Interactive Map (Leaflet integration)
                    </p>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end space-x-4">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || images.length === 0}
            >
              {isSubmitting ? 'Uploading...' : 'Go to Detection'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhotoUpload
