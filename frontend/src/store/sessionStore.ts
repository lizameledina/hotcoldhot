import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActiveSessionState, Phase, Preset } from '../types'

const STORAGE_KEY = 'active-session'

interface SessionStore {
  active: ActiveSessionState | null
  resultSessionId: string | null
  initSession: (sessionId: string, preset: Preset) => void
  tick: () => { phaseCompleted: boolean; sessionCompleted: boolean }
  pause: () => void
  resume: () => void
  skipPhase: () => { sessionCompleted: boolean }
  finishEarly: () => { actualHotSec: number; actualColdSec: number; actualBreakSec: number; completedCycles: number }
  getRemainingMs: () => number
  getPhaseTotal: () => number
  clearSession: () => void
  setResultSessionId: (id: string | null) => void
}

function getNextPhase(current: Phase, preset: Preset): Phase | null {
  if (current === 'hot') return 'cold'
  if (current === 'cold') {
    return preset.breakDurationSec > 0 ? 'break' : null
  }
  return null // break -> end of cycle
}

function getPhaseDuration(phase: Phase, preset: Preset): number {
  if (phase === 'hot') return preset.hotDurationSec * 1000
  if (phase === 'cold') return preset.coldDurationSec * 1000
  return preset.breakDurationSec * 1000
}

function accumulatePhaseTime(state: ActiveSessionState, elapsed: number): Partial<ActiveSessionState> {
  const sec = Math.floor(elapsed / 1000)
  if (state.currentPhase === 'hot') return { actualHotSec: state.actualHotSec + sec }
  if (state.currentPhase === 'cold') return { actualColdSec: state.actualColdSec + sec }
  return { actualBreakSec: state.actualBreakSec + sec }
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      active: null,
      resultSessionId: null,

      initSession: (sessionId, preset) => {
        const now = Date.now()
        const state: ActiveSessionState = {
          sessionId,
          preset,
          startedAt: now,
          currentPhase: 'hot',
          currentCycle: 1,
          phaseStartedAt: now,
          isPaused: false,
          pausedAt: null,
          pausedRemainingMs: null,
          completedCycles: 0,
          actualHotSec: 0,
          actualColdSec: 0,
          actualBreakSec: 0,
        }
        set({ active: state })
      },

      getRemainingMs: () => {
        const s = get().active
        if (!s) return 0
        if (s.isPaused) return s.pausedRemainingMs ?? 0
        const total = getPhaseDuration(s.currentPhase, s.preset)
        const elapsed = Date.now() - s.phaseStartedAt
        return Math.max(0, total - elapsed)
      },

      getPhaseTotal: () => {
        const s = get().active
        if (!s) return 0
        return getPhaseDuration(s.currentPhase, s.preset)
      },

      tick: () => {
        const s = get().active
        if (!s || s.isPaused) return { phaseCompleted: false, sessionCompleted: false }

        const remaining = get().getRemainingMs()
        if (remaining > 0) return { phaseCompleted: false, sessionCompleted: false }

        // Phase completed naturally
        const phaseElapsed = getPhaseDuration(s.currentPhase, s.preset)
        const accumulated = accumulatePhaseTime(s, phaseElapsed)

        const nextPhase = getNextPhase(s.currentPhase, s.preset)
        const now = Date.now()

        if (nextPhase !== null) {
          // Move to next phase within same cycle
          set({
            active: {
              ...s,
              ...accumulated,
              currentPhase: nextPhase,
              phaseStartedAt: now,
              pausedRemainingMs: null,
              pausedAt: null,
            },
          })
          return { phaseCompleted: true, sessionCompleted: false }
        }

        // End of cycle
        const newCompleted = s.completedCycles + 1
        if (newCompleted >= s.preset.cyclesCount) {
          // Session complete!
          set({
            active: {
              ...s,
              ...accumulated,
              completedCycles: newCompleted,
            },
          })
          return { phaseCompleted: true, sessionCompleted: true }
        }

        // Next cycle
        set({
          active: {
            ...s,
            ...accumulated,
            completedCycles: newCompleted,
            currentCycle: s.currentCycle + 1,
            currentPhase: 'hot',
            phaseStartedAt: now,
            pausedRemainingMs: null,
            pausedAt: null,
          },
        })
        return { phaseCompleted: true, sessionCompleted: false }
      },

      pause: () => {
        const s = get().active
        if (!s || s.isPaused) return
        const remaining = get().getRemainingMs()
        set({
          active: {
            ...s,
            isPaused: true,
            pausedAt: Date.now(),
            pausedRemainingMs: remaining,
          },
        })
      },

      resume: () => {
        const s = get().active
        if (!s || !s.isPaused) return
        const remaining = s.pausedRemainingMs ?? 0
        const total = getPhaseDuration(s.currentPhase, s.preset)
        // Reconstruct phaseStartedAt so that remaining time is correct
        const fakeStartedAt = Date.now() - (total - remaining)
        set({
          active: {
            ...s,
            isPaused: false,
            pausedAt: null,
            pausedRemainingMs: null,
            phaseStartedAt: fakeStartedAt,
          },
        })
      },

      skipPhase: () => {
        const s = get().active
        if (!s) return { sessionCompleted: false }

        // Accumulate time actually spent in this phase
        let elapsed: number
        if (s.isPaused) {
          const total = getPhaseDuration(s.currentPhase, s.preset)
          elapsed = total - (s.pausedRemainingMs ?? 0)
        } else {
          elapsed = Date.now() - s.phaseStartedAt
        }
        elapsed = Math.min(elapsed, getPhaseDuration(s.currentPhase, s.preset))
        const accumulated = accumulatePhaseTime(s, elapsed)

        const nextPhase = getNextPhase(s.currentPhase, s.preset)
        const now = Date.now()

        if (nextPhase !== null) {
          set({
            active: {
              ...s,
              ...accumulated,
              currentPhase: nextPhase,
              phaseStartedAt: now,
              isPaused: false,
              pausedAt: null,
              pausedRemainingMs: null,
            },
          })
          return { sessionCompleted: false }
        }

        // End of cycle
        const newCompleted = s.completedCycles + 1
        if (newCompleted >= s.preset.cyclesCount) {
          set({ active: { ...s, ...accumulated, completedCycles: newCompleted } })
          return { sessionCompleted: true }
        }

        set({
          active: {
            ...s,
            ...accumulated,
            completedCycles: newCompleted,
            currentCycle: s.currentCycle + 1,
            currentPhase: 'hot',
            phaseStartedAt: now,
            isPaused: false,
            pausedAt: null,
            pausedRemainingMs: null,
          },
        })
        return { sessionCompleted: false }
      },

      finishEarly: () => {
        const s = get().active
        if (!s) return { actualHotSec: 0, actualColdSec: 0, actualBreakSec: 0, completedCycles: 0 }

        let elapsed: number
        if (s.isPaused) {
          const total = getPhaseDuration(s.currentPhase, s.preset)
          elapsed = total - (s.pausedRemainingMs ?? 0)
        } else {
          elapsed = Date.now() - s.phaseStartedAt
        }
        elapsed = Math.min(elapsed, getPhaseDuration(s.currentPhase, s.preset))
        const accumulated = accumulatePhaseTime(s, elapsed)

        const finalState = { ...s, ...accumulated }
        return {
          actualHotSec: finalState.actualHotSec,
          actualColdSec: finalState.actualColdSec,
          actualBreakSec: finalState.actualBreakSec,
          completedCycles: finalState.completedCycles,
        }
      },

      clearSession: () => set({ active: null }),
      setResultSessionId: (id) => set({ resultSessionId: id }),
    }),
    {
      name: STORAGE_KEY,
    }
  )
)
