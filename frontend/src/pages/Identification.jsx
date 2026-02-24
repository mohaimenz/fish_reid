import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, RefreshCcw, Search, X } from 'lucide-react'
import WorkflowStepper from '../components/WorkflowStepper'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import Alert from '../components/ui/Alert'
import Input from '../components/ui/Input'
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
  const [showPreviewVisualization, setShowPreviewVisualization] = useState(false)
  const [previewVisualizationVariant, setPreviewVisualizationVariant] = useState('gradcam')
  const [isLoadingPreviewVisualization, setIsLoadingPreviewVisualization] = useState(false)
  const [previewVisualizationError, setPreviewVisualizationError] = useState('')
  const [identifiedFishList, setIdentifiedFishList] = useState([])
  const [manualFishSearch, setManualFishSearch] = useState('')
  const [isLoadingIdentifiedFish, setIsLoadingIdentifiedFish] = useState(false)
  const [identifiedFishError, setIdentifiedFishError] = useState('')
  const [selectedCurrentImagePreview, setSelectedCurrentImagePreview] = useState(null)
  const [currentFullImageNaturalSize, setCurrentFullImageNaturalSize] = useState({
    width: 0,
    height: 0,
  })
  const manualFishSliderRef = useRef(null)
  const hasRun = useRef(false)

  const allDetections = detections.flat()
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  const visualizationOptions = [
    { value: 'gradcam', label: 'Grad-CAM' },
    { value: 'bw', label: 'B&W' },
    { value: 'enhanced', label: 'Enhanced' },
  ]

  const getAnnotationKey = (item, index) => {
    return item?.annotationId || item?.annotation_id || `fish-${index}`
  }

  const getSuggestedFishId = (item) => {
    return item?.suggestedFishId || item?.suggested_fish_id || null
  }

  const getFishAlias = (item) => {
    return item?.fishAlias || item?.fish_alias || item?.fishName || item?.fish_name || null
  }

  const getFishId = (item) => {
    return item?.fishId || item?.fish_id || null
  }

  const formatFishLabel = (fishId, fishAlias = null) => {
    if (!fishId) return 'Unknown fish'
    if (fishAlias) return `${fishAlias} (${formatFishIdForDisplay(fishId)})`
    return `Fish #${formatFishIdForDisplay(fishId)}`
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
  const currentAnnotationId =
    currentIdentification?.annotationId || currentIdentification?.annotation_id || null
  const currentAnnotationKey = getAnnotationKey(currentIdentification, currentFishIndex)
  const currentSelectedFishId = selectedFishByAnnotation[currentAnnotationKey] || null
  const currentMatches = currentIdentification?.matches || []
  const currentSelectedFishAlias =
    currentIdentification?.assignedFishAlias ||
    currentIdentification?.assigned_fish_alias ||
    currentIdentification?.assignedFishName ||
    currentIdentification?.assigned_fish_name ||
    currentMatches.find((match) => getFishId(match) === currentSelectedFishId)?.fishAlias ||
    currentMatches.find((match) => getFishId(match) === currentSelectedFishId)?.fish_alias ||
    null
  const identifiedFishPageSize = 50

  const formatDateLabel = (dateValue) => {
    if (!dateValue) return 'Unknown date'
    const parsedDate = new Date(dateValue)
    if (Number.isNaN(parsedDate.getTime())) return 'Unknown date'
    return parsedDate.toLocaleString()
  }

  const normalizeDetectionBox = (source) => {
    if (!source) return null
    const xMin = Number(source?.xMin ?? source?.x_min)
    const yMin = Number(source?.yMin ?? source?.y_min)
    const width = Number(source?.width)
    const height = Number(source?.height)

    if (![xMin, yMin, width, height].every(Number.isFinite)) {
      return null
    }
    if (width <= 0 || height <= 0) {
      return null
    }
    return { xMin, yMin, width, height }
  }

  const annotationIds = useMemo(
    () =>
      allDetections
        .map((det) => det.annotation_id || det.annotationId)
        .filter(Boolean),
    [allDetections]
  )

  const filteredIdentifiedFish = useMemo(() => {
    const terms = manualFishSearch
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)

    if (terms.length === 0) {
      return identifiedFishList
    }

    return identifiedFishList.filter((fish) => {
      const fishId = getFishId(fish) || ''
      const fishAlias = getFishAlias(fish) || ''
      const lastIdentifiedAt = fish?.lastIdentifiedAt || fish?.last_identified_at || null
      const parsedDate = lastIdentifiedAt ? new Date(lastIdentifiedAt) : null
      const dateTokens = []
      if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
        dateTokens.push(parsedDate.toISOString())
        dateTokens.push(parsedDate.toLocaleDateString())
        dateTokens.push(parsedDate.toLocaleString())
      }

      const searchableText = [
        fishId,
        fishId ? formatFishIdForDisplay(fishId) : '',
        fishAlias,
        ...dateTokens,
      ]
        .join(' ')
        .toLowerCase()

      return terms.every((term) => searchableText.includes(term))
    })
  }, [identifiedFishList, manualFishSearch])

  const currentDetectionBoundingBox = useMemo(() => {
    const fromIdentification = normalizeDetectionBox(currentIdentification)
    if (fromIdentification) {
      return fromIdentification
    }
    if (!currentAnnotationId) {
      return null
    }
    const matchingDetection = allDetections.find(
      (det) => (det?.annotationId || det?.annotation_id || null) === currentAnnotationId
    )
    return normalizeDetectionBox(matchingDetection)
  }, [allDetections, currentAnnotationId, currentIdentification])

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

  const loadIdentifiedFishList = async () => {
    setIsLoadingIdentifiedFish(true)
    setIdentifiedFishError('')
    try {
      const firstPageResponse = await workflowService.getIdentifiedFishList({
        page: 1,
        pageSize: identifiedFishPageSize,
      })
      const totalPages = Number(firstPageResponse?.totalPages ?? firstPageResponse?.total_pages ?? 0)
      const collectedFish = [...(firstPageResponse?.fish || [])]

      if (totalPages > 1) {
        const pageRequests = []
        for (let page = 2; page <= totalPages; page += 1) {
          pageRequests.push(
            workflowService.getIdentifiedFishList({
              page,
              pageSize: identifiedFishPageSize,
            })
          )
        }
        const pagedResponses = await Promise.all(pageRequests)
        pagedResponses.forEach((response) => {
          collectedFish.push(...(response?.fish || []))
        })
      }

      const uniqueFishById = new Map()
      collectedFish.forEach((fish) => {
        const fishId = getFishId(fish)
        if (!fishId || uniqueFishById.has(fishId)) return
        uniqueFishById.set(fishId, fish)
      })
      setIdentifiedFishList(Array.from(uniqueFishById.values()))
    } catch (err) {
      setIdentifiedFishError(
        err.response?.data?.message || err.message || 'Failed to load identified fishes.'
      )
      setIdentifiedFishList([])
    } finally {
      setIsLoadingIdentifiedFish(false)
    }
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
    loadIdentifiedFishList()
  }, [])

  const handleSelectFish = (index) => {
    setCurrentFishIndex(index)
    const target = identifications[index]
    const key = getAnnotationKey(target, index)
    const fishId = selectedFishByAnnotation[key] || null
    setSelectedFishId(fishId)
    setError('')
    setInfoMessage('')
  }

  const handleScrollManualFishSlider = (direction) => {
    const slider = manualFishSliderRef.current
    if (!slider) return
    const scrollDistance = Math.max(220, Math.round(slider.clientWidth * 0.75))
    slider.scrollBy({
      left: direction * scrollDistance,
      behavior: 'smooth',
    })
  }

  const getMatchImagePath = (match) => {
    return (
      match?.thumbnailPath ||
      match?.thumbnail_path ||
      match?.imagePath ||
      match?.image_path ||
      match?.previewPath ||
      match?.preview_path ||
      ''
    )
  }

  const getMatchAnnotationId = (match) => {
    return match?.annotationId || match?.annotation_id || null
  }

  const handleOpenCurrentImagePreview = ({ imagePath, label }) => {
    if (!imagePath) return
    setSelectedCurrentImagePreview({
      imageUrl: resolveImageUrl(imagePath),
      label,
      detectionIndex: currentFishIndex + 1,
      fishId: currentSelectedFishId,
      fishAlias: currentSelectedFishAlias,
    })
  }

  const handleCloseCurrentImagePreview = () => {
    setSelectedCurrentImagePreview(null)
  }

  const handleOpenMatchPreview = (event, match) => {
    event.stopPropagation()
    const matchImagePath = getMatchImagePath(match)
    if (!matchImagePath) return
    const matchFishId = getFishId(match)
    const queryImagePath =
      currentIdentification?.queryCropPath || currentIdentification?.query_crop_path || ''
    const queryAnnotationId =
      currentIdentification?.annotationId || currentIdentification?.annotation_id || null
    const matchAnnotationId = getMatchAnnotationId(match)

    setPreviewMatch({
      queryImageUrl: queryImagePath ? resolveImageUrl(queryImagePath) : '',
      matchImageUrl: resolveImageUrl(matchImagePath),
      fishId: matchFishId,
      fishAlias: getFishAlias(match),
      queryAnnotationId,
      matchAnnotationId,
      queryVisualizationByVariant: {},
      matchVisualizationByVariant: {},
      detectionIndex: currentFishIndex + 1,
    })
    setShowPreviewVisualization(false)
    setPreviewVisualizationError('')
  }

  const handleCloseMatchPreview = () => {
    setPreviewMatch(null)
    setShowPreviewVisualization(false)
    setPreviewVisualizationError('')
    setIsLoadingPreviewVisualization(false)
  }

  const loadPreviewVisualization = async ({ variant, forceRegenerate = false } = {}) => {
    if (!previewMatch) return
    const targetVariant = variant || previewVisualizationVariant
    const queryAnnotationId = previewMatch.queryAnnotationId || null
    const matchAnnotationId = previewMatch.matchAnnotationId || null

    if (!queryAnnotationId && !matchAnnotationId) {
      setPreviewVisualizationError('No annotation metadata is available for visualisation.')
      return
    }

    setIsLoadingPreviewVisualization(true)
    setPreviewVisualizationError('')
    try {
      const response = await workflowService.generateVisualization({
        queryAnnotationId,
        matchAnnotationId,
        visualizationVariant: targetVariant,
        forceRegenerate,
      })
      const queryVisualizationPath =
        response?.queryVisualizationPath || response?.query_visualization_path || null
      const matchVisualizationPath =
        response?.matchVisualizationPath || response?.match_visualization_path || null
      const errors = response?.errors || {}

      setPreviewMatch((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          queryVisualizationByVariant: {
            ...(prev.queryVisualizationByVariant || {}),
            ...(queryVisualizationPath
              ? { [targetVariant]: resolveImageUrl(queryVisualizationPath) }
              : {}),
          },
          matchVisualizationByVariant: {
            ...(prev.matchVisualizationByVariant || {}),
            ...(matchVisualizationPath
              ? { [targetVariant]: resolveImageUrl(matchVisualizationPath) }
              : {}),
          },
        }
      })

      if (Object.keys(errors).length > 0) {
        const firstError = Object.values(errors)[0]
        setPreviewVisualizationError(
          typeof firstError === 'string'
            ? firstError
            : 'Some visualisation outputs could not be generated.'
        )
      }
    } catch (err) {
      setPreviewVisualizationError(
        err.response?.data?.message || err.message || 'Failed to generate visualisation.'
      )
    } finally {
      setIsLoadingPreviewVisualization(false)
    }
  }

  const handleTogglePreviewVisualization = async (enabled) => {
    setShowPreviewVisualization(enabled)
    if (!enabled || !previewMatch) return

    const queryVisualizationUrl = previewMatch?.queryVisualizationByVariant?.[previewVisualizationVariant]
    const matchVisualizationUrl = previewMatch?.matchVisualizationByVariant?.[previewVisualizationVariant]
    const needsQueryVisualization = !!previewMatch.queryAnnotationId && !queryVisualizationUrl
    const needsMatchVisualization = !!previewMatch.matchAnnotationId && !matchVisualizationUrl
    if (needsQueryVisualization || needsMatchVisualization) {
      await loadPreviewVisualization({ variant: previewVisualizationVariant })
    }
  }

  const handleChangePreviewVisualizationVariant = async (variant) => {
    setPreviewVisualizationVariant(variant)
    if (!showPreviewVisualization || !previewMatch) return

    const queryVisualizationUrl = previewMatch?.queryVisualizationByVariant?.[variant]
    const matchVisualizationUrl = previewMatch?.matchVisualizationByVariant?.[variant]
    const needsQueryVisualization = !!previewMatch.queryAnnotationId && !queryVisualizationUrl
    const needsMatchVisualization = !!previewMatch.matchAnnotationId && !matchVisualizationUrl
    if (needsQueryVisualization || needsMatchVisualization) {
      await loadPreviewVisualization({ variant })
    }
  }

  const handleAssignIdentity = async ({ fishId, fishAlias = null }) => {
    if (!currentIdentification || !fishId) {
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
        fishId,
      })
      const assignedFishId = response?.fishId || response?.fish_id || fishId
      const assignedFishAlias =
        response?.fishAlias ||
        response?.fish_alias ||
        response?.fishName ||
        response?.fish_name ||
        fishAlias ||
        null
      const key = getAnnotationKey(currentIdentification, currentFishIndex)
      setSelectedFishByAnnotation((prev) => ({
        ...prev,
        [key]: assignedFishId,
      }))
      const updatedIdentifications = identifications.map((item, index) => {
        if (index !== currentFishIndex) return item
        return {
          ...item,
          assignedFishId: assignedFishId,
          assigned_fish_id: assignedFishId,
          assignedFishAlias: assignedFishAlias,
          assigned_fish_alias: assignedFishAlias,
        }
      })
      setIdentifications(updatedIdentifications)
      setSelectedFishId(assignedFishId)
      setInfoMessage(
        `Detection #${currentFishIndex + 1} assigned to ${formatFishLabel(assignedFishId, assignedFishAlias)}.`
      )
      await loadIdentifiedFishList()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign identity.')
    } finally {
      setIsAssigningIdentity(false)
    }
  }

  const handleAssignPositive = async (event, match) => {
    event.stopPropagation()
    await handleAssignIdentity({
      fishId: getFishId(match),
      fishAlias: getFishAlias(match),
    })
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
      const updatedIdentifications = identifications.map((item, index) => {
        if (index !== currentFishIndex) return item
        return {
          ...item,
          assignedFishId: newFishId,
          assigned_fish_id: newFishId,
          assignedFishAlias: null,
          assigned_fish_alias: null,
        }
      })
      setIdentifications(updatedIdentifications)
      setSelectedFishId(newFishId)
      setInfoMessage(
        `Detection #${currentFishIndex + 1} assigned to new identity ${formatFishIdForDisplay(newFishId)}. Please click "Re-Calculate Matches" to refresh suggestions from the updated fish table.`
      )
      await loadIdentifiedFishList()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create new identity.')
    } finally {
      setIsCreatingIdentity(false)
    }
  }

  const handleReidentify = async () => {
    await runIdentification({
      persistResults: true,
      reuseStoredEmbeddings: true,
    })
    await loadIdentifiedFishList()
  }

  const previewVariantLabel =
    visualizationOptions.find((option) => option.value === previewVisualizationVariant)?.label ||
    previewVisualizationVariant
  const activeQueryVisualizationUrl =
    previewMatch?.queryVisualizationByVariant?.[previewVisualizationVariant] || null
  const activeMatchVisualizationUrl =
    previewMatch?.matchVisualizationByVariant?.[previewVisualizationVariant] || null
  const displayedQueryImageUrl =
    showPreviewVisualization && activeQueryVisualizationUrl
      ? activeQueryVisualizationUrl
      : previewMatch?.queryImageUrl || ''
  const displayedMatchImageUrl =
    showPreviewVisualization && activeMatchVisualizationUrl
      ? activeMatchVisualizationUrl
      : previewMatch?.matchImageUrl || ''
  const currentQueryCropPath =
    currentIdentification?.queryCropPath || currentIdentification?.query_crop_path || ''
  const currentFullImagePath =
    currentIdentification?.imagePath || currentIdentification?.image_path || ''
  const currentPreviewImagePath = currentQueryCropPath || currentFullImagePath
  const currentPreviewLabel = currentQueryCropPath ? 'Detected Fish Crop' : 'Full Image'

  if (isLoading) {
    return (
      <div className="page-shell">
        <div className="page-container workflow-layout">
          <WorkflowStepper currentStep={3} />
          <div className="workflow-main flex min-h-[320px] items-center justify-center">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-4 text-gray-600">Re-calculating fish matches...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="page-container workflow-layout">
        <WorkflowStepper currentStep={3} />
        <div className="workflow-main">
          <div className="w-full">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-3">
            <div>
              <h1 className="page-title mb-2">RabbitFish Identification</h1>
              <p className="page-subtitle">
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

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Detected Fish Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-bold">Detections</h2>
                </Card.Header>
                <Card.Body className="space-y-2">
                  {identifications.map((item, index) => {
                    const key = getAnnotationKey(item, index)
                    const selectedId = selectedFishByAnnotation[key] || null
                    const assignedAlias =
                      item?.assignedFishAlias ||
                      item?.assigned_fish_alias ||
                      item?.assignedFishName ||
                      item?.assigned_fish_name ||
                      null
                    const suggestedId = getSuggestedFishId(item)
                    const suggestedAlias =
                      item?.suggestedFishAlias ||
                      item?.suggested_fish_alias ||
                      item?.suggestedFishName ||
                      item?.suggested_fish_name ||
                      null
                    return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => handleSelectFish(index)}
                      className={`
                        w-full rounded-xl border p-3 text-left transition-colors
                        ${index === currentFishIndex 
                          ? 'border-primary-500 bg-primary-50 shadow-[0_4px_12px_rgba(22,135,218,0.14)]' 
                          : 'border-slate-200 bg-white hover:border-primary-300'
                        }
                      `}
                    >
                      <p className="text-sm font-medium">Detection #{index + 1}</p>
                      {item?.error ? (
                        <p className="text-xs text-red-600 mt-1">{item.error}</p>
                      ) : (
                        <p className="text-xs text-gray-600 mt-1">
                          {selectedId ? `Assigned: ${formatFishLabel(selectedId, assignedAlias)}` : 'No assigned ID'}
                        </p>
                      )}
                      {!item?.error && (
                        <p className="text-xs text-gray-500 mt-1">
                          {suggestedId
                            ? `Suggested: ${formatFishLabel(suggestedId, suggestedAlias)}`
                            : 'Suggested: none'}
                        </p>
                      )}
                    </button>
                    )
                  })}
                </Card.Body>
              </Card>
            </div>

            {/* Main Identification View */}
            <div className="lg:col-span-3">
              {/* Current Fish */}
              <Card className="mb-6">
                <Card.Header className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold">
                    Current Detection - #{currentFishIndex + 1}
                  </h2>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    className="shrink-0"
                    onClick={handleCreateNewIdentity}
                    disabled={isCreatingIdentity || isAssigningIdentity || !!currentIdentification?.error}
                  >
                    {isCreatingIdentity ? 'Creating...' : 'Create New Identity'}
                  </Button>
                </Card.Header>
                <Card.Body>
                  {currentIdentification?.error ? (
                    <Alert type="error">{currentIdentification.error}</Alert>
                  ) : (
                    <div>
                      <div className="relative bg-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                        {currentFullImagePath ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenCurrentImagePreview({
                                  imagePath: currentPreviewImagePath,
                                  label: currentPreviewLabel,
                                })
                              }
                              className="group relative h-full w-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                              aria-label="Open detected fish crop preview"
                            >
                              <img
                                src={resolveImageUrl(currentFullImagePath)}
                                alt={`Full image ${currentSelectedFishId ? formatFishIdForDisplay(currentSelectedFishId) : 'N/A'}`}
                                className="block w-full h-auto transition-transform duration-200 group-hover:scale-[1.01]"
                                onLoad={(event) =>
                                  setCurrentFullImageNaturalSize({
                                    width: event.currentTarget.naturalWidth,
                                    height: event.currentTarget.naturalHeight,
                                  })
                                }
                              />
                              {currentDetectionBoundingBox &&
                                currentFullImageNaturalSize.width > 0 &&
                                currentFullImageNaturalSize.height > 0 && (
                                  <svg
                                    className="pointer-events-none absolute inset-0 h-full w-full"
                                    viewBox={`0 0 ${currentFullImageNaturalSize.width} ${currentFullImageNaturalSize.height}`}
                                    preserveAspectRatio="xMidYMid meet"
                                  >
                                    <rect
                                      x={currentDetectionBoundingBox.xMin}
                                      y={currentDetectionBoundingBox.yMin}
                                      width={currentDetectionBoundingBox.width}
                                      height={currentDetectionBoundingBox.height}
                                      fill="none"
                                      stroke="#f97316"
                                      strokeWidth="3"
                                      vectorEffect="non-scaling-stroke"
                                      rx="2"
                                    />
                                  </svg>
                                )}
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                <p className="text-xs text-white">Click to view crop</p>
                              </div>
                            </button>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <p className="text-slate-600 text-sm">No image available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Top Matches */}
              <Card className="mb-6">
                <Card.Header>
                  <h2 className="text-lg font-bold">Top 3 Matches</h2>
                </Card.Header>
                <Card.Body>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {currentMatches.slice(0, 3).map((match, index) => {
                      const matchFishId = getFishId(match)
                      const matchImagePath = getMatchImagePath(match)
                      const matchFishAlias = getFishAlias(match)
                      return (
                        <div
                          key={index}
                          className={`
                            relative rounded-xl border p-4 transition-all
                            ${currentSelectedFishId === matchFishId
                              ? 'border-primary-500 bg-primary-50 shadow-[0_6px_16px_rgba(22,135,218,0.14)]'
                              : 'border-slate-200 bg-white'
                            }
                          `}
                        >
                          {currentSelectedFishId === matchFishId && (
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
                            {matchFishAlias || `Fish #${formatFishIdForDisplay(matchFishId)}`}
                          </p>
                          <p className="text-xs text-gray-500 mb-1">
                            ID: {formatFishIdForDisplay(matchFishId)}
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

                          <div className="mt-3 grid grid-cols-1 gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={!matchImagePath}
                              className="w-full"
                              onClick={(event) => handleOpenMatchPreview(event, match)}
                            >
                              Compare
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="w-full"
                              disabled={isAssigningIdentity}
                              onClick={(event) => handleAssignPositive(event, match)}
                            >
                              {isAssigningIdentity ? 'Assigning...' : 'Assign Identity'}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {(!currentMatches || currentMatches.length === 0) && (
                    <p className="text-center text-gray-500 py-8">
                      No matches found for this fish
                    </p>
                  )}
                </Card.Body>
              </Card>

              {/* Assign Manually */}
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-bold">Assign Manually</h2>
                </Card.Header>
                <Card.Body>
                  <div className="rounded-xl border border-slate-200/85 bg-slate-50/70 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <p className="text-sm text-slate-600">
                        Search by alias, fish ID, or date and assign from the horizontal slider.
                      </p>
                      <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 px-0"
                          icon={<RefreshCcw size={14} />}
                          onClick={loadIdentifiedFishList}
                          disabled={isLoadingIdentifiedFish}
                          aria-label="Refresh fish list"
                          title="Refresh fish list"
                        />
                        <div className="mx-1 h-4 w-px bg-slate-200" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 px-0"
                          icon={<ChevronLeft size={14} />}
                          onClick={() => handleScrollManualFishSlider(-1)}
                          disabled={isLoadingIdentifiedFish || filteredIdentifiedFish.length === 0}
                          aria-label="Scroll fish list left"
                          title="Scroll left"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 px-0"
                          icon={<ChevronRight size={14} />}
                          onClick={() => handleScrollManualFishSlider(1)}
                          disabled={isLoadingIdentifiedFish || filteredIdentifiedFish.length === 0}
                          aria-label="Scroll fish list right"
                          title="Scroll right"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <Input
                        type="search"
                        value={manualFishSearch}
                        onChange={(event) => setManualFishSearch(event.target.value)}
                        placeholder="Filter by fish alias, ID, or date"
                        icon={<Search size={16} />}
                      />
                    </div>

                    <p className="mt-2 text-xs text-slate-600">
                      Showing {filteredIdentifiedFish.length} of {identifiedFishList.length} fish IDs
                    </p>

                    {isLoadingIdentifiedFish ? (
                      <div className="flex items-center justify-center py-6">
                        <Spinner size="md" />
                      </div>
                    ) : identifiedFishError ? (
                      <p className="mt-3 text-sm text-red-600">{identifiedFishError}</p>
                    ) : filteredIdentifiedFish.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-600">
                        No fish IDs match this search term.
                      </p>
                    ) : (
                      <div
                        ref={manualFishSliderRef}
                        className="mt-3 flex gap-3 overflow-x-auto pb-2 pr-1 scroll-smooth snap-x snap-mandatory"
                      >
                        {filteredIdentifiedFish.map((fish) => {
                          const fishId = getFishId(fish)
                          const fishAlias = getFishAlias(fish)
                          const previewPath = fish?.previewPath || fish?.preview_path || null
                          const sightingsCount = fish?.sightingsCount || fish?.sightings_count || 0
                          const lastIdentifiedAt =
                            fish?.lastIdentifiedAt || fish?.last_identified_at || null
                          if (!fishId) {
                            return null
                          }
                          const isSelectedFish = currentSelectedFishId === fishId

                          return (
                            <div
                              key={fishId}
                              className={`
                                snap-start min-w-[220px] rounded-xl border bg-white p-3 shadow-sm transition-colors
                                ${isSelectedFish
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-slate-200 hover:border-primary-300'
                                }
                              `}
                            >
                              <div className="mb-2 flex h-24 w-full items-center justify-center overflow-hidden rounded-md bg-gray-200">
                                {previewPath ? (
                                  <img
                                    src={resolveImageUrl(previewPath)}
                                    alt={`Fish ${formatFishIdForDisplay(fishId)}`}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <p className="text-xs text-gray-500">No preview</p>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-gray-900">
                                {fishAlias || `Fish #${formatFishIdForDisplay(fishId)}`}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                ID: {formatFishIdForDisplay(fishId)}
                              </p>
                              <p className="mt-1 text-xs text-gray-600">{sightingsCount} sightings</p>
                              <p className="mt-1 text-xs text-gray-500">{formatDateLabel(lastIdentifiedAt)}</p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="mt-3 w-full"
                                disabled={!previewPath}
                                onClick={(event) => handleOpenMatchPreview(event, fish)}
                              >
                                View Crop
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="mt-2 w-full"
                                disabled={isAssigningIdentity || !!currentIdentification?.error}
                                onClick={() =>
                                  handleAssignIdentity({
                                    fishId,
                                    fishAlias,
                                  })
                                }
                              >
                                {isAssigningIdentity ? 'Assigning...' : 'Assign Identity'}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
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
                  onClick={() => navigate('/pair-matching')}
                  disabled={identifications.length === 0}
                >
                  Continue to Pair Matching
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {selectedCurrentImagePreview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-fit max-w-[95vw] max-h-[95vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Detection #{selectedCurrentImagePreview.detectionIndex} - {selectedCurrentImagePreview.label}
                </p>
                <p className="text-xs text-gray-600">
                  {selectedCurrentImagePreview.fishId
                    ? formatFishLabel(
                        selectedCurrentImagePreview.fishId,
                        selectedCurrentImagePreview.fishAlias
                      )
                    : 'No assigned ID'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseCurrentImagePreview}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                aria-label="Close current image preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="bg-gray-900 p-2 flex items-center justify-center min-h-[75vh]">
              <img
                src={selectedCurrentImagePreview.imageUrl}
                alt={`${selectedCurrentImagePreview.label} preview`}
                className="block h-[60vh] w-auto max-w-[75vw] max-h-[75vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {previewMatch && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                Detection #{previewMatch.detectionIndex} vs{' '}
                {formatFishLabel(previewMatch.fishId, previewMatch.fishAlias)}
              </p>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={showPreviewVisualization}
                    onChange={(event) => handleTogglePreviewVisualization(event.target.checked)}
                  />
                  <span>Show visualisation</span>
                </label>
                <select
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
                  value={previewVisualizationVariant}
                  onChange={(event) => handleChangePreviewVisualizationVariant(event.target.value)}
                  disabled={isLoadingPreviewVisualization}
                >
                  {visualizationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!showPreviewVisualization || isLoadingPreviewVisualization}
                  onClick={() =>
                    loadPreviewVisualization({
                      variant: previewVisualizationVariant,
                      forceRegenerate: true,
                    })
                  }
                >
                  Refresh
                </Button>
                <button
                  type="button"
                  onClick={handleCloseMatchPreview}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                  aria-label="Close match crop preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="bg-gray-200 p-4 md:p-6 max-h-[80vh] overflow-auto">
              {showPreviewVisualization && (
                <div className="mb-3 rounded-md border border-slate-300 bg-white/80 px-3 py-2 text-xs text-slate-700">
                  <p>
                    Visualisation variant: <span className="font-semibold">{previewVariantLabel}</span>
                  </p>
                  {isLoadingPreviewVisualization && (
                    <p className="mt-1 text-slate-600">Generating visualisation...</p>
                  )}
                  {previewVisualizationError && (
                    <p className="mt-1 text-red-600">{previewVisualizationError}</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-black/20 p-3">
                  <p className="text-xs text-gray-900 mb-2">
                    Detection
                    {showPreviewVisualization ? ` (${previewVariantLabel})` : ''}
                  </p>
                  <div className="h-72 md:h-[60vh] flex items-center justify-center bg-black/20 rounded-md">
                    {displayedQueryImageUrl ? (
                      <img
                        src={displayedQueryImageUrl}
                        alt="Detected fish crop preview"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <p className="text-sm text-gray-300">No query crop available</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-black/20 p-3">
                  <p className="text-xs text-gray-900 mb-2">
                    Matched Fish
                    {showPreviewVisualization ? ` (${previewVariantLabel})` : ''}
                  </p>
                  <div className="h-72 md:h-[60vh] flex items-center justify-center bg-black/20 rounded-md">
                    {displayedMatchImageUrl ? (
                      <img
                        src={displayedMatchImageUrl}
                        alt="Match crop preview"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <p className="text-sm text-gray-300">No match crop available</p>
                    )}
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
