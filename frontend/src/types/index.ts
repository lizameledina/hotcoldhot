export type Theme = 'SYSTEM' | 'LIGHT' | 'DARK'
export type FeelingAfter = 'energized' | 'normal' | 'hard'
export type StatsPeriod = '7d' | '30d'
export type StepType = 'hot' | 'cold'

export interface ProtocolStep {
  id: string
  type: StepType
  durationSec: number
}

export interface UserSettings {
  id: string
  userId: string
  soundEnabled: boolean
  vibrationEnabled: boolean
  theme: Theme
  dailyGoalSessions: number
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
  steps: ProtocolStep[]
  hotDurationSec: number
  coldDurationSec: number
  breakDurationSec: number
  cyclesCount: number
  isSystem: boolean
  progressionEnabled: boolean
  increaseStepSec: number | null
  increaseEveryNDays: number | null
  maxColdDurationSec: number | null
  lastProgressionAppliedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface PresetSnapshot {
  name: string
  steps: ProtocolStep[]
  hotDurationSec: number
  coldDurationSec: number
  breakDurationSec: number
  cyclesCount: number
  progressionEnabled?: boolean
  increaseStepSec?: number | null
  increaseEveryNDays?: number | null
  maxColdDurationSec?: number | null
}

export type SessionStatus = 'COMPLETED' | 'INTERRUPTED'

export interface Session {
  id: string
  userId: string
  presetId?: string | null
  presetSnapshot: PresetSnapshot
  status: SessionStatus
  feelingAfter: FeelingAfter | null
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

export interface StatsBestWeek {
  startDate: string
  endDate: string
  completedSessions: number
  coldSec: number
  metric: 'coldSec'
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
  todayCompletedCount: number
  period: StatsPeriod
  periodCompletedSessions: number
  periodColdSec: number
  periodTotalSec: number
  avgSessionSec: number
  last7ColdSec: number
  last7CompletedSessions: number
  bestWeek: StatsBestWeek | null
  mostCommonFeeling: FeelingAfter | null
}

export interface StatsTimeseriesDay {
  date: string
  completedSessions: number
  coldSec: number
  totalSec: number
}

export interface StatsTimeseriesResponse {
  period: StatsPeriod
  days: StatsTimeseriesDay[]
}

export interface StatsInsight {
  type: 'completed_sessions' | 'cold_time' | 'avg_session'
  direction: 'up' | 'down' | 'flat'
  value: number
  text: string
}

export interface StatsInsightsResponse {
  period: StatsPeriod
  hasEnoughData: boolean
  insights: StatsInsight[]
}

export interface HomeInsight {
  id: string
  type: 'progress' | 'completion' | 'time_of_day' | 'pattern' | 'recent'
  text: string
  context: 'general' | 'morning' | 'evening' | 'after_last_session'
}

export interface HomeInsightsResponse {
  items: HomeInsight[]
}

export interface FinishSessionResponse {
  session: Session
  progression: {
    applied: true
    newColdDurationSec: number
  } | null
}

export type Phase = 'prepare' | 'hot' | 'cold' | 'break'

export interface ActiveSessionState {
  sessionId: string
  preset: Preset
  startedAt: number
  currentPhase: Phase
  currentStepIndex: number
  phaseStartedAt: number
  isPaused: boolean
  pausedAt: number | null
  pausedRemainingMs: number | null
  completedSteps: number
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
