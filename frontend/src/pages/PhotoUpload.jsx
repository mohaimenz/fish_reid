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

const PhotoUpload = () => {
  const navigate = useNavigate()
  const {
    images,
    metadata,
    currentSessionId,
    sessionHistory,
    setImages,
    setCurrentSessionId,
    setSessionHistory,
    updateMetadata
  } = useWorkflowStore()
  
  const [previews, setPreviews] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [sites, setSites] = useState([])
  const [selectedSiteId, setSelectedSiteId] = useState('')
  const [isLoadingSites, setIsLoadingSites] = useState(true)
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false)
  const [newSiteData, setNewSiteData] = useState({ name: '', lat: '', long: '' })
  const [isCreatingSite, setIsCreatingSite] = useState(false)
  const [siteFormError, setSiteFormError] = useState('')

  const refreshSessionHistory = async () => {
    try {
      setIsLoadingSessions(true)
      const response = await workflowService.getSessionHistory()
      setSessionHistory(response?.sessions || [])
    } catch (err) {
      console.error('Failed to load sessions:', err)
      setSessionHistory([])
    } finally {
      setIsLoadingSessions(false)
    }
  }

  useEffect(() => {
    refreshSessionHistory()
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
      if (currentSessionId) {
        formData.append('sessionId', currentSessionId)
      }
      
      // Submit to API
      const data = await workflowService.uploadImages(formData)
      console.log('Upload successful:', data)
      if (data?.session_id) {
        setCurrentSessionId(data.session_id)
      }
      if(data.uploaded_photo_ids) {
        // Store uploaded photo IDs if needed
        useWorkflowStore.getState().setPhotoIds(data.uploaded_photo_ids)
      }
      // Clear images and previews after successful upload
      previews.forEach(preview => URL.revokeObjectURL(preview.url))
      setPreviews([])
      setImages([])
      // Navigate to detection
      navigate('/detection', { state: { sessionId: data?.session_id || currentSessionId } })
      refreshSessionHistory()
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateSession = async () => {
    setError('')
    setIsCreatingSession(true)
    try {
      const response = await workflowService.createSession({ siteId: selectedSiteId || null })
      const newSessionId = response?.session_id
      if (!newSessionId) {
        throw new Error('Session was created but no session ID was returned.')
      }
      setCurrentSessionId(newSessionId)
      await refreshSessionHistory()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create session.')
    } finally {
      setIsCreatingSession(false)
    }
  }

  const handleResumeSession = (session) => {
    const sessionId = session?.id
    if (!sessionId) {
      return
    }

    setCurrentSessionId(sessionId)

    if (session.current_step === 'upload') {
      navigate('/upload')
      return
    }

    if (session.current_step === 'pair_matching' || session.current_step === 'tracking' || session.status === 'completed') {
      navigate('/pair-matching')
      return
    }

    if (session.current_step === 'identification') {
      navigate('/identification')
      return
    }

    navigate('/detection', { state: { isResuming: true, sessionId } })
  }

  const handleUseSessionForUpload = (sessionId) => {
    setCurrentSessionId(sessionId)
    setError('')
  }

  const handleDiscardSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to discard unfinished work for this session?')) {
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const response = await workflowService.discardUnidentifiedAnnotations(sessionId)
      console.log('Discard successful:', response)
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null)
      }
      
      // Clear local previews and revoke URLs to prevent memory leaks
      previews.forEach(preview => URL.revokeObjectURL(preview.url))
      setPreviews([])
      await refreshSessionHistory()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to discard session. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-shell">
      <div className="page-container workflow-layout">
        <WorkflowStepper currentStep={1} />
        <div className="workflow-main">
          <div className="w-full">
          <h1 className="page-title mb-2">Photo Upload</h1>
          <p className="page-subtitle mb-8">
            Upload underwater images and provide location metadata
          </p>

          <Card className="mb-6 bg-blue-50 border-blue-200">
            <Card.Header>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-blue-900">Session History</h3>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshSessionHistory}
                    disabled={isLoadingSessions}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCreateSession}
                    disabled={isCreatingSession}
                  >
                    {isCreatingSession ? 'Creating...' : 'Create New Session'}
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {currentSessionId && (
                <p className="text-sm text-blue-700 mb-4">
                  Active upload session: <span className="font-semibold">{currentSessionId}</span>
                </p>
              )}
              {isLoadingSessions ? (
                <p className="text-sm text-blue-700">Loading sessions...</p>
              ) : sessionHistory.length === 0 ? (
                <p className="text-sm text-blue-700">No previous sessions found. Upload images to auto-create one.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {sessionHistory.map((session) => (
                    <div key={session.id} className="rounded-lg border border-blue-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {session.name || `Session ${session.id.slice(-6)}`}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Status: {session.status} | Step: {session.current_step}
                          </p>
                          <p className="text-xs text-gray-600">
                            Uploads: {session.stats?.uploads_count || 0} | Annotations: {session.stats?.annotations_count || 0} | Unfinished: {session.stats?.unfinished_count || 0}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUseSessionForUpload(session.id)}
                            disabled={isSubmitting}
                          >
                            Use for Upload
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleResumeSession(session)}
                            disabled={isSubmitting}
                            icon={<PlayCircle size={14} />}
                          >
                            Resume
                          </Button>
                          {session.status === 'in_progress' && (session.stats?.unfinished_count || 0) > 0 && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDiscardSession(session.id)}
                              disabled={isSubmitting}
                            >
                              Discard
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>

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
                            className="absolute top-1 right-1 rounded-full border border-red-300 bg-white p-1 text-red-700 opacity-0 transition-opacity group-hover:opacity-100"
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
                    Add Site
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
