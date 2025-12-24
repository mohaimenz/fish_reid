import { create } from 'zustand'

const useWorkflowStore = create((set) => ({
  // Photo Upload State
  images: [],
  metadata: {
    latitude: '',
    longitude: '',
    dateTime: new Date().toISOString(),
  },

  // Detection State
  detections: [],
  selectedImageIndex: 0,

  // Identification State
  identifications: [],
  selectedFishId: null,

  // Tracking State
  trackingHistory: null,

  // Actions
  setImages: (images) => set({ images }),
  
  addImage: (image) => set((state) => ({ 
    images: [...state.images, image] 
  })),
  
  removeImage: (index) => set((state) => ({ 
    images: state.images.filter((_, i) => i !== index) 
  })),
  
  setMetadata: (metadata) => set({ metadata }),
  
  updateMetadata: (field, value) => set((state) => ({
    metadata: { ...state.metadata, [field]: value }
  })),

  setDetections: (detections) => set({ detections }),
  
  removeDetection: (imageIndex, detectionIndex) => set((state) => {
    const newDetections = [...state.detections]
    newDetections[imageIndex] = newDetections[imageIndex].filter((_, i) => i !== detectionIndex)
    return { detections: newDetections }
  }),

  setSelectedImageIndex: (index) => set({ selectedImageIndex: index }),

  setIdentifications: (identifications) => set({ identifications }),
  
  setSelectedFishId: (fishId) => set({ selectedFishId: fishId }),

  setTrackingHistory: (trackingHistory) => set({ trackingHistory }),

  resetWorkflow: () => set({
    images: [],
    metadata: {
      latitude: '',
      longitude: '',
      dateTime: new Date().toISOString(),
    },
    detections: [],
    selectedImageIndex: 0,
    identifications: [],
    selectedFishId: null,
    trackingHistory: null,
  }),
}))

export default useWorkflowStore
