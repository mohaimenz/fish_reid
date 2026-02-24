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

  getSessionIdentifications: async (sessionId) => {
    const endpoint = import.meta.env.VITE_IDENTIFY_ENDPOINT || '/identify'
    const response = await apiClient.get(`${endpoint}/session/${sessionId}`)
    return response.data
  },

  getIdentifiedFishList: async ({ page = 1, pageSize = 8 } = {}) => {
    const endpoint = import.meta.env.VITE_IDENTIFY_ENDPOINT || '/identify'
    const response = await apiClient.get(`${endpoint}/fish`, {
      params: {
        page,
        pageSize,
      },
    })
    return response.data
  },

  createNewIdentity: async (annotationId) => {
    const endpoint = import.meta.env.VITE_IDENTIFY_ENDPOINT || '/identify'
    const response = await apiClient.post(`${endpoint}/create-identity`, {
      annotationId,
    })
    return response.data
  },

  assignIdentity: async ({ annotationId, fishId }) => {
    const endpoint = import.meta.env.VITE_IDENTIFY_ENDPOINT || '/identify'
    const response = await apiClient.post(`${endpoint}/assign`, {
      annotationId,
      fishId,
    })
    return response.data
  },

  updateFishAlias: async ({ fishId, fishAlias }) => {
    const endpoint = import.meta.env.VITE_IDENTIFY_ENDPOINT || '/identify'
    const response = await apiClient.patch(`${endpoint}/fish/${fishId}/alias`, {
      fishAlias,
    })
    return response.data
  },

  generateVisualization: async ({
    queryAnnotationId = null,
    matchAnnotationId = null,
    visualizationVariant = 'gradcam',
    forceRegenerate = false,
  } = {}) => {
    const endpoint = import.meta.env.VITE_IDENTIFY_ENDPOINT || '/identify'
    const payload = {
      visualizationVariant,
      forceRegenerate,
      ...(queryAnnotationId ? { queryAnnotationId } : {}),
      ...(matchAnnotationId ? { matchAnnotationId } : {}),
    }
    const response = await apiClient.post(`${endpoint}/visualization`, payload)
    return response.data
  },

  getSessionPairing: async (sessionId) => {
    const response = await apiClient.get(`/pairing/session/${sessionId}`)
    return response.data
  },

  getFishPairHistory: async ({ fishId, sessionId = null }) => {
    const response = await apiClient.get(`/pairing/fish/${fishId}/history`, {
      params: sessionId ? { sessionId } : undefined,
    })
    return response.data
  },

  assignSessionPair: async ({ sessionId, fishId, pairFishId }) => {
    const response = await apiClient.post(`/pairing/session/${sessionId}/assign`, {
      fishId,
      pairFishId,
    })
    return response.data
  },

  // Get tracking history
  getTrackingHistory: async (fishId) => {
    const endpoint = import.meta.env.VITE_TRACKING_ENDPOINT || '/tracking'
    const response = await apiClient.get(`${endpoint}/${fishId}`)
    return response.data
  },

  // Get incomplete session (photos detected but not identified)
  getIncompleteSession: async (sessionId = null, includeIdentified = false) => {
    const endpoint = import.meta.env.VITE_RESUME_DETECTION_ENDPOINT || '/resume-detection'
    const params = {}
    if (sessionId) {
      params.sessionId = sessionId
    }
    if (includeIdentified) {
      params.includeIdentified = true
    }
    const response = await apiClient.get(endpoint, {
      params: Object.keys(params).length > 0 ? params : undefined,
    })
    return response.data
  },

  // Check if user has unfinished work (lightweight)
  checkUnfinishedWork: async (sessionId = null) => {
    const endpoint = import.meta.env.VITE_CHECK_UNFINISHED_ENDPOINT || '/check-unfinished'
    const response = await apiClient.get(endpoint, {
      params: sessionId ? { sessionId } : undefined,
    })
    return response.data
  },

  // Discard all unidentified annotations
  discardUnidentifiedAnnotations: async (sessionId = null) => {
    const endpoint = import.meta.env.VITE_DISCARD_PREV_UNFINISHED_ENDPOINT || '/discard-prev-unfinished'
    const response = await apiClient.delete(endpoint, {
      data: sessionId ? { sessionId } : {},
    })
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

  // Create a new site
  createSite: async ({ name, lat, long }) => {
    const endpoint = import.meta.env.VITE_CREATE_SITE_ENDPOINT || '/photo/site'
    const formData = new FormData()
    formData.append('name', name)
    formData.append('lat', lat)
    formData.append('long', long)
    const response = await apiClient.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  createSession: async ({ name = null, siteId = null } = {}) => {
    const endpoint = import.meta.env.VITE_SESSION_CREATE_ENDPOINT || '/session/create'
    const response = await apiClient.post(endpoint, {
      ...(name ? { name } : {}),
      ...(siteId ? { siteId } : {}),
    })
    return response.data
  },

  getSessionHistory: async () => {
    const endpoint = import.meta.env.VITE_SESSION_HISTORY_ENDPOINT || '/session/history'
    const response = await apiClient.get(endpoint)
    return response.data
  },

  getSession: async (sessionId) => {
    const endpointBase = import.meta.env.VITE_SESSION_DETAIL_ENDPOINT || '/session'
    const response = await apiClient.get(`${endpointBase}/${sessionId}`)
    return response.data
  },

  completeSession: async (sessionId) => {
    const endpointBase = import.meta.env.VITE_SESSION_DETAIL_ENDPOINT || '/session'
    const response = await apiClient.post(`${endpointBase}/${sessionId}/complete`)
    return response.data
  },

  deleteSession: async (sessionId) => {
    const endpointBase = import.meta.env.VITE_SESSION_DETAIL_ENDPOINT || '/session'
    const response = await apiClient.delete(`${endpointBase}/${sessionId}`)
    return response.data
  },
}

export default workflowService
