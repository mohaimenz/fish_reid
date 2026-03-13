const hasUtilityPrefix = (className, prefixes) => {
  return prefixes.some((prefix) => className.includes(prefix))
}

const Card = ({ children, className = '', ...props }) => {
  const hasBackgroundOverride = hasUtilityPrefix(className, ['bg-', 'from-', 'via-', 'to-'])
  const hasBorderOverride = hasUtilityPrefix(className, ['border-'])
  const hasShadowOverride = hasUtilityPrefix(className, ['shadow-'])

  return (
    <div
      className={`
        rounded-xl border
        ${hasBorderOverride ? '' : 'border-slate-200'}
        ${hasBackgroundOverride ? '' : 'bg-white'}
        ${hasShadowOverride ? '' : 'shadow-[0_1px_2px_rgba(15,23,42,0.06)]'}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = ({ children, className = '' }) => {
  const hasBorderOverride = hasUtilityPrefix(className, ['border-'])

  return (
    <div className={`px-6 py-4 border-b ${hasBorderOverride ? '' : 'border-slate-200'} ${className}`}>
      {children}
    </div>
  )
}

Card.Body = ({ children, className = '' }) => <div className={`px-6 py-5 ${className}`}>{children}</div>

Card.Footer = ({ children, className = '' }) => {
  const hasBorderOverride = hasUtilityPrefix(className, ['border-'])

  return (
    <div className={`px-6 py-4 border-t ${hasBorderOverride ? '' : 'border-slate-200'} ${className}`}>
      {children}
    </div>
  )
}

export default Card
