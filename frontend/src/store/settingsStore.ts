import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme } from '../types'
import { api } from '../api/client'

interface SettingsState {
  soundEnabled: boolean
  vibrationEnabled: boolean
  theme: Theme
  reminderEnabled: boolean
  reminderTime: string // HH:mm, empty string = not set
  setSoundEnabled: (v: boolean) => void
  setVibrationEnabled: (v: boolean) => void
  setTheme: (t: Theme) => void
  setReminderEnabled: (v: boolean) => void
  setReminderTime: (t: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      soundEnabled: true,
      vibrationEnabled: true,
      theme: 'SYSTEM' as Theme,
      reminderEnabled: false,
      reminderTime: '',
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
      setReminderEnabled: (v) => {
        const { reminderTime } = get()
        // Don't enable if no time is set — validation handled in UI
        set({ reminderEnabled: v })
        api
          .patch('/settings', { reminderEnabled: v, reminderTime: reminderTime || undefined })
          .catch(() => {})
      },
      setReminderTime: (t) => {
        set({ reminderTime: t })
        const { reminderEnabled } = get()
        api
          .patch('/settings', { reminderTime: t || null, reminderEnabled })
          .catch(() => {})
      },
    }),
    { name: 'settings-storage' }
  )
)
