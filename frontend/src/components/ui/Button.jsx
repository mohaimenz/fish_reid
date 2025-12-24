import { Link as RouterLink } from 'react-router-dom'

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  to,
  icon,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }
  
  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`
  
  const content = (
    <>
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </>
  )
  
  if (to) {
    return (
      <RouterLink to={to} className={classes} {...props}>
        {content}
      </RouterLink>
    )
  }
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      {...props}
    >
      {content}
    </button>
  )
}

export default Button
