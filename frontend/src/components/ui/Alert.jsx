import { AlertCircle, CheckCircle, Info, X, XCircle } from 'lucide-react'

const Alert = ({ 
  type = 'info', 
  title, 
  children, 
  onClose,
  className = '' 
}) => {
  const types = {
    info: {
      bg: 'bg-blue-100/90',
      border: 'border-blue-500/60',
      text: 'text-blue-700',
      icon: <Info className="w-5 h-5 text-blue-600" />,
    },
    success: {
      bg: 'bg-green-100/90',
      border: 'border-green-500/60',
      text: 'text-emerald-900',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    },
    warning: {
      bg: 'bg-amber-50/90',
      border: 'border-amber-200/90',
      text: 'text-amber-900',
      icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
    },
    error: {
      bg: 'bg-red-50/90',
      border: 'border-red-200/90',
      text: 'text-red-900',
      icon: <XCircle className="w-5 h-5 text-red-600" />,
    },
  }

  const style = types[type]

  return (
    <div
      className={`
        ${style.bg} ${style.border} ${style.text}
        rounded-xl border p-4 shadow-[0_4px_14px_rgba(15,35,60,0.08)] ${className}
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{style.icon}</div>
        <div className="ml-3 flex-1">
          {title && <h3 className="mb-1 text-sm font-semibold">{title}</h3>}
          <div className="text-sm">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-700"
            aria-label="Close alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default Alert
