import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, RefreshCcw, Search } from 'lucide-react'
import WorkflowStepper from '../components/WorkflowStepper'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import Alert from '../components/ui/Alert'
import Input from '../components/ui/Input'
import workflowService from '../services/workflowService'
import useWorkflowStore from '../store/workflowStore'
import { formatFishIdForDisplay } from '../utils/fishId'

const PairMatching = () => {
  const navigate = useNavigate()
  const { currentSessionId, setSelectedFishId } = useWorkflowStore()

  const [sessionFishes, setSessionFishes] = useState([])
  const [isLoadingSessionFishes, setIsLoadingSessionFishes] = useState(false)
  const [sessionFishesError, setSessionFishesError] = useState('')
  const [selectedSessionFishId, setSelectedSessionFishId] = useState(null)

  const [pairSummary, setPairSummary] = useState([])
  const [pairTimeline, setPairTimeline] = useState([])
  const [lastConfirmedPair, setLastConfirmedPair] = useState(null)
  const [currentSessionPair, setCurrentSessionPair] = useState(null)
  const [isLoadingPairHistory, setIsLoadingPairHistory] = useState(false)
  const [pairHistoryError, setPairHistoryError] = useState('')

  const [allFishes, setAllFishes] = useState([])
  const [isLoadingAllFishes, setIsLoadingAllFishes] = useState(false)
  const [allFishesError, setAllFishesError] = useState('')
  const [manualPairSearch, setManualPairSearch] = useState('')

  const [isAssigningPair, setIsAssigningPair] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [previewNaturalSizeByKey, setPreviewNaturalSizeByKey] = useState({})

  const pairHistorySliderRef = useRef(null)
  const manualPairSliderRef = useRef(null)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  const identifiedFishPageSize = 50

  const getFishId = (item) => item?.fishId || item?.fish_id || null
  const getFishAlias = (item) => item?.fishAlias || item?.fish_alias || item?.fishName || item?.fish_name || null
  const getFishPreviewImagePath = (item) =>
    item?.previewImagePath || item?.preview_image_path || item?.previewPath || item?.preview_path || null
  const getDetectionBox = (item) => {
    if (!item) return null
    const xMin = Number(item?.xMin ?? item?.x_min)
    const yMin = Number(item?.yMin ?? item?.y_min)
    const width = Number(item?.width)
    const height = Number(item?.height)
    if (![xMin, yMin, width, height].every(Number.isFinite)) return null
    if (width <= 0 || height <= 0) return null
    return { xMin, yMin, width, height }
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

  const formatDateLabel = (rawDate) => {
    if (!rawDate) return 'Unknown date'
    const parsedDate = new Date(rawDate)
    if (Number.isNaN(parsedDate.getTime())) return 'Unknown date'
    return parsedDate.toLocaleString()
  }

  const formatFishLabel = (fishId, fishAlias = null) => {
    if (!fishId) return 'Unknown fish'
    if (fishAlias) return `${fishAlias} (${formatFishIdForDisplay(fishId)})`
    return `Fish #${formatFishIdForDisplay(fishId)}`
  }

  const loadSessionPairing = async (preferredFishId = null) => {
    if (!currentSessionId) return
    setIsLoadingSessionFishes(true)
    setSessionFishesError('')
    try {
      const response = await workflowService.getSessionPairing(currentSessionId)
      const fishes = response?.fishes || []
      setSessionFishes(fishes)
      const availableFishIds = new Set(
        fishes.map((fish) => getFishId(fish)).filter(Boolean)
      )
      setSelectedSessionFishId((prev) => {
        const target = preferredFishId || prev
        if (target && availableFishIds.has(target)) return target
        return fishes.length > 0 ? getFishId(fishes[0]) : null
      })
    } catch (err) {
      setSessionFishesError(err.response?.data?.message || 'Failed to load session fishes for pairing.')
      setSessionFishes([])
      setSelectedSessionFishId(null)
    } finally {
      setIsLoadingSessionFishes(false)
    }
  }

  const loadAllFishes = async () => {
    setIsLoadingAllFishes(true)
    setAllFishesError('')
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
      setAllFishes(Array.from(uniqueFishById.values()))
    } catch (err) {
      setAllFishesError(err.response?.data?.message || 'Failed to load fish list.')
      setAllFishes([])
    } finally {
      setIsLoadingAllFishes(false)
    }
  }

  const loadPairHistory = async (fishId) => {
    if (!fishId) return
    setIsLoadingPairHistory(true)
    setPairHistoryError('')
    try {
      const response = await workflowService.getFishPairHistory({
        fishId,
        sessionId: currentSessionId,
      })
      setPairSummary(response?.pairSummary || response?.pair_summary || [])
      setPairTimeline(response?.pairTimeline || response?.pair_timeline || [])
      setLastConfirmedPair(response?.lastConfirmedPair || response?.last_confirmed_pair || null)
      setCurrentSessionPair(response?.currentSessionPair || response?.current_session_pair || null)
    } catch (err) {
      setPairHistoryError(err.response?.data?.message || 'Failed to load pair history.')
      setPairSummary([])
      setPairTimeline([])
      setLastConfirmedPair(null)
      setCurrentSessionPair(null)
    } finally {
      setIsLoadingPairHistory(false)
    }
  }

  useEffect(() => {
    if (!currentSessionId) {
      navigate('/identification')
      return
    }
    const initialize = async () => {
      await Promise.all([loadSessionPairing(), loadAllFishes()])
    }
    initialize()
  }, [currentSessionId, navigate])

  useEffect(() => {
    if (!selectedSessionFishId) return
    setSelectedFishId(selectedSessionFishId)
    loadPairHistory(selectedSessionFishId)
  }, [selectedSessionFishId, currentSessionId])

  const filteredManualFishList = useMemo(() => {
    const terms = manualPairSearch
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)

    return allFishes
      .filter((fish) => getFishId(fish) && getFishId(fish) !== selectedSessionFishId)
      .filter((fish) => {
        if (terms.length === 0) return true

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
  }, [allFishes, manualPairSearch, selectedSessionFishId])

  const fishPreviewById = useMemo(() => {
    const lookup = new Map()
    allFishes.forEach((fish) => {
      const fishId = getFishId(fish)
      if (!fishId || lookup.has(fishId)) return
      lookup.set(fishId, fish)
    })
    sessionFishes.forEach((fish) => {
      const fishId = getFishId(fish)
      if (!fishId || lookup.has(fishId)) return
      lookup.set(fishId, fish)
    })
    return lookup
  }, [allFishes, sessionFishes])

  const selectedSessionFish = sessionFishes.find((fish) => getFishId(fish) === selectedSessionFishId) || null

  const handlePreviewImageLoad = (key, event) => {
    const naturalWidth = Number(event.currentTarget?.naturalWidth || 0)
    const naturalHeight = Number(event.currentTarget?.naturalHeight || 0)
    if (naturalWidth <= 0 || naturalHeight <= 0) return
    setPreviewNaturalSizeByKey((prev) => {
      const existing = prev[key]
      if (
        existing &&
        existing.width === naturalWidth &&
        existing.height === naturalHeight
      ) {
        return prev
      }
      return {
        ...prev,
        [key]: {
          width: naturalWidth,
          height: naturalHeight,
        },
      }
    })
  }

  const handleScrollSlider = (ref, direction) => {
    const slider = ref?.current
    if (!slider) return
    const scrollDistance = Math.max(220, Math.round(slider.clientWidth * 0.75))
    slider.scrollBy({
      left: direction * scrollDistance,
      behavior: 'smooth',
    })
  }

  const handleAssignPair = async (pairFishId) => {
    if (!currentSessionId || !selectedSessionFishId || !pairFishId) return
    setIsAssigningPair(true)
    setPairHistoryError('')
    setSessionFishesError('')
    setInfoMessage('')
    try {
      const response = await workflowService.assignSessionPair({
        sessionId: currentSessionId,
        fishId: selectedSessionFishId,
        pairFishId,
      })
      const assignedPairAlias = response?.pairFishAlias || response?.pair_fish_alias || getFishAlias(
        allFishes.find((item) => getFishId(item) === pairFishId)
      )
      setInfoMessage(
        `Set pair for ${formatFishLabel(selectedSessionFishId, getFishAlias(selectedSessionFish))} -> ${formatFishLabel(pairFishId, assignedPairAlias)}.`
      )
      await Promise.all([loadSessionPairing(selectedSessionFishId), loadPairHistory(selectedSessionFishId)])
    } catch (err) {
      setPairHistoryError(err.response?.data?.message || err.message || 'Failed to assign pair.')
    } finally {
      setIsAssigningPair(false)
    }
  }

  const handleUseLastConfirmedPair = async () => {
    const pairFishId = lastConfirmedPair?.pairFishId || lastConfirmedPair?.pair_fish_id
    if (!pairFishId) return
    await handleAssignPair(pairFishId)
  }

  const handleOpenTracking = () => {
    if (!selectedSessionFishId) return
    setSelectedFishId(selectedSessionFishId)
    navigate('/tracking')
  }

  const lastConfirmedPairFishId =
    lastConfirmedPair?.pairFishId || lastConfirmedPair?.pair_fish_id || null
  const selectedFishPreview = selectedSessionFishId
    ? fishPreviewById.get(selectedSessionFishId) || selectedSessionFish
    : selectedSessionFish
  const lastConfirmedPartnerPreview = lastConfirmedPairFishId
    ? fishPreviewById.get(lastConfirmedPairFishId) || null
    : null

  return (
    <div className="page-shell">
      <div className="page-container workflow-layout">
        <WorkflowStepper currentStep={4} />
        <div className="workflow-main">
          <div className="w-full">
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="page-title mb-2">Pair Matching</h1>
                <p className="page-subtitle">
                  Manually confirm pair relationships for this session. No automatic pair suggestions are used.
                </p>
              </div>
              <Button
                variant="outline"
                icon={<RefreshCcw size={16} />}
                disabled={isLoadingSessionFishes || isLoadingAllFishes}
                onClick={async () => {
                  await Promise.all([
                    loadSessionPairing(selectedSessionFishId),
                    loadAllFishes(),
                    selectedSessionFishId ? loadPairHistory(selectedSessionFishId) : Promise.resolve(),
                  ])
                }}
              >
                Refresh
              </Button>
            </div>

            {sessionFishesError && (
              <Alert type="error" className="mb-6">
                {sessionFishesError}
              </Alert>
            )}
            {pairHistoryError && (
              <Alert type="error" className="mb-6">
                {pairHistoryError}
              </Alert>
            )}
            {allFishesError && (
              <Alert type="error" className="mb-6">
                {allFishesError}
              </Alert>
            )}
            {infoMessage && (
              <Alert type="info" className="mb-6" onClose={() => setInfoMessage('')}>
                {infoMessage}
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              <div className="lg:col-span-1">
                <Card>
                  <Card.Header>
                    <h2 className="text-lg font-bold text-slate-900">Session Fishes</h2>
                  </Card.Header>
                  <Card.Body className="space-y-2">
                    {isLoadingSessionFishes ? (
                      <div className="flex items-center justify-center py-6">
                        <Spinner size="md" />
                      </div>
                    ) : sessionFishes.length === 0 ? (
                      <p className="text-sm text-slate-600">
                        No identified fishes found for this session.
                      </p>
                    ) : (
                      sessionFishes.map((fish) => {
                        const fishId = getFishId(fish)
                        if (!fishId) return null
                        const fishAlias = getFishAlias(fish)
                        const isSelected = fishId === selectedSessionFishId
                        const currentPairFishId =
                          fish?.currentPairFishId || fish?.current_pair_fish_id || null
                        const currentPairFishAlias =
                          fish?.currentPairFishAlias || fish?.current_pair_fish_alias || null

                        return (
                          <button
                            type="button"
                            key={fishId}
                            onClick={() => setSelectedSessionFishId(fishId)}
                            className={`
                              w-full rounded-lg border p-3 text-left transition-colors
                              ${isSelected
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-slate-200 bg-white hover:border-primary-300'
                              }
                            `}
                          >
                            <p className="text-sm font-semibold text-slate-900">
                              {fishAlias || `Fish #${formatFishIdForDisplay(fishId)}`}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              ID: {formatFishIdForDisplay(fishId)}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              {fish?.sightingsCount || fish?.sightings_count || 0} sightings
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {currentPairFishId
                                ? `Current pair: ${formatFishLabel(currentPairFishId, currentPairFishAlias)}`
                                : 'Current pair: not set for this session'}
                            </p>
                          </button>
                        )
                      })
                    )}
                  </Card.Body>
                </Card>
              </div>

              <div className="space-y-6 lg:col-span-3">
                <Card>
                  <Card.Header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Pair History</h2>
                      <p className="text-sm text-slate-600">
                        {selectedSessionFishId
                          ? `History for ${formatFishLabel(selectedSessionFishId, getFishAlias(selectedSessionFish))} (${pairTimeline.length} events)`
                          : 'Select a fish from the session list'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={<ChevronLeft size={14} />}
                        onClick={() => handleScrollSlider(pairHistorySliderRef, -1)}
                        disabled={isLoadingPairHistory || pairSummary.length === 0}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={<ChevronRight size={14} />}
                        onClick={() => handleScrollSlider(pairHistorySliderRef, 1)}
                        disabled={isLoadingPairHistory || pairSummary.length === 0}
                      />
                    </div>
                  </Card.Header>
                  <Card.Body>
                    {isLoadingPairHistory ? (
                      <div className="flex items-center justify-center py-6">
                        <Spinner size="md" />
                      </div>
                    ) : pairSummary.length === 0 ? (
                      <p className="text-sm text-slate-600">No confirmed pair history for this fish yet.</p>
                    ) : (
                      <div ref={pairHistorySliderRef} className="flex gap-3 overflow-x-auto pb-2">
                        {pairSummary.map((item) => {
                          const pairFishId = item?.pairFishId || item?.pair_fish_id
                          const pairFishAlias = item?.pairFishAlias || item?.pair_fish_alias
                          const coSightings = item?.coSightings || item?.co_sightings || 0
                          const lastSeenAt = item?.lastSeenAt || item?.last_seen_at
                          const lastSiteName = item?.lastSiteName || item?.last_site_name
                          const pairFishPreview = pairFishId ? fishPreviewById.get(pairFishId) || null : null
                          const pairFishPreviewPath = getFishPreviewImagePath(pairFishPreview)
                          const pairFishDetectionBox = getDetectionBox(pairFishPreview)
                          const pairFishImageKey = `pair-summary-${pairFishId}`
                          const pairFishImageSize = previewNaturalSizeByKey[pairFishImageKey] || null
                          if (!pairFishId) return null

                          return (
                            <div
                              key={pairFishId}
                              className="min-w-[220px] rounded-lg border border-slate-200 bg-white p-3"
                            >
                              <div className="mb-2 h-28 w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                                {pairFishPreviewPath ? (
                                  <div className="relative h-full w-full">
                                    <img
                                      src={resolveImageUrl(pairFishPreviewPath)}
                                      alt={`Pair history fish ${formatFishIdForDisplay(pairFishId)}`}
                                      className="h-full w-full object-contain"
                                      onLoad={(event) => handlePreviewImageLoad(pairFishImageKey, event)}
                                    />
                                    {pairFishDetectionBox &&
                                      pairFishImageSize &&
                                      pairFishImageSize.width > 0 &&
                                      pairFishImageSize.height > 0 && (
                                        <svg
                                          className="pointer-events-none absolute inset-0 h-full w-full"
                                          viewBox={`0 0 ${pairFishImageSize.width} ${pairFishImageSize.height}`}
                                          preserveAspectRatio="xMidYMid meet"
                                        >
                                          <rect
                                            x={pairFishDetectionBox.xMin}
                                            y={pairFishDetectionBox.yMin}
                                            width={pairFishDetectionBox.width}
                                            height={pairFishDetectionBox.height}
                                            fill="none"
                                            stroke="#f97316"
                                            strokeWidth="3"
                                            vectorEffect="non-scaling-stroke"
                                            rx="2"
                                          />
                                        </svg>
                                      )}
                                  </div>
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <p className="text-xs text-slate-500">No image</p>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-slate-900">
                                {pairFishAlias || `Fish #${formatFishIdForDisplay(pairFishId)}`}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                ID: {formatFishIdForDisplay(pairFishId)}
                              </p>
                              <p className="mt-1 text-xs text-slate-600">{coSightings} co-sightings</p>
                              <p className="mt-1 text-xs text-slate-500">{formatDateLabel(lastSeenAt)}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {lastSiteName ? `Last site: ${lastSiteName}` : 'Last site: Unknown'}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card.Body>
                </Card>

                <Card>
                  <Card.Header>
                    <h2 className="text-lg font-bold text-slate-900">Last Confirmed Pair</h2>
                  </Card.Header>
                  <Card.Body>
                    <p className="text-sm text-slate-600">
                      {lastConfirmedPair
                        ? `Most recent confirmed partner: ${formatFishLabel(
                            lastConfirmedPair?.pairFishId || lastConfirmedPair?.pair_fish_id,
                            lastConfirmedPair?.pairFishAlias || lastConfirmedPair?.pair_fish_alias
                          )} (${formatDateLabel(lastConfirmedPair?.dateSeen || lastConfirmedPair?.date_seen)})`
                        : 'No previously confirmed partner found.'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {currentSessionPair
                        ? `Current session pair: ${formatFishLabel(
                            currentSessionPair?.pairFishId || currentSessionPair?.pair_fish_id,
                            currentSessionPair?.pairFishAlias || currentSessionPair?.pair_fish_alias
                          )}`
                        : 'Current session pair: not assigned yet.'}
                    </p>
                    {lastConfirmedPair && (
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {[
                          {
                            key: selectedSessionFishId ? `last-confirmed-selected-${selectedSessionFishId}` : null,
                            title: 'Selected Fish',
                            fishId: selectedSessionFishId,
                            fishAlias: getFishAlias(selectedFishPreview),
                            preview: selectedFishPreview,
                          },
                          {
                            key: lastConfirmedPairFishId
                              ? `last-confirmed-partner-${lastConfirmedPairFishId}`
                              : null,
                            title: 'Last Confirmed Partner',
                            fishId: lastConfirmedPairFishId,
                            fishAlias:
                              lastConfirmedPair?.pairFishAlias || lastConfirmedPair?.pair_fish_alias,
                            preview: lastConfirmedPartnerPreview,
                          },
                        ].map((entry) => {
                          const imagePath = getFishPreviewImagePath(entry.preview)
                          const detectionBox = getDetectionBox(entry.preview)
                          const imageSize = entry.key ? previewNaturalSizeByKey[entry.key] || null : null
                          return (
                            <div
                              key={entry.title}
                              className="rounded-lg border border-slate-200 bg-slate-50 p-2"
                            >
                              <p className="text-xs font-semibold text-slate-700">
                                {entry.title}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {entry.fishId
                                  ? formatFishLabel(entry.fishId, entry.fishAlias)
                                  : 'Unknown fish'}
                              </p>
                              <div className="mt-2 h-32 w-full overflow-hidden rounded-md border border-slate-200 bg-white">
                                {imagePath ? (
                                  <div className="relative h-full w-full">
                                    <img
                                      src={resolveImageUrl(imagePath)}
                                      alt={`${entry.title} preview`}
                                      className="h-full w-full object-contain"
                                      onLoad={(event) =>
                                        entry.key ? handlePreviewImageLoad(entry.key, event) : undefined
                                      }
                                    />
                                    {detectionBox &&
                                      imageSize &&
                                      imageSize.width > 0 &&
                                      imageSize.height > 0 && (
                                        <svg
                                          className="pointer-events-none absolute inset-0 h-full w-full"
                                          viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                                          preserveAspectRatio="xMidYMid meet"
                                        >
                                          <rect
                                            x={detectionBox.xMin}
                                            y={detectionBox.yMin}
                                            width={detectionBox.width}
                                            height={detectionBox.height}
                                            fill="none"
                                            stroke="#f97316"
                                            strokeWidth="3"
                                            vectorEffect="non-scaling-stroke"
                                            rx="2"
                                          />
                                        </svg>
                                      )}
                                  </div>
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <p className="text-xs text-slate-500">No image available</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!lastConfirmedPair || isAssigningPair || !selectedSessionFishId}
                        onClick={handleUseLastConfirmedPair}
                      >
                        {isAssigningPair ? 'Assigning...' : 'Still with the same fish'}
                      </Button>
                    </div>
                  </Card.Body>
                </Card>

                <Card>
                  <Card.Header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Assign New Pair</h2>
                      <p className="text-sm text-slate-600">
                        Search and assign a different fish manually for this session.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={<ChevronLeft size={14} />}
                        onClick={() => handleScrollSlider(manualPairSliderRef, -1)}
                        disabled={isLoadingAllFishes || filteredManualFishList.length === 0}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={<ChevronRight size={14} />}
                        onClick={() => handleScrollSlider(manualPairSliderRef, 1)}
                        disabled={isLoadingAllFishes || filteredManualFishList.length === 0}
                      />
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <Input
                      type="search"
                      value={manualPairSearch}
                      onChange={(event) => setManualPairSearch(event.target.value)}
                      placeholder="Filter by fish alias, ID, or date"
                      icon={<Search size={16} />}
                    />
                    <p className="mt-2 text-xs text-slate-600">
                      Showing {filteredManualFishList.length} of {Math.max(allFishes.length - (selectedSessionFishId ? 1 : 0), 0)} candidate fishes
                    </p>
                    {isLoadingAllFishes ? (
                      <div className="flex items-center justify-center py-6">
                        <Spinner size="md" />
                      </div>
                    ) : filteredManualFishList.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-600">No fish IDs match this search term.</p>
                    ) : (
                      <div ref={manualPairSliderRef} className="mt-3 flex gap-3 overflow-x-auto pb-2">
                        {filteredManualFishList.map((fish) => {
                          const fishId = getFishId(fish)
                          const fishAlias = getFishAlias(fish)
                          const previewPath = fish?.previewPath || fish?.preview_path || null
                          const sightingsCount = fish?.sightingsCount || fish?.sightings_count || 0
                          const lastIdentifiedAt = fish?.lastIdentifiedAt || fish?.last_identified_at || null
                          const isCurrentSessionPair =
                            (currentSessionPair?.pairFishId || currentSessionPair?.pair_fish_id) === fishId
                          if (!fishId) return null

                          return (
                            <div
                              key={fishId}
                              className={`
                                min-w-[220px] rounded-lg border bg-white p-3 transition-colors
                                ${isCurrentSessionPair
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
                              <p className="mt-1 text-xs text-gray-500">ID: {formatFishIdForDisplay(fishId)}</p>
                              <p className="mt-1 text-xs text-gray-600">{sightingsCount} sightings</p>
                              <p className="mt-1 text-xs text-gray-500">{formatDateLabel(lastIdentifiedAt)}</p>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="mt-3 w-full"
                                disabled={isAssigningPair || !selectedSessionFishId}
                                onClick={() => handleAssignPair(fishId)}
                              >
                                {isAssigningPair ? 'Assigning...' : 'Assign as Pair'}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => navigate('/identification')}>
                Back to Identification
              </Button>
              <Button variant="primary" onClick={handleOpenTracking} disabled={!selectedSessionFishId}>
                Open Tracking for Selected Fish
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isLoadingSessionFishes && sessionFishes.length === 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <Spinner size="lg" />
        </div>
      )}
    </div>
  )
}

export default PairMatching
