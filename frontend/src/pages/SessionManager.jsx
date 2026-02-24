import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, RefreshCw, Trash2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Alert from '../components/ui/Alert'
import workflowService from '../services/workflowService'
import useWorkflowStore from '../store/workflowStore'

const SessionManager = () => {
  const navigate = useNavigate()
  const {
    currentSessionId,
    sessionHistory,
    setCurrentSessionId,
    setSessionHistory,
  } = useWorkflowStore()

  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  const loadSessions = async () => {
    setError('')
    setIsLoading(true)
    try {
      const response = await workflowService.getSessionHistory()
      setSessionHistory(response?.sessions || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sessions.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const handleOpenSession = (session) => {
    const sessionId = session?.id
    if (!sessionId) return
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

  const handleDeleteSession = async (sessionId) => {
    const shouldDelete = window.confirm(
      'Delete this session and all related uploads/annotations/identification data? This cannot be undone.'
    )
    if (!shouldDelete) return

    setError('')
    setIsDeleting(true)
    try {
      await workflowService.deleteSession(sessionId)
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null)
      }
      await loadSessions()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete session.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Manage Sessions</h1>
            <p className="page-subtitle">
              Open or delete workflow sessions. Deleting a session removes all associated data.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={loadSessions}
            disabled={isLoading || isDeleting}
            icon={<RefreshCw size={16} />}
          >
            Refresh
          </Button>
        </div>

        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : sessionHistory.length === 0 ? (
          <Card>
            <Card.Body>
              <p className="text-gray-600">No sessions found yet.</p>
            </Card.Body>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessionHistory.map((session) => (
              <Card key={session.id} className="stagger-in">
                <Card.Body>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {session.name || `Session ${session.id.slice(-6)}`}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        Status: {session.status} | Step: {session.current_step}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        Uploads: {session.stats?.uploads_count || 0} | Annotations: {session.stats?.annotations_count || 0} | Identified: {session.stats?.identified_count || 0}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Session ID: {session.id}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleOpenSession(session)}
                        disabled={isDeleting}
                        icon={<FolderOpen size={16} />}
                      >
                        Open
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteSession(session.id)}
                        disabled={isDeleting}
                        icon={<Trash2 size={16} />}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SessionManager
