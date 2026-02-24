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
      'border-primary-700 bg-primary-700 text-white shadow-sm hover:border-primary-800 hover:bg-primary-800 focus-visible:ring-primary-500',
    secondary:
      'border-slate-700 bg-slate-700 text-white shadow-sm hover:border-slate-800 hover:bg-slate-800 focus-visible:ring-slate-500',
    outline:
      'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-primary-500',
    danger:
      'border-red-300 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100 focus-visible:ring-red-500',
    light:
      'border-white bg-white text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-300',
    ghost:
      'border-transparent bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-500',
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
