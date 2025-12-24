import apiClient from './apiClient'

const authService = {
  // Register new user
  register: async (userData) => {
    const endpoint = import.meta.env.VITE_AUTH_REGISTER_ENDPOINT || '/auth/register'
    const response = await apiClient.post(endpoint, userData)
    return response.data
  },

  // Login user
  login: async (credentials) => {
    const endpoint = import.meta.env.VITE_AUTH_LOGIN_ENDPOINT || '/auth/login'
    const response = await apiClient.post(endpoint, credentials)
    
    // Store token
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
    }
    
    return response.data
  },

  // Logout user
  logout: async () => {
    const endpoint = import.meta.env.VITE_AUTH_LOGOUT_ENDPOINT || '/auth/logout'
    try {
      await apiClient.post(endpoint)
    } finally {
      localStorage.removeItem('token')
    }
  },

  // Get current user
  me: async () => {
    const endpoint = import.meta.env.VITE_AUTH_ME_ENDPOINT || '/auth/me'
    const response = await apiClient.get(endpoint)
    return response.data
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token')
  },
}

export default authService
