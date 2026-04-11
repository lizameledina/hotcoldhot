import { create } from 'zustand'
import type { Preset, PresetsData } from '../types'
import { presetsApi } from '../api'

interface PresetsState {
  system: Preset[]
  user: Preset[]
  isLoading: boolean
  lastPresetId: string | null
  fetch: () => Promise<void>
  create: (data: Omit<Preset, 'id' | 'isSystem' | 'userId' | 'createdAt'>) => Promise<Preset>
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
    set((s) => ({ user: [preset, ...s.user] }))
    return preset
  },

  update: async (id, data) => {
    const updated = await presetsApi.update(id, data)
    set((s) => ({
      user: s.user.map((p) => (p.id === id ? updated : p)),
    }))
  },

  remove: async (id) => {
    await presetsApi.delete(id)
    set((s) => ({ user: s.user.filter((p) => p.id !== id) }))
  },

  setLastPreset: (id) => set({ lastPresetId: id }),

  getById: (id) => {
    const s = get()
    return s.system.find((p) => p.id === id) || s.user.find((p) => p.id === id)
  },
}))
