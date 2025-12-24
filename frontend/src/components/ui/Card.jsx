const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
    {children}
  </div>
)

Card.Body = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
)

Card.Footer = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-t border-gray-200 ${className}`}>
    {children}
  </div>
)

export default Card
