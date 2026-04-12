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
  dailyGoalSessions: number
  setSoundEnabled: (v: boolean) => void
  setVibrationEnabled: (v: boolean) => void
  setTheme: (t: Theme) => void
  setReminderEnabled: (v: boolean) => void
  setReminderTime: (t: string) => void
  setDailyGoalSessions: (value: number) => void
  syncFromServer: (settings: {
    soundEnabled?: boolean
    vibrationEnabled?: boolean
    theme?: Theme
    reminderEnabled?: boolean
    reminderTime?: string | null
    dailyGoalSessions?: number
  } | null | undefined) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      soundEnabled: true,
      vibrationEnabled: true,
      theme: 'SYSTEM' as Theme,
      reminderEnabled: false,
      reminderTime: '',
      dailyGoalSessions: 1,
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
      setDailyGoalSessions: (value) => {
        const normalized = Math.min(10, Math.max(1, Math.round(value)))
        set({ dailyGoalSessions: normalized })
        api.patch('/settings', { dailyGoalSessions: normalized }).catch(() => {})
      },
      syncFromServer: (settings) => {
        if (!settings) return
        set((state) => ({
          soundEnabled: settings.soundEnabled ?? state.soundEnabled,
          vibrationEnabled: settings.vibrationEnabled ?? state.vibrationEnabled,
          theme: settings.theme ?? state.theme,
          reminderEnabled: settings.reminderEnabled ?? state.reminderEnabled,
          reminderTime: settings.reminderTime ?? '',
          dailyGoalSessions: settings.dailyGoalSessions ?? state.dailyGoalSessions,
        }))
      },
    }),
    { name: 'settings-storage' }
  )
)
