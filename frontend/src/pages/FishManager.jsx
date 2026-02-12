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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Fishes</h1>
            <p className="text-gray-600">
              All identified fishes across sessions. Open one to view tracking history.
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
              onClick={() => setPage((prev) => (totalPages > 0 ? Math.min(prev + 1, totalPages) : prev))}
              disabled={isLoading || totalPages === 0 || page >= totalPages}
              icon={<ChevronRight size={16} />}
            >
              Next
            </Button>
          </div>
        </div>

        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}

        <div className="mb-4 text-sm text-gray-600">
          {total > 0
            ? `Showing page ${page} of ${totalPages} (${total} fishes total)`
            : 'No identified fishes yet'}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : fishes.length === 0 ? (
          <Card>
            <Card.Body>
              <p className="text-gray-600">No fishes found.</p>
            </Card.Body>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fishes.map((fish) => {
              const fishId = fish?.fishId || fish?.fish_id || null
              const sightingsCount = fish?.sightingsCount || fish?.sightings_count || 0
              const previewPath = fish?.previewPath || fish?.preview_path || ''
              const lastIdentifiedAt = fish?.lastIdentifiedAt || fish?.last_identified_at || null
              const lastConfidence = fish?.lastConfidence || fish?.last_confidence
              if (!fishId) return null

              return (
                <Card key={fishId}>
                  <Card.Body>
                    <div className="bg-gray-200 rounded-lg h-44 overflow-hidden mb-3 flex items-center justify-center">
                      {previewPath ? (
                        <img
                          src={resolveImageUrl(previewPath)}
                          alt={`Fish ${formatFishIdForDisplay(fishId)}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <p className="text-sm text-gray-500">No preview</p>
                      )}
                    </div>

                    <p className="text-base font-semibold text-gray-900">
                      Fish #{formatFishIdForDisplay(fishId)}
                    </p>
                    <p className="text-xs text-gray-500 break-all mt-1">ID: {fishId}</p>
                    <p className="text-sm text-gray-600 mt-2">Sightings: {sightingsCount}</p>
                    <p className="text-sm text-gray-600">Last seen: {formatDateLabel(lastIdentifiedAt)}</p>
                    <p className="text-sm text-gray-600">
                      Last confidence:{' '}
                      {typeof lastConfidence === 'number' ? `${(lastConfidence * 100).toFixed(1)}%` : 'N/A'}
                    </p>

                    <div className="mt-4">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenTracking(fishId)}
                      >
                        Open Tracking
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default FishManager
