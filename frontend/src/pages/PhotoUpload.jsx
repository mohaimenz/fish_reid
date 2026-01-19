import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Calendar, Upload as UploadIcon, X, PlayCircle, Plus } from 'lucide-react'
import WorkflowStepper from '../components/WorkflowStepper'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import Alert from '../components/ui/Alert'
import MapSelector from '../components/MapSelector'
import useWorkflowStore from '../store/workflowStore'
import workflowService from '../services/workflowService'
import useAuthStore from '../store/authStore'

const PhotoUpload = () => {
  const navigate = useNavigate()
  const { images, metadata, setImages, setMetadata, updateMetadata, resetWorkflow } = useWorkflowStore()
  const { setAuth, user, token } = useAuthStore()
  
  const [previews, setPreviews] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [hasUnfinishedWork, setHasUnfinishedWork] = useState(false)
  const [isCheckingUnfinished, setIsCheckingUnfinished] = useState(true)
  const [sites, setSites] = useState([])
  const [selectedSiteId, setSelectedSiteId] = useState('')
  const [isLoadingSites, setIsLoadingSites] = useState(true)
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false)
  const [newSiteData, setNewSiteData] = useState({ name: '', lat: '', long: '' })
  const [isCreatingSite, setIsCreatingSite] = useState(false)
  const [siteFormError, setSiteFormError] = useState('')

  useEffect(() => {
    const checkUnfinishedWork = async () => {
      try {
        const response = await workflowService.checkUnfinishedWork()
        setHasUnfinishedWork(response?.has_unfinished_work || false)
      } catch (err) {
        // No unfinished work or error - don't show banner
        setHasUnfinishedWork(false)
      } finally {
        setIsCheckingUnfinished(false)
      }
    }
    
    checkUnfinishedWork()
  }, [])

  useEffect(() => {
    const loadSites = async () => {
      try {
        const response = await workflowService.getSites()
        setSites(response?.sites || [])
      } catch (err) {
        console.error('Failed to load sites:', err)
        setSites([])
      } finally {
        setIsLoadingSites(false)
      }
    }
    
    loadSites()
  }, [])

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

  const handleSiteSelect = (site) => {
    setSelectedSiteId(site.id)
    updateMetadata('latitude', site.lat.toString())
    updateMetadata('longitude', site.long.toString())
  }

  const resetSiteModal = () => {
    setNewSiteData({ name: '', lat: '', long: '' })
    setSiteFormError('')
    setIsAddSiteOpen(false)
  }

  const handleCreateSite = async () => {
    setSiteFormError('')

    if (!newSiteData.name || newSiteData.lat === '' || newSiteData.long === '') {
      setSiteFormError('Please fill in all fields')
      return
    }

    const parsedLat = parseFloat(newSiteData.lat)
    const parsedLong = parseFloat(newSiteData.long)

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLong)) {
      setSiteFormError('Latitude and longitude must be valid numbers')
      return
    }

    setIsCreatingSite(true)
    try {
      const response = await workflowService.createSite({
        name: newSiteData.name.trim(),
        lat: parsedLat,
        long: parsedLong,
      })

      const createdSiteId = response?.site_id || response?.id
      if (!createdSiteId) {
        throw new Error('Site was created but no ID was returned.')
      }

      const createdSite = {
        id: createdSiteId,
        name: newSiteData.name.trim(),
        lat: parsedLat,
        long: parsedLong,
      }

      setSites((prevSites) => [createdSite, ...prevSites])
      setIsLoadingSites(false)
      setSelectedSiteId(createdSiteId)
      updateMetadata('latitude', parsedLat.toString())
      updateMetadata('longitude', parsedLong.toString())
      resetSiteModal()
    } catch (err) {
      setSiteFormError(err.response?.data?.message || err.message || 'Failed to create site. Please try again.')
    } finally {
      setIsCreatingSite(false)
    }
  }

  const handleSubmit = async () => {
    setError('')
    
    // Validation
    if (images.length === 0) {
      setError('Please upload at least one image')
      return
    }
    
    if (!metadata.latitude || !metadata.longitude) {
      setError('Please select a site from the map')
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
      formData.append('siteId', selectedSiteId)
      
      // Submit to API
      const data = await workflowService.uploadImages(formData)
      console.log('Upload successful:', data)
      if(data.uploaded_photo_ids) {
        // Store uploaded photo IDs if needed
        useWorkflowStore.getState().setPhotoIds(data.uploaded_photo_ids)
      }
      // Clear images and previews after successful upload
      previews.forEach(preview => URL.revokeObjectURL(preview.url))
      setPreviews([])
      setImages([])
      // Navigate to detection
      navigate('/detection')
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResume = () => {
    navigate('/detection', { state: { isResuming: true } })
  }

  const handleDiscard = async () => {
    if (!window.confirm('Are you sure you want to delete all previous unfinished work?')) {
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const response = await workflowService.discardUnidentifiedAnnotations()
      console.log('Discard successful:', response)
      
      // Update local state instead of authStore
      setHasUnfinishedWork(false)
      
      // Clear workflow store completely
      resetWorkflow()
      
      // Clear local previews and revoke URLs to prevent memory leaks
      previews.forEach(preview => URL.revokeObjectURL(preview.url))
      setPreviews([])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to discard sessions. Please try again.')
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

          {hasUnfinishedWork && (
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <Card.Body>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <PlayCircle className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900">Resume Previous Session</h3>
                      <p className="text-sm text-blue-700">
                        You have unfinished work. Continue where you left off or discard it.
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={handleDiscard}
                      disabled={isSubmitting}
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      Discard
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleResume}
                      disabled={isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Resume
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">Select a site on the map to auto-fill coordinates.</p>
                      {selectedSiteId && (
                        <p className="text-xs text-gray-500 mt-1">Site selected and coordinates populated.</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddSiteOpen(true)}
                      icon={<Plus size={16} />}
                    >
                    Site
                    </Button>
                  </div>

                  {/* Map Section */}
                  <div className="mb-4">
                    {isLoadingSites ? (
                      <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
                        <p className="text-gray-500">Loading sites...</p>
                      </div>
                    ) : sites.length > 0 ? (
                      <MapSelector sites={sites} onSiteSelect={handleSiteSelect} />
                    ) : (
                      <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center border border-gray-300">
                        <p className="text-gray-500">No sites available. Please contact admin.</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Latitude"
                      type="number"
                      step="any"
                      value={metadata.latitude}
                      readOnly
                      icon={<MapPin size={16} />}
                      required
                    />
                    <Input
                      label="Longitude"
                      type="number"
                      step="any"
                      value={metadata.longitude}
                      readOnly
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
      {isAddSiteOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Site</h3>
              <button
                onClick={resetSiteModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <Input
                label="Site Name"
                value={newSiteData.name}
                onChange={(e) => setNewSiteData({ ...newSiteData, name: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Latitude"
                  type="number"
                  step="any"
                  value={newSiteData.lat}
                  onChange={(e) => setNewSiteData({ ...newSiteData, lat: e.target.value })}
                  required
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  value={newSiteData.long}
                  onChange={(e) => setNewSiteData({ ...newSiteData, long: e.target.value })}
                  required
                />
              </div>
              {siteFormError && (
                <Alert type="error">{siteFormError}</Alert>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <Button variant="ghost" onClick={resetSiteModal} disabled={isCreatingSite}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateSite}
                disabled={isCreatingSite}
              >
                {isCreatingSite ? 'Saving...' : 'Save Site'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhotoUpload
