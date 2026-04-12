import { api } from './client'
import type {
  FeelingAfter,
  FinishSessionResponse,
  Preset,
  PresetsData,
  ProtocolStep,
  Session,
  StatsInsightsResponse,
  StatsPeriod,
  StatsSummary,
  StatsTimeseriesResponse,
  User,
} from '../types'

function mapFeeling(value: unknown): FeelingAfter | null {
  if (value === 'ENERGIZED' || value === 'energized') return 'energized'
  if (value === 'NORMAL' || value === 'normal') return 'normal'
  if (value === 'HARD' || value === 'hard') return 'hard'
  return null
}

function mapPreset(raw: any): Preset {
  const fallbackSteps = mapSteps(raw)

  return {
    ...raw,
    steps: fallbackSteps,
    progressionEnabled: Boolean(raw.progressionEnabled),
    increaseStepSec: raw.increaseStepSec ?? null,
    increaseEveryNDays: raw.increaseEveryNDays ?? null,
    maxColdDurationSec: raw.maxColdDurationSec ?? null,
    lastProgressionAppliedAt: raw.lastProgressionAppliedAt ?? null,
  }
}

function mapSteps(raw: any): ProtocolStep[] {
  if (Array.isArray(raw?.steps) && raw.steps.length > 0) {
    return raw.steps.map((step: any, index: number) => ({
      id: typeof step?.id === 'string' && step.id ? step.id : `step_${index + 1}`,
      type: step?.type === 'cold' ? 'cold' : 'hot',
      durationSec: Number(step?.durationSec) || 0,
    }))
  }

  return Array.from({ length: raw?.cyclesCount ?? 1 }).flatMap((_, index) => ([
    {
      id: `legacy_hot_${index + 1}`,
      type: 'hot' as const,
      durationSec: raw?.hotDurationSec ?? 0,
    },
    {
      id: `legacy_cold_${index + 1}`,
      type: 'cold' as const,
      durationSec: raw?.coldDurationSec ?? 0,
    },
  ]))
}

function mapSession(raw: any): Session {
  return {
    ...raw,
    feelingAfter: mapFeeling(raw.feelingAfter),
    presetSnapshot: raw.presetSnapshot
      ? {
          steps: mapSteps(raw.presetSnapshot),
          progressionEnabled: false,
          increaseStepSec: null,
          increaseEveryNDays: null,
          maxColdDurationSec: null,
          ...raw.presetSnapshot,
        }
      : raw.presetSnapshot,
  }
}

function mapSummary(raw: any): StatsSummary {
  return {
    ...raw,
    mostCommonFeeling: mapFeeling(raw.mostCommonFeeling),
  }
}

export const authApi = {
  telegram: (initData: string) =>
    api.post<{ token: string; user: User }>('/auth/telegram', { initData }),
}

export const presetsApi = {
  getAll: async () => {
    const data = await api.get<PresetsData>('/presets')
    return {
      system: data.system.map(mapPreset),
      user: data.user.map(mapPreset),
    }
  },
  create: async (data: {
    name: string
    steps: ProtocolStep[]
    progressionEnabled: boolean
    increaseStepSec: number | null
    increaseEveryNDays: number | null
    maxColdDurationSec: number | null
  }) => mapPreset(await api.post<Preset>('/presets', data)),
  update: async (id: string, data: Partial<Omit<Preset, 'id' | 'isSystem'>>) =>
    mapPreset(await api.patch<Preset>(`/presets/${id}`, data)),
  delete: (id: string) => api.delete<void>(`/presets/${id}`),
}

export const sessionsApi = {
  start: async (presetId: string) => mapSession(await api.post<Session>('/sessions/start', { presetId })),
  finish: async (
    id: string,
    data: {
      status: 'COMPLETED' | 'INTERRUPTED'
      completedCycles: number
      actualHotSec: number
      actualColdSec: number
      actualBreakSec: number
    }
  ) => {
    const result = await api.post<FinishSessionResponse>('/sessions/' + id + '/finish', data)
    return {
      ...result,
      session: mapSession(result.session),
    }
  },
  saveFeeling: async (id: string, feelingAfter: FeelingAfter | null) =>
    mapSession(await api.post<Session>(`/sessions/${id}/feeling`, { feelingAfter })),
  getAll: async (page = 1) => {
    const result = await api.get<{ sessions: Session[]; total: number; page: number; limit: number }>(
      `/sessions?page=${page}`
    )
    return {
      ...result,
      sessions: result.sessions.map(mapSession),
    }
  },
  getOne: async (id: string) => mapSession(await api.get<Session>(`/sessions/${id}`)),
}

export const statsApi = {
  getSummary: async (period: StatsPeriod = '7d') =>
    mapSummary(await api.get<StatsSummary>(`/stats/summary?period=${period}`)),
  getTimeseries: (period: StatsPeriod = '7d') =>
    api.get<StatsTimeseriesResponse>(`/stats/timeseries?period=${period}`),
  getInsights: (period: StatsPeriod = '7d') =>
    api.get<StatsInsightsResponse>(`/stats/insights?period=${period}`),
}
