import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Alert from '../components/ui/Alert'
import workflowService from '../services/workflowService'
import useWorkflowStore from '../store/workflowStore'
import { formatFishIdForDisplay } from '../utils/fishId'

const FishManager = () => {
  const navigate = useNavigate()
  const { setSelectedFishId } = useWorkflowStore()

  const [fishes, setFishes] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [editingFishId, setEditingFishId] = useState(null)
  const [fishAliasDraft, setFishAliasDraft] = useState('')
  const [savingFishId, setSavingFishId] = useState(null)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

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
    if (!rawDate) return 'Unknown'
    const parsed = new Date(rawDate)
    if (Number.isNaN(parsed.getTime())) return 'Unknown'
    return parsed.toLocaleString()
  }

  const loadFishes = async (targetPage = page) => {
    setError('')
    setInfoMessage('')
    setIsLoading(true)
    try {
      const response = await workflowService.getIdentifiedFishList({
        page: targetPage,
        pageSize,
      })
      setFishes(response?.fish || [])
      setTotal(Number(response?.total || 0))
      setTotalPages(Number(response?.totalPages ?? response?.total_pages ?? 0))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load fishes.')
      setFishes([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFishes(page)
  }, [page])

  const handleOpenTracking = (fishId) => {
    if (!fishId) return
    setSelectedFishId(fishId)
    navigate('/tracking')
  }

  const handleStartEditAlias = (fishId, currentAlias) => {
    setEditingFishId(fishId)
    setFishAliasDraft(currentAlias || '')
    setError('')
    setInfoMessage('')
  }

  const handleCancelEditAlias = () => {
    setEditingFishId(null)
    setFishAliasDraft('')
  }

  const handleSaveFishAlias = async (fishId) => {
    if (!fishId) return
    setError('')
    setInfoMessage('')
    setSavingFishId(fishId)
    try {
      const response = await workflowService.updateFishAlias({
        fishId,
        fishAlias: fishAliasDraft,
      })
      const savedAlias =
        response?.fishAlias ?? response?.fish_alias ?? response?.fishName ?? response?.fish_name ?? null
      setFishes((prev) =>
        prev.map((fish) => {
          const rowFishId = fish?.fishId || fish?.fish_id || null
          if (rowFishId !== fishId) return fish
          return {
            ...fish,
            fishAlias: savedAlias,
            fish_alias: savedAlias,
          }
        })
      )
      setInfoMessage(
        savedAlias
          ? `Saved alias "${savedAlias}" for fish #${formatFishIdForDisplay(fishId)}.`
          : `Cleared alias for fish #${formatFishIdForDisplay(fishId)}.`
      )
      setEditingFishId(null)
      setFishAliasDraft('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save fish alias.')
    } finally {
      setSavingFishId(null)
    }
  }

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Fishes</h1>
            <p className="page-subtitle">
              Central registry of identified fishes across sessions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => loadFishes(page)}
              disabled={isLoading}
              icon={<RefreshCw size={16} />}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={isLoading || page <= 1}
              icon={<ChevronLeft size={16} />}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setPage((prev) => (totalPages > 0 ? Math.min(prev + 1, totalPages) : prev))
              }
              disabled={isLoading || totalPages === 0 || page >= totalPages}
              icon={<ChevronRight size={16} />}
            >
              Next
            </Button>
          </div>
        </div>

        {error && (
          <Alert type="error" className="mb-5">
            {error}
          </Alert>
        )}
        {infoMessage && (
          <Alert type="info" className="mb-5" onClose={() => setInfoMessage('')}>
            {infoMessage}
          </Alert>
        )}

        <Card className="stagger-in">
          <Card.Header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-bold text-slate-900">Identified Fish List</h2>
            <p className="text-sm text-slate-600">
              {total > 0
                ? `Page ${page} of ${totalPages} · ${total} fishes`
                : 'No identified fishes yet'}
            </p>
          </Card.Header>
          <Card.Body className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : fishes.length === 0 ? (
              <div className="px-6 py-10">
                <p className="text-slate-600">No fishes found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/85 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-3 font-semibold">Fish</th>
                      <th className="px-6 py-3 font-semibold">Alias</th>
                      <th className="px-6 py-3 font-semibold">Sightings</th>
                      <th className="px-6 py-3 font-semibold">Last Seen</th>
                      <th className="px-6 py-3 font-semibold">Confidence</th>
                      <th className="px-6 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fishes.map((fish) => {
                      const fishId = fish?.fishId || fish?.fish_id || null
                      const sightingsCount = fish?.sightingsCount || fish?.sightings_count || 0
                      const previewPath = fish?.previewPath || fish?.preview_path || ''
                      const lastIdentifiedAt =
                        fish?.lastIdentifiedAt || fish?.last_identified_at || null
                      const lastConfidence = fish?.lastConfidence || fish?.last_confidence
                      const fishAlias =
                        fish?.fishAlias || fish?.fish_alias || fish?.fishName || fish?.fish_name || ''
                      const isEditingRow = editingFishId === fishId
                      const isSavingRow = savingFishId === fishId
                      if (!fishId) return null

                      return (
                        <tr key={fishId} className="border-t border-slate-200/80 text-slate-700">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-11 w-11 overflow-hidden rounded-lg bg-slate-200">
                                {previewPath ? (
                                  <img
                                    src={resolveImageUrl(previewPath)}
                                    alt={`Fish ${formatFishIdForDisplay(fishId)}`}
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {fishAlias || `Fish #${formatFishIdForDisplay(fishId)}`}
                                </p>
                                <p className="text-xs text-slate-500">{fishId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {isEditingRow ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={fishAliasDraft}
                                  onChange={(event) => setFishAliasDraft(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault()
                                      handleSaveFishAlias(fishId)
                                    }
                                  }}
                                  placeholder="Enter fish alias"
                                  maxLength={80}
                                  className="h-8 w-44 rounded-md border border-slate-300 px-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="primary"
                                  disabled={isSavingRow}
                                  onClick={() => handleSaveFishAlias(fishId)}
                                >
                                  {isSavingRow ? 'Saving' : 'Save'}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={isSavingRow}
                                  onClick={handleCancelEditAlias}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : fishAlias ? (
                              <p className="font-medium text-slate-900">{fishAlias}</p>
                            ) : (
                              <p className="text-slate-400">No alias</p>
                            )}
                          </td>
                          <td className="px-6 py-4 font-semibold">{sightingsCount}</td>
                          <td className="px-6 py-4">{formatDateLabel(lastIdentifiedAt)}</td>
                          <td className="px-6 py-4">
                            {typeof lastConfidence === 'number'
                              ? `${(lastConfidence * 100).toFixed(1)}%`
                              : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isSavingRow}
                                onClick={() => handleStartEditAlias(fishId, fishAlias)}
                              >
                                Edit Alias
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={isSavingRow}
                                onClick={() => handleOpenTracking(fishId)}
                              >
                                Open Tracking
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}

export default FishManager
