import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

  return (
    <Card>
      <Card.Header>
        <h2 className="text-2xl font-bold text-gray-900">Login</h2>
        <p className="text-sm text-gray-600 mt-1">Welcome back to RabbitFish Tracker</p>
      </Card.Header>
      
      <Card.Body>
        {apiError && (
          <Alert type="error" className="mb-4">
            {apiError}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
            autoComplete="email"
          />
          
          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
            autoComplete="current-password"
          />
          
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </Card.Body>
      
      <Card.Footer>
        <p className="text-sm text-center text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Create account
          </Link>
        </p>
      </Card.Footer>
    </Card>
  )
}

export default Login
