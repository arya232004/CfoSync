import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from './api'

export interface User {
  id: string
  email: string
  name: string
  user_type: 'individual' | 'company'
  is_onboarded: boolean
  created_at: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name: string, userType: string) => Promise<boolean>
  logout: () => void
  fetchUser: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/login', { email, password })
          const { access_token } = response.data
          
          // Set token in axios defaults
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
          
          set({ 
            token: access_token, 
            isAuthenticated: true,
            isLoading: false 
          })
          
          // Fetch full user data
          await get().fetchUser()
          
          return true
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Login failed'
          set({ error: message, isLoading: false })
          return false
        }
      },

      register: async (email: string, password: string, name: string, userType: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/register', {
            email,
            password,
            name,
            user_type: userType,
          })
          const { access_token } = response.data
          
          // Set token in axios defaults
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
          
          set({ 
            token: access_token, 
            isAuthenticated: true,
            isLoading: false 
          })
          
          // Fetch full user data
          await get().fetchUser()
          
          return true
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Registration failed'
          set({ error: message, isLoading: false })
          return false
        }
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization']
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          error: null 
        })
      },

      fetchUser: async () => {
        const { token } = get()
        if (!token) return
        
        try {
          // Ensure token is set
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          const response = await api.get('/auth/me')
          set({ user: response.data })
        } catch (error) {
          // Token might be invalid
          get().logout()
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'cfosync-auth',
      partialize: (state) => ({ 
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, fetch user if token exists
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
          state.fetchUser()
        }
      },
    }
  )
)
