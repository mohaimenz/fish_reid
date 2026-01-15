import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  resumeOption: false,

  setAuth: (user, token, resumeOption = false) => set({ 
    user, 
    token, 
    isAuthenticated: true,
    error: null,
    resumeOption 
  }),

  setUser: (user) => set({ user }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearAuth: () => set({ 
    user: null, 
    token: null, 
    isAuthenticated: false,
    error: null,
    resumeOption: false 
  }),
}))

export default useAuthStore
