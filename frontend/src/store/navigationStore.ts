import { create } from 'zustand'
import type { Screen, Preset, Session } from '../types'

interface NavigationState {
  screen: Screen
  editingPreset: Preset | null
  selectedSession: Session | null
  navigate: (screen: Screen) => void
  navigateToEdit: (preset: Preset) => void
  navigateToSessionDetail: (session: Session) => void
  goBack: () => void
  history: Screen[]
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  screen: 'home',
  editingPreset: null,
  selectedSession: null,
  history: [],

  navigate: (screen) => {
    const current = get().screen
    set((s) => ({ screen, history: [...s.history, current] }))
  },

  navigateToEdit: (preset) => {
    const current = get().screen
    set((s) => ({
      screen: 'edit-preset',
      editingPreset: preset,
      history: [...s.history, current],
    }))
  },

  navigateToSessionDetail: (session) => {
    const current = get().screen
    set((s) => ({
      screen: 'session-detail',
      selectedSession: session,
      history: [...s.history, current],
    }))
  },

  goBack: () => {
    const history = get().history
    if (history.length === 0) return
    const prev = history[history.length - 1]
    set({ screen: prev, history: history.slice(0, -1) })
  },
}))
