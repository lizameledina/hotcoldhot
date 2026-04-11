export type Theme = 'SYSTEM' | 'LIGHT' | 'DARK'

export interface UserSettings {
  id: string
  userId: string
  soundEnabled: boolean
  vibrationEnabled: boolean
  theme: Theme
  currentStreak: number
  bestStreak: number
  lastCompletedDate: string | null
  reminderEnabled: boolean
  reminderTime: string | null
}

export interface User {
  id: string
  firstName: string
  lastName?: string | null
  username?: string | null
  settings: UserSettings | null
}

export interface Preset {
  id: string
  userId?: string | null
  name: string
  hotDurationSec: number
  coldDurationSec: number
  breakDurationSec: number
  cyclesCount: number
  isSystem: boolean
  createdAt?: string
}

export type SessionStatus = 'COMPLETED' | 'INTERRUPTED'

export interface Session {
  id: string
  userId: string
  presetId?: string | null
  presetSnapshot: Preset
  status: SessionStatus
  startedAt: string
  endedAt?: string | null
  completedCycles: number
  plannedCycles: number
  actualHotSec: number
  actualColdSec: number
  actualBreakSec: number
  totalActualSec: number
  createdAt: string
}

export interface StatsSummary {
  total: number
  completed: number
  interrupted: number
  totalHotSec: number
  totalColdSec: number
  totalBreakSec: number
  totalSec: number
  avgDurationSec: number
  currentStreak: number
  bestStreak: number
  todayCompleted: boolean
}

// Timer / session state types
export type Phase = 'hot' | 'cold' | 'break'

export interface ActiveSessionState {
  sessionId: string
  preset: Preset
  startedAt: number // ms timestamp
  currentPhase: Phase
  currentCycle: number // 1-indexed
  phaseStartedAt: number // ms timestamp
  isPaused: boolean
  pausedAt: number | null // ms timestamp when paused
  pausedRemainingMs: number | null // remaining ms at pause time
  completedCycles: number
  actualHotSec: number
  actualColdSec: number
  actualBreakSec: number
}

export type Screen =
  | 'home'
  | 'presets'
  | 'create-preset'
  | 'edit-preset'
  | 'session'
  | 'result'
  | 'history'
  | 'session-detail'
  | 'stats'
  | 'settings'

export interface PresetsData {
  system: Preset[]
  user: Preset[]
}
