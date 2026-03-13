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
  const baseStyles =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border font-medium leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none'
  
  const variants = {
    primary:
      'border-primary-500 bg-primary-500 text-white shadow-sm hover:border-primary-700 hover:bg-primary-700 focus-visible:ring-primary-500 active:border-primary-900 active:bg-primary-900',
    secondary:
      'border-teal-500 bg-teal-500 text-white shadow-sm hover:border-teal-700 hover:bg-teal-700 focus-visible:ring-primary-500 active:border-teal-800 active:bg-teal-800',
    outline:
      'border-slate-300 bg-white text-primary-700 hover:border-slate-400 hover:bg-slate-100 focus-visible:ring-primary-500',
    danger:
      'border-red-500 bg-red-500 text-white hover:border-red-700 hover:bg-red-700 focus-visible:ring-red-500',
    light:
      'border-white bg-white text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-300',
    ghost:
      'border-transparent bg-transparent text-primary-700 hover:bg-primary-100 focus-visible:ring-primary-500',
  }
  
  const sizes = {
    sm: 'h-8 px-3 text-[13px]',
    md: 'h-9 px-3.5 text-sm',
    lg: 'h-10 px-4 text-sm',
  }
  
  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`
  
  const content = (
    <>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </>
  )
  
  if (to) {
    return (
      <RouterLink
        to={to}
        className={`${classes} ${disabled ? 'pointer-events-none' : ''}`}
        {...props}
      >
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
