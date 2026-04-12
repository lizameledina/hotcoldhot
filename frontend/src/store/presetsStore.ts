import { create } from 'zustand'
import type { Preset, PresetsData, ProtocolStep } from '../types'
import { presetsApi } from '../api'

type PresetPayload = {
  name: string
  steps: ProtocolStep[]
  progressionEnabled: boolean
  increaseStepSec: number | null
  increaseEveryNDays: number | null
  maxColdDurationSec: number | null
}

interface PresetsState {
  system: Preset[]
  user: Preset[]
  isLoading: boolean
  lastPresetId: string | null
  fetch: () => Promise<void>
  create: (data: PresetPayload) => Promise<Preset>
  update: (id: string, data: Partial<Omit<Preset, 'id' | 'isSystem'>>) => Promise<void>
  remove: (id: string) => Promise<void>
  setLastPreset: (id: string) => void
  getById: (id: string) => Preset | undefined
}

export const usePresetsStore = create<PresetsState>((set, get) => ({
  system: [],
  user: [],
  isLoading: false,
  lastPresetId: null,

  fetch: async () => {
    set({ isLoading: true })
    try {
      const data: PresetsData = await presetsApi.getAll()
      set({ system: data.system, user: data.user })
    } finally {
      set({ isLoading: false })
    }
  },

  create: async (data) => {
    const preset = await presetsApi.create(data)
    set((state) => ({ user: [preset, ...state.user] }))
    return preset
  },

  update: async (id, data) => {
    const updated = await presetsApi.update(id, data)
    set((state) => ({
      user: state.user.map((preset) => (preset.id === id ? updated : preset)),
    }))
  },

  remove: async (id) => {
    await presetsApi.delete(id)
    set((state) => ({
      user: state.user.filter((preset) => preset.id !== id),
      system: state.system.filter((preset) => preset.id !== id),
      lastPresetId: state.lastPresetId === id ? null : state.lastPresetId,
    }))
  },

  setLastPreset: (id) => set({ lastPresetId: id }),

  getById: (id) => {
    const state = get()
    return state.system.find((preset) => preset.id === id) || state.user.find((preset) => preset.id === id)
  },
}))
