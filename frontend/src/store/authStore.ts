import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { setAuthToken } from '../api/client'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  setAuth: (token: string, user: User) => void
  updateSettings: (settings: Partial<User['settings']>) => void
  logout: () => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      setAuth: (token, user) => {
        setAuthToken(token)
        set({ token, user, isAuthenticated: true, error: null })
      },
      updateSettings: (settings) => {
        const user = get().user
        if (!user) return
        set({
          user: {
            ...user,
            settings: user.settings ? { ...user.settings, ...settings } : null,
          },
        })
      },
      logout: () => {
        setAuthToken('')
        set({ token: null, user: null, isAuthenticated: false })
      },
      setLoading: (v) => set({ isLoading: v }),
      setError: (e) => set({ error: e }),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthToken(state.token)
        }
      },
    }
  )
)
