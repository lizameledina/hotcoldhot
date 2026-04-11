import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme } from '../types'
import { api } from '../api/client'

interface SettingsState {
  soundEnabled: boolean
  vibrationEnabled: boolean
  theme: Theme
  setSoundEnabled: (v: boolean) => void
  setVibrationEnabled: (v: boolean) => void
  setTheme: (t: Theme) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      vibrationEnabled: true,
      theme: 'SYSTEM' as Theme,
      setSoundEnabled: (v) => {
        set({ soundEnabled: v })
        api.patch('/settings', { soundEnabled: v }).catch(() => {})
      },
      setVibrationEnabled: (v) => {
        set({ vibrationEnabled: v })
        api.patch('/settings', { vibrationEnabled: v }).catch(() => {})
      },
      setTheme: (t) => {
        set({ theme: t })
        api.patch('/settings', { theme: t }).catch(() => {})
      },
    }),
    { name: 'settings-storage' }
  )
)
