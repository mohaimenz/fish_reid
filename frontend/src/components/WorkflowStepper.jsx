import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useWorkflowStore from '../store/workflowStore'

const steps = [
  { id: 1, name: 'Photo Upload', path: '/upload' },
  { id: 2, name: 'Detection', path: '/detection' },
  { id: 3, name: 'Identification', path: '/identification' },
  { id: 4, name: 'Pair Matching', path: '/pair-matching' },
]

const WorkflowStepper = ({ currentStep = 1 }) => {
  const navigate = useNavigate()
  const { currentSessionId, detections } = useWorkflowStore()

  const handleStepNavigation = (stepId, stepPath) => {
    if (stepId > currentStep) return
    if (stepPath === '/detection') {
      navigate(stepPath, { state: { isResuming: true, sessionId: currentSessionId || null } })
      return
    }
    if (stepPath === '/pair-matching' && !currentSessionId) {
      navigate('/identification')
      return
    }
    if (stepPath === '/identification' && detections.flat().length === 0 && !currentSessionId) {
      navigate('/detection', { state: { isResuming: true, sessionId: currentSessionId } })
      return
    }
    navigate(stepPath)
  }

  return (
    <aside className="workflow-rail">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
        <h2 className="mb-1 text-lg font-bold text-slate-900">Workflow</h2>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Upload to Pair Matching
        </p>
        <nav className="relative mt-4 space-y-2">
          <div className="pointer-events-none absolute left-4 top-4 bottom-4 w-px bg-slate-200" />
          {steps.map((step) => {
            const isCompleted = step.id < currentStep
            const isCurrent = step.id === currentStep
            const isUpcoming = step.id > currentStep
            const isClickable = step.id <= currentStep

            return (
              <button
                type="button"
                key={step.id}
                onClick={() => handleStepNavigation(step.id, step.path)}
                disabled={!isClickable}
                className={`
                  relative flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors
                  ${isCurrent ? 'border-primary-300 bg-primary-50' : ''}
                  ${isCompleted ? 'border-emerald-200 bg-emerald-50' : ''}
                  ${isUpcoming ? 'border-slate-200 bg-slate-50/80' : ''}
                  ${isClickable ? 'hover:border-primary-200 hover:bg-primary-50/70' : 'cursor-not-allowed opacity-70'}
                `}
              >
                <div
                  className={`
                    relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold
                    ${isCurrent ? 'bg-primary-600 text-white' : ''}
                    ${isCompleted ? 'bg-emerald-600 text-white' : ''}
                    ${isUpcoming ? 'bg-slate-300 text-slate-700' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check size={18} />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className={`
                      text-sm font-semibold
                      ${isCurrent ? 'text-primary-900' : ''}
                      ${isCompleted ? 'text-emerald-900' : ''}
                      ${isUpcoming ? 'text-slate-600' : ''}
                    `}
                  >
                    {step.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isCompleted ? 'Completed' : isCurrent ? 'Current step' : 'Upcoming'}
                  </p>
                </div>
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

export default WorkflowStepper
