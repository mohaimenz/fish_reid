import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail, UserRound, UserRoundPlus } from 'lucide-react'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import authService from '../services/authService'
import useAuthStore from '../store/authStore'

const Register = () => {
  const navigate = useNavigate()
  const { setAuth, setLoading, setError } = useAuthStore()
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

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
    
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Full name is required (minimum 2 characters)'
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
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
      const { confirmPassword, ...registerData } = formData
      const response = await authService.register(registerData)
      
      // If backend returns token, auto-login
      if (response.token) {
        setAuth(response.user, response.token)
        navigate('/upload')
      } else {
        // Otherwise redirect to login
        navigate('/login')
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.'
      setApiError(message)
      setError(message)
    } finally {
      setIsSubmitting(false)
      setLoading(false)
    }
  }

  return (
    <Card className="stagger-in rounded-[20px] border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.10)]">
      <Card.Header>
        <h2 className="text-2xl font-bold text-slate-900">Join the project</h2>
        <p className="mt-1 text-sm text-slate-600">Create your researcher account to review surveys, confirm identities, and track sightings over time.</p>
      </Card.Header>
      
      <Card.Body>
        {apiError && (
          <Alert type="error" className="mb-4">
            {apiError}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            icon={<UserRound size={16} />}
            required
            autoComplete="name"
            placeholder="Dr. Jane Doe"
          />
          
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
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
          
          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            icon={<Lock size={16} />}
            required
            autoComplete="new-password"
            placeholder="Repeat your password"
          />
          
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            icon={<UserRoundPlus size={16} />}
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
      </Card.Body>
      
      <Card.Footer>
        <p className="text-center text-sm text-slate-600">
          Already part of the project?{' '}
          <Link to="/login" className="font-semibold text-primary-700 hover:text-primary-500">
            Sign in
          </Link>
        </p>
      </Card.Footer>
    </Card>
  )
}

export default Register
