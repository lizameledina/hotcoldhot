import { api } from './client'
import type { User, Preset, PresetsData, Session, StatsSummary } from '../types'

// Auth
export const authApi = {
  telegram: (initData: string) =>
    api.post<{ token: string; user: User }>('/auth/telegram', { initData }),
}

// Presets
export const presetsApi = {
  getAll: () => api.get<PresetsData>('/presets'),
  create: (data: {
    name: string
    hotDurationSec: number
    coldDurationSec: number
    breakDurationSec: number
    cyclesCount: number
  }) => api.post<Preset>('/presets', data),
  update: (id: string, data: Partial<Omit<Preset, 'id' | 'isSystem'>>) =>
    api.patch<Preset>(`/presets/${id}`, data),
  delete: (id: string) => api.delete<void>(`/presets/${id}`),
}

// Sessions
export const sessionsApi = {
  start: (presetId: string) =>
    api.post<Session>('/sessions/start', { presetId }),
  finish: (
    id: string,
    data: {
      status: 'COMPLETED' | 'INTERRUPTED'
      completedCycles: number
      actualHotSec: number
      actualColdSec: number
      actualBreakSec: number
    }
  ) => api.post<Session>(`/sessions/${id}/finish`, data),
  getAll: (page = 1) => api.get<{ sessions: Session[]; total: number; page: number; limit: number }>(`/sessions?page=${page}`),
  getOne: (id: string) => api.get<Session>(`/sessions/${id}`),
}

// Stats
export const statsApi = {
  getSummary: () => api.get<StatsSummary>('/stats/summary'),
}
