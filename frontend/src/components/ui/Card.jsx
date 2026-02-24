const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`
        rounded-xl border border-slate-200 bg-white
        shadow-[0_6px_18px_rgba(15,23,42,0.06)]
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-slate-200 ${className}`}>
    {children}
  </div>
)

Card.Body = ({ children, className = '' }) => (
  <div className={`px-6 py-5 ${className}`}>
    {children}
  </div>
)

Card.Footer = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-t border-slate-200 ${className}`}>
    {children}
  </div>
)

export default Card
