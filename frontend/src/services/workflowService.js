import apiClient from './apiClient'

const workflowService = {
  // Upload images with metadata
  uploadImages: async (formData) => {
    alert(localStorage.getItem('token') || '')
    const endpoint = import.meta.env.VITE_UPLOAD_ENDPOINT || '/upload'
    const response = await apiClient.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'token': localStorage.getItem('token') || ''
      },
    })
    return response.data
  },

  // Run RabbitFish detection
  detect: async (payload) => {
    const endpoint = import.meta.env.VITE_DETECT_ENDPOINT || '/detect'
    const response = await apiClient.post(endpoint, payload)
    return response.data
  },

  // Run RabbitFish identification
  identify: async (payload) => {
    const endpoint = import.meta.env.VITE_IDENTIFY_ENDPOINT || '/identify'
    const response = await apiClient.post(endpoint, payload)
    return response.data
  },

  // Get tracking history
  getTrackingHistory: async (fishId) => {
    const endpoint = import.meta.env.VITE_TRACKING_ENDPOINT || '/tracking'
    const response = await apiClient.get(`${endpoint}/${fishId}`)
    return response.data
  },
}

export default workflowService
