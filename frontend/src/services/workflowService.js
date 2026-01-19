import apiClient from './apiClient'

const workflowService = {
  // Upload images with metadata
  uploadImages: async (formData) => {
    const endpoint = import.meta.env.VITE_UPLOAD_ENDPOINT || '/upload'
    const response = await apiClient.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
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

  // Get incomplete session (photos detected but not identified)
  getIncompleteSession: async () => {
    const endpoint = import.meta.env.VITE_RESUME_DETECTION_ENDPOINT || '/resume-detection'
    const response = await apiClient.get(endpoint)
    return response.data
  },

  // Check if user has unfinished work (lightweight)
  checkUnfinishedWork: async () => {
    const endpoint = import.meta.env.VITE_CHECK_UNFINISHED_ENDPOINT || '/check-unfinished'
    const response = await apiClient.get(endpoint)
    return response.data
  },

  // Discard all unidentified annotations
  discardUnidentifiedAnnotations: async () => {
    const endpoint = import.meta.env.VITE_DISCARD_PREV_UNFINISHED_ENDPOINT || '/discard-prev-unfinished'
    const response = await apiClient.delete(endpoint)
    return response.data
  },

  // Delete a specific bounding box/annotation
  deleteBbox: async (annotationId) => {
    const endpoint = import.meta.env.VITE_DELETE_BBOX_ENDPOINT || '/delete-bbox'
    const response = await apiClient.delete(endpoint, {
      data: { annotationId }
    })
    return response.data
  },

  // Save manually drawn annotation
  saveManualAnnotation: async (data) => {
    const endpoint = import.meta.env.VITE_SAVE_MANUAL_ANNOTATION_ENDPOINT || '/save-manual-annotation'
    const response = await apiClient.post(endpoint, data)
    return response.data
  },

  // Delete entire image with all annotations
  deleteImage: async (uploadId) => {
    const endpoint = import.meta.env.VITE_DELETE_IMAGE_ENDPOINT || '/delete-image'
    const response = await apiClient.delete(endpoint, {
      data: { uploadId }
    })
    return response.data
  },

  // Get all sites for map selection
  getSites: async () => {
    const endpoint = import.meta.env.VITE_SITES_ENDPOINT || '/sites'
    const response = await apiClient.get(endpoint)
    return response.data
  },
}

export default workflowService
