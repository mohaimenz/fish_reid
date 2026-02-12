import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useWorkflowStore from '../store/workflowStore'

const steps = [
  { id: 1, name: 'Photo Upload', path: '/upload' },
  { id: 2, name: 'Detection', path: '/detection' },
  { id: 3, name: 'Identification', path: '/identification' },
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
    if (stepPath === '/identification' && detections.flat().length === 0 && currentSessionId) {
      navigate('/detection', { state: { isResuming: true, sessionId: currentSessionId } })
      return
    }
    navigate(stepPath)
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Workflow</h2>
      <nav className="space-y-2">
        {steps.map((step) => {
          const isCompleted = step.id < currentStep
          const isCurrent = step.id === currentStep
          const isUpcoming = step.id > currentStep
          const isClickable = step.id <= currentStep

          return (
            <div
              key={step.id}
              onClick={() => handleStepNavigation(step.id, step.path)}
              role="button"
              tabIndex={isClickable ? 0 : -1}
              onKeyDown={(event) => {
                if (!isClickable) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleStepNavigation(step.id, step.path)
                }
              }}
              className={`
                flex items-center p-3 rounded-lg transition-colors
                ${isCurrent ? 'bg-primary-50 border-2 border-primary-500' : ''}
                ${isCompleted ? 'bg-green-50' : ''}
                ${isUpcoming ? 'bg-gray-50 opacity-50' : ''}
                ${isClickable ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed'}
              `}
            >
              <div
                className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  ${isCurrent ? 'bg-primary-600 text-white' : ''}
                  ${isCompleted ? 'bg-green-600 text-white' : ''}
                  ${isUpcoming ? 'bg-gray-300 text-gray-600' : ''}
                `}
              >
                {isCompleted ? (
                  <Check size={18} />
                ) : (
                  <span className="text-sm font-semibold">{step.id}</span>
                )}
              </div>
              <span
                className={`
                  ml-3 text-sm font-medium
                  ${isCurrent ? 'text-primary-900' : ''}
                  ${isCompleted ? 'text-green-900' : ''}
                  ${isUpcoming ? 'text-gray-500' : ''}
                `}
              >
                {step.name}
              </span>
            </div>
          )
        })}
      </nav>
    </div>
  )
}

export default WorkflowStepper
