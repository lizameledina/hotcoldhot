import { create } from 'zustand'
import type { StatsSummary } from '../types'
import { statsApi } from '../api'

interface StatsState {
  summary: StatsSummary | null
  isLoading: boolean
  fetch: () => Promise<void>
  invalidate: () => void
}

export const useStatsStore = create<StatsState>()((set) => ({
  summary: null,
  isLoading: false,

  fetch: async () => {
    set({ isLoading: true })
    try {
      const data = await statsApi.getSummary()
      set({ summary: data })
    } catch {
      // non-critical — UI degrades gracefully
    } finally {
      set({ isLoading: false })
    }
  },

  // Call after a session completes so the next fetch gets fresh data
  invalidate: () => set({ summary: null }),
}))
