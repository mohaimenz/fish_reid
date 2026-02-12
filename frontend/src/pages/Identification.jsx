import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, RefreshCcw, X } from 'lucide-react'
import WorkflowStepper from '../components/WorkflowStepper'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import Alert from '../components/ui/Alert'
import useWorkflowStore from '../store/workflowStore'
import workflowService from '../services/workflowService'
import { formatFishIdForDisplay } from '../utils/fishId'

const Identification = () => {
  const navigate = useNavigate()
  const { 
    detections,
    currentSessionId,
    identifications,
    setIdentifications,
    selectedFishId,
    setSelectedFishId 
  } = useWorkflowStore()
  
  const [currentFishIndex, setCurrentFishIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingIdentity, setIsCreatingIdentity] = useState(false)
  const [isAssigningIdentity, setIsAssigningIdentity] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [selectedFishByAnnotation, setSelectedFishByAnnotation] = useState({})
  const [previewMatch, setPreviewMatch] = useState(null)
  const [identifiedFishList, setIdentifiedFishList] = useState([])
  const [identifiedFishPage, setIdentifiedFishPage] = useState(1)
  const [identifiedFishTotalPages, setIdentifiedFishTotalPages] = useState(0)
  const [identifiedFishTotal, setIdentifiedFishTotal] = useState(0)
  const [isLoadingIdentifiedFish, setIsLoadingIdentifiedFish] = useState(false)
  const [identifiedFishError, setIdentifiedFishError] = useState('')
  const hasRun = useRef(false)

  const allDetections = detections.flat()
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

  const getAnnotationKey = (item, index) => {
    return item?.annotationId || item?.annotation_id || `fish-${index}`
  }

  const getSuggestedFishId = (item) => {
    return item?.suggestedFishId || item?.suggested_fish_id || null
  }

  const resolveImageUrl = (relativePath) => {
    if (!relativePath) return ''
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath
    }
    const base = apiBaseUrl.replace(/\/+$/, '')
    const path = relativePath.replace(/^\/+/, '')
    return `${base}/${path}`
  }

  const currentIdentification = identifications[currentFishIndex]
  const currentAnnotationKey = getAnnotationKey(currentIdentification, currentFishIndex)
  const currentSelectedFishId = selectedFishByAnnotation[currentAnnotationKey] || null
  const currentSuggestedFishId = getSuggestedFishId(currentIdentification)
  const currentMatches = currentIdentification?.matches || []
  const identifiedFishPageSize = 8
  const canGoToPreviousIdentifiedFishPage = identifiedFishPage > 1
  const canGoToNextIdentifiedFishPage =
    identifiedFishTotalPages > 0 && identifiedFishPage < identifiedFishTotalPages

  const formatDateLabel = (dateValue) => {
    if (!dateValue) return 'Unknown date'
    const parsedDate = new Date(dateValue)
    if (Number.isNaN(parsedDate.getTime())) return 'Unknown date'
    return parsedDate.toLocaleString()
  }

  const annotationIds = useMemo(
    () =>
      allDetections
        .map((det) => det.annotation_id || det.annotationId)
        .filter(Boolean),
    [allDetections]
  )

  const hydrateIdentifications = (incoming) => {
    setIdentifications(incoming)
    setCurrentFishIndex(0)

    const initialSelections = {}
    incoming.forEach((item, index) => {
      const key = getAnnotationKey(item, index)
      const assigned = item?.assignedFishId || item?.assigned_fish_id || null
      if (assigned) {
        initialSelections[key] = assigned
      }
    })
    setSelectedFishByAnnotation(initialSelections)
    if (incoming.length > 0) {
      const firstKey = getAnnotationKey(incoming[0], 0)
      setSelectedFishId(initialSelections[firstKey] || null)
    } else {
      setSelectedFishId(null)
    }
  }

  const loadSavedIdentifications = async () => {
    if (!currentSessionId) return false
    try {
      const response = await workflowService.getSessionIdentifications(currentSessionId)
      const saved = response?.identifications || []
      if (saved.length === 0) {
        return false
      }
      hydrateIdentifications(saved)
      return true
    } catch (err) {
      console.warn('Failed to load saved identifications:', err)
      return false
    }
  }

  const loadIdentifiedFishList = async (targetPage = identifiedFishPage) => {
    setIsLoadingIdentifiedFish(true)
    setIdentifiedFishError('')
    try {
      const response = await workflowService.getIdentifiedFishList({
        page: targetPage,
        pageSize: identifiedFishPageSize,
      })
      const fishItems = response?.fish || []
      const totalPages = Number(response?.totalPages ?? response?.total_pages ?? 0)
      const total = Number(response?.total ?? 0)

      setIdentifiedFishList(fishItems)
      setIdentifiedFishTotal(total)
      setIdentifiedFishTotalPages(totalPages)
    } catch (err) {
      setIdentifiedFishError(
        err.response?.data?.message || err.message || 'Failed to load identified fishes.'
      )
      setIdentifiedFishList([])
      setIdentifiedFishTotal(0)
      setIdentifiedFishTotalPages(0)
    } finally {
      setIsLoadingIdentifiedFish(false)
    }
  }

  const handleOpenFishTracking = (fishId) => {
    if (!fishId) return
    setSelectedFishId(fishId)
    navigate('/tracking')
  }

  const getEffectiveAnnotationIds = () => {
    if (annotationIds.length > 0) {
      return annotationIds
    }
    return identifications
      .map((item) => item?.annotationId || item?.annotation_id)
      .filter(Boolean)
  }

  const runIdentification = async ({ persistResults = true, reuseStoredEmbeddings = false } = {}) => {
    setIsLoading(true)
    setError('')
    
    try {
      const effectiveAnnotationIds = getEffectiveAnnotationIds()
      if (effectiveAnnotationIds.length === 0) {
        setError('No saved annotations available for identification.')
        setIdentifications([])
        return
      }

      const response = await workflowService.identify({
        annotationIds: effectiveAnnotationIds,
        sessionId: currentSessionId,
        persistResults,
        reuseStoredEmbeddings,
        topK: 3
      })

      const incoming = response?.identifications || []
      hydrateIdentifications(incoming)

      if (incoming.length === 0) {
        setError('No fish annotations were available for identification.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Identification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const initializeIdentification = async () => {
      const loadedFromSession = await loadSavedIdentifications()
      if (loadedFromSession) {
        return
      }

      if (allDetections.length === 0) {
        navigate('/detection', { state: { isResuming: true, sessionId: currentSessionId || null } })
        return
      }
      await runIdentification()
    }

    initializeIdentification()
  }, [allDetections.length, currentSessionId, navigate])

  useEffect(() => {
    loadIdentifiedFishList(identifiedFishPage)
  }, [identifiedFishPage])

  const handleSelectFish = (index) => {
    setCurrentFishIndex(index)
    const target = identifications[index]
    const key = getAnnotationKey(target, index)
    const fishId = selectedFishByAnnotation[key] || null
    setSelectedFishId(fishId)
    setError('')
    setInfoMessage('')
  }

  const getMatchImagePath = (match) => {
    return match?.thumbnailPath || match?.thumbnail_path || match?.imagePath || match?.image_path || ''
  }

  const handleOpenMatchPreview = (event, match) => {
    event.stopPropagation()
    const matchImagePath = getMatchImagePath(match)
    if (!matchImagePath) return
    const queryImagePath =
      currentIdentification?.queryCropPath || currentIdentification?.query_crop_path || ''

    setPreviewMatch({
      queryImageUrl: queryImagePath ? resolveImageUrl(queryImagePath) : '',
      matchImageUrl: resolveImageUrl(matchImagePath),
      fishId: match?.fishId || null,
      detectionIndex: currentFishIndex + 1,
    })
  }

  const handleAssignPositive = async (event, match) => {
    event.stopPropagation()
    if (!currentIdentification || !match?.fishId) {
      return
    }
    const annotationId =
      currentIdentification?.annotationId || currentIdentification?.annotation_id || null
    if (!annotationId) {
      setError('Unable to assign identity: missing annotation ID.')
      return
    }

    setIsAssigningIdentity(true)
    setError('')
    try {
      const response = await workflowService.assignIdentity({
        annotationId,
        fishId: match.fishId,
      })
      const assignedFishId = response?.fishId || response?.fish_id || match.fishId
      const key = getAnnotationKey(currentIdentification, currentFishIndex)
      setSelectedFishByAnnotation((prev) => ({
        ...prev,
        [key]: assignedFishId,
      }))
      setSelectedFishId(assignedFishId)
      setInfoMessage(
        `Detection #${currentFishIndex + 1} assigned to Fish ID ${formatFishIdForDisplay(assignedFishId)}.`
      )
      await loadIdentifiedFishList(identifiedFishPage)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign identity.')
    } finally {
      setIsAssigningIdentity(false)
    }
  }

  const handleCreateNewIdentity = async () => {
    if (!currentIdentification) {
      return
    }

    const annotationId =
      currentIdentification?.annotationId || currentIdentification?.annotation_id || null
    if (!annotationId) {
      setError('Unable to create identity: missing annotation ID.')
      return
    }

    setIsCreatingIdentity(true)
    setError('')
    try {
      const response = await workflowService.createNewIdentity(annotationId)
      const newFishId = response?.fishId || response?.fish_id
      if (!newFishId) {
        throw new Error('No fish ID was returned for the new identity.')
      }

      const key = getAnnotationKey(currentIdentification, currentFishIndex)
      setSelectedFishByAnnotation((prev) => ({
        ...prev,
        [key]: newFishId,
      }))
      setSelectedFishId(newFishId)
      setInfoMessage(
        `Detection #${currentFishIndex + 1} assigned to new identity ${formatFishIdForDisplay(newFishId)}. Please click "Re-Calculate Matches" to refresh suggestions from the updated fish table.`
      )
      await loadIdentifiedFishList(identifiedFishPage)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create new identity.')
    } finally {
      setIsCreatingIdentity(false)
    }
  }

  const handleNext = () => {
    if (!currentIdentification) {
      setError('No identification selected.')
      return
    }

    if (currentIdentification?.error) {
      setError('Current detection has an identification error. Please go back and adjust detections.')
      return
    }

    const selectedId = currentSelectedFishId
    if (!selectedId) {
      setError('No fish identity selected for the current detection.')
      return
    }

    if (currentSessionId) {
      workflowService.completeSession(currentSessionId).catch((completeErr) => {
        console.warn('Failed to mark session as completed:', completeErr)
      })
    }

    setSelectedFishId(selectedId)
    navigate('/tracking')
  }

  const handleReidentify = async () => {
    await runIdentification({
      persistResults: true,
      reuseStoredEmbeddings: true,
    })
    await loadIdentifiedFishList(identifiedFishPage)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <WorkflowStepper currentStep={3} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Re-calculating fish matches...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <WorkflowStepper currentStep={3} />
      
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                RabbitFish Identification
              </h1>
              <p className="text-gray-600">
                Select or confirm the identity of detected fish
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleReidentify}
              disabled={isLoading || identifications.length === 0}
              icon={<RefreshCcw size={16} />}
            >
              Re-Calculate Matches
            </Button>
          </div>

          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}
          {infoMessage && (
            <Alert type="info" className="mb-6" onClose={() => setInfoMessage('')}>
              {infoMessage}
            </Alert>
          )}

          <Card className="mb-6 bg-blue-50 border-blue-200">
            <Card.Header className="bg-blue-50">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-blue-900">Identified Fishes</h2>
                  <p className="text-sm text-blue-700">
                    Click a fish to open tracking history, photo gallery, and timeline.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-blue-700">
                    {identifiedFishTotal > 0
                      ? `Page ${identifiedFishPage} of ${identifiedFishTotalPages} (${identifiedFishTotal} total)`
                      : 'No identified fishes yet'}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => loadIdentifiedFishList(identifiedFishPage)}
                    disabled={isLoadingIdentifiedFish}
                  >
                    Refresh
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIdentifiedFishPage((prev) => Math.max(prev - 1, 1))}
                    disabled={!canGoToPreviousIdentifiedFishPage || isLoadingIdentifiedFish}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setIdentifiedFishPage((prev) =>
                        identifiedFishTotalPages > 0 ? Math.min(prev + 1, identifiedFishTotalPages) : prev
                      )
                    }
                    disabled={!canGoToNextIdentifiedFishPage || isLoadingIdentifiedFish}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {isLoadingIdentifiedFish ? (
                <div className="flex items-center justify-center py-6">
                  <Spinner size="md" />
                </div>
              ) : identifiedFishError ? (
                <p className="text-sm text-red-600">{identifiedFishError}</p>
              ) : identifiedFishList.length === 0 ? (
                <p className="text-sm text-blue-700">
                  No identities have been assigned yet. Assign a positive match or create a new identity.
                </p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {identifiedFishList.map((fish) => {
                    const fishId = fish?.fishId || fish?.fish_id || null
                    const previewPath = fish?.previewPath || fish?.preview_path || null
                    const sightingsCount = fish?.sightingsCount || fish?.sightings_count || 0
                    const lastIdentifiedAt = fish?.lastIdentifiedAt || fish?.last_identified_at || null
                    if (!fishId) {
                      return null
                    }
                    const isSelectedFish = selectedFishId === fishId
                    return (
                      <button
                        type="button"
                        key={fishId}
                        onClick={() => handleOpenFishTracking(fishId)}
                        className={`
                          min-w-[190px] rounded-lg border p-3 text-left transition-colors
                          ${isSelectedFish
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-blue-200 bg-white hover:border-primary-300'
                          }
                        `}
                      >
                        <div className="h-20 w-full rounded-md bg-gray-200 overflow-hidden mb-2 flex items-center justify-center">
                          {previewPath ? (
                            <img
                              src={resolveImageUrl(previewPath)}
                              alt={`Fish ${formatFishIdForDisplay(fishId)}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <p className="text-xs text-gray-500">No preview</p>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          Fish #{formatFishIdForDisplay(fishId)}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">{sightingsCount} sightings</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDateLabel(lastIdentifiedAt)}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </Card.Body>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Detected Fish Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-semibold">Detections</h2>
                </Card.Header>
                <Card.Body className="space-y-2">
                  {identifications.map((item, index) => {
                    const key = getAnnotationKey(item, index)
                    const selectedId = selectedFishByAnnotation[key] || null
                    const suggestedId = getSuggestedFishId(item)
                    return (
                    <div
                      key={key}
                      onClick={() => handleSelectFish(index)}
                      className={`
                        p-3 rounded-lg cursor-pointer transition-colors
                        ${index === currentFishIndex 
                          ? 'bg-primary-100 border-2 border-primary-500' 
                          : 'bg-gray-100 hover:bg-gray-200'
                        }
                      `}
                    >
                      <p className="text-sm font-medium">Detection #{index + 1}</p>
                      {item?.error ? (
                        <p className="text-xs text-red-600 mt-1">{item.error}</p>
                      ) : (
                        <p className="text-xs text-gray-600 mt-1">
                          {selectedId ? `Assigned ID: ${formatFishIdForDisplay(selectedId)}` : 'No assigned ID'}
                        </p>
                      )}
                      {!item?.error && (
                        <p className="text-xs text-gray-500 mt-1">
                          {suggestedId
                            ? `Suggested: ${formatFishIdForDisplay(suggestedId)}`
                            : 'Suggested: none'}
                        </p>
                      )}
                    </div>
                    )
                  })}
                </Card.Body>
              </Card>
            </div>

            {/* Main Identification View */}
            <div className="lg:col-span-3">
              {/* Current Fish */}
              <Card className="mb-6">
                <Card.Header>
                  <h2 className="text-lg font-semibold">
                    Current Detection - #{currentFishIndex + 1}
                  </h2>
                </Card.Header>
                <Card.Body>
                  {currentIdentification?.error ? (
                    <Alert type="error">{currentIdentification.error}</Alert>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Query Crop</p>
                        <div className="bg-gray-900 rounded-lg aspect-square overflow-hidden">
                          {currentIdentification?.queryCropPath || currentIdentification?.query_crop_path ? (
                            <img
                              src={resolveImageUrl(currentIdentification.queryCropPath || currentIdentification.query_crop_path)}
                              alt={`Query fish ${currentSelectedFishId ? formatFishIdForDisplay(currentSelectedFishId) : 'N/A'}`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <p className="text-white text-sm">No crop available</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Source Image</p>
                        <div className="bg-gray-900 rounded-lg aspect-square overflow-hidden">
                          {currentIdentification?.imagePath || currentIdentification?.image_path ? (
                            <img
                              src={resolveImageUrl(currentIdentification.imagePath || currentIdentification.image_path)}
                              alt={`Source image ${currentSelectedFishId ? formatFishIdForDisplay(currentSelectedFishId) : 'N/A'}`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <p className="text-white text-sm">No image available</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Top Matches */}
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-semibold">Top 3 Matches</h2>
                </Card.Header>
                <Card.Body>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {currentMatches.slice(0, 3).map((match, index) => {
                      const matchImagePath = getMatchImagePath(match)
                      return (
                        <div
                          key={index}
                          className={`
                            relative border-2 rounded-lg p-4 transition-all
                            ${currentSelectedFishId === match.fishId
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-300'
                            }
                          `}
                        >
                          {currentSelectedFishId === match.fishId && (
                            <div className="absolute top-2 right-2">
                              <div className="bg-primary-600 text-white rounded-full p-1">
                                <Check size={16} />
                              </div>
                            </div>
                          )}
                          
                          <div className="bg-gray-200 h-48 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                            {matchImagePath ? (
                              <img
                                src={resolveImageUrl(matchImagePath)}
                                alt={`Match ${index + 1}`}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <p className="text-sm text-gray-500">Match {index + 1}</p>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            Fish ID: {formatFishIdForDisplay(match.fishId)}
                          </p>
                          <p className="text-xs text-gray-600 mb-2">
                            Distance: {typeof match.distance === 'number' ? match.distance.toFixed(4) : 'N/A'}
                          </p>
                          <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                            <span>Confidence</span>
                            <span>{((match.confidence || 0) * 100).toFixed(0)}%</span>
                          </div>
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${(match.confidence || 0) * 100}%` }}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={!matchImagePath}
                              onClick={(event) => handleOpenMatchPreview(event, match)}
                            >
                              View Crop
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={isAssigningIdentity}
                              onClick={(event) => handleAssignPositive(event, match)}
                            >
                              {isAssigningIdentity ? 'Assigning...' : 'Assign Positive'}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {currentIdentification && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        Suggested ID:{' '}
                        <span className="font-semibold">
                          {currentSuggestedFishId
                            ? formatFishIdForDisplay(currentSuggestedFishId)
                            : 'No suggestions from gallery'}
                        </span>
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        Current Assigned ID:{' '}
                        <span className="font-semibold">
                          {currentSelectedFishId
                            ? formatFishIdForDisplay(currentSelectedFishId)
                            : 'Not assigned'}
                        </span>
                      </p>
                      <div className="mt-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          onClick={handleCreateNewIdentity}
                          disabled={isCreatingIdentity || isAssigningIdentity || !!currentIdentification?.error}
                        >
                          {isCreatingIdentity ? 'Creating Identity...' : 'Create New Identity'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {(!currentMatches || currentMatches.length === 0) && (
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
                  disabled={!currentSelectedFishId || !!currentIdentification?.error}
                >
                  See Tracking History
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {previewMatch && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                Detection #{previewMatch.detectionIndex} vs Fish ID {formatFishIdForDisplay(previewMatch.fishId)}
              </p>
              <button
                type="button"
                onClick={() => setPreviewMatch(null)}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                aria-label="Close match crop preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="bg-gray-900 p-4 md:p-6 max-h-[80vh] overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-black/20 p-3">
                  <p className="text-xs text-gray-200 mb-2">Query Crop</p>
                  <div className="h-72 md:h-[60vh] flex items-center justify-center bg-black/20 rounded-md">
                    {previewMatch.queryImageUrl ? (
                      <img
                        src={previewMatch.queryImageUrl}
                        alt="Query crop preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <p className="text-sm text-gray-300">No query crop available</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-black/20 p-3">
                  <p className="text-xs text-gray-200 mb-2">Match Crop</p>
                  <div className="h-72 md:h-[60vh] flex items-center justify-center bg-black/20 rounded-md">
                    <img
                      src={previewMatch.matchImageUrl}
                      alt="Match crop preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Identification
