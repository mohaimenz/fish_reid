const Input = ({
  label,
  error,
  type = 'text',
  id,
  className = '',
  required = false,
  icon = null,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-semibold text-slate-700"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          type={type}
          className={`
            w-full rounded-xl border bg-white/95 px-4 py-2.5 text-slate-900
            placeholder:text-slate-400
            focus:border-primary-400 focus:ring-4 focus:ring-primary-100
            disabled:cursor-not-allowed disabled:bg-slate-100
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-400 focus:ring-red-100 focus:border-red-400' : 'border-slate-300'}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  )
}

export default Input
