import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setAuth: (user, token) => set({ 
    user, 
    token, 
    isAuthenticated: true,
    error: null 
  }),

  setUser: (user) => set({ user }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearAuth: () => set({ 
    user: null, 
    token: null, 
    isAuthenticated: false,
    error: null 
  }),
}))

export default useAuthStore
