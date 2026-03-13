import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, LogIn, Mail } from 'lucide-react'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import authService from '../services/authService'
import useAuthStore from '../store/authStore'

const Login = () => {
  const navigate = useNavigate()
  const { setAuth, setLoading, setError } = useAuthStore()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const formRef = useRef(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }
    
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setIsSubmitting(true)
    setLoading(true)
    
    try {
      const response = await authService.login(formData)
      // console.log('Login successful:', response)
      setAuth(response.user, response.token, response.resume_option)
      navigate('/upload')
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.'
      setApiError(message)
      setError(message)
    } finally {
      setIsSubmitting(false)
      setLoading(false)
    }
  }

  const handleFormKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) {
      return
    }

    // Ensure Enter submits consistently across inputs/browsers.
    if (formRef.current) {
      e.preventDefault()
      formRef.current.requestSubmit()
    }
  }

  return (
    <Card className="stagger-in rounded-[20px] border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.10)]">
      <Card.Header>
        <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
        <p className="mt-1 text-sm text-slate-600">Sign in to return to your survey work and reviewed fish records.</p>
      </Card.Header>
      
      <Card.Body>
        {apiError && (
          <Alert type="error" className="mb-4">
            {apiError}
          </Alert>
        )}
        
        <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-4">
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            icon={<Mail size={16} />}
            required
            autoComplete="email"
            placeholder="name@organization.org"
          />
          
          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            icon={<Lock size={16} />}
            required
            autoComplete="current-password"
            placeholder="Enter your password"
          />
          
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            icon={<LogIn size={16} />}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Card.Body>
      
      <Card.Footer>
        <p className="text-center text-sm text-slate-600">
          Need access?{' '}
          <Link to="/register" className="font-semibold text-primary-700 hover:text-primary-500">
            Request an account
          </Link>
        </p>
      </Card.Footer>
    </Card>
  )
}

export default Login
