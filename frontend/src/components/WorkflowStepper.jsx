import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useWorkflowStore from '../store/workflowStore'

const steps = [
  { id: 1, name: 'Survey Setup', path: '/upload' },
  { id: 2, name: 'Detection Review', path: '/detection' },
  { id: 3, name: 'Identity Review', path: '/identification' },
  { id: 4, name: 'Pair Review', path: '/pair-matching' },
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
      <div className="rounded-xl border border-primary-100 bg-white/96 p-4 shadow-[0_10px_24px_rgba(20,105,117,0.08)]">
        <h2 className="mb-1 text-lg font-bold text-slate-900">Research Flow</h2>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700/75">
          From survey setup to pair review
        </p>
        <nav className="relative mt-4 space-y-2">
          <div className="pointer-events-none absolute left-4 top-4 bottom-4 w-px bg-primary-100" />
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
                  ${isCurrent ? 'border-primary-300 bg-primary-50/95' : ''}
                  ${isCompleted ? 'border-[#c7ecd9] bg-[#edf9f3]' : ''}
                  ${isUpcoming ? 'border-[#dbeceb] bg-[#f7fcfb]' : ''}
                  ${isClickable ? 'hover:border-primary-200 hover:bg-primary-50/70' : 'cursor-not-allowed opacity-70'}
                `}
              >
                <div
                  className={`
                    relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold
                    ${isCurrent ? 'bg-primary-600 text-white' : ''}
                    ${isCompleted ? 'bg-[#3ba57d] text-white' : ''}
                    ${isUpcoming ? 'bg-[#dcebea] text-[#4b6872]' : ''}
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
                      ${isCompleted ? 'text-[#256b53]' : ''}
                      ${isUpcoming ? 'text-slate-600' : ''}
                    `}
                  >
                    {step.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isCompleted ? 'Done' : isCurrent ? 'You are here' : 'Coming up'}
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
