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

// Phase sequence per cycle: hot → (break) → cold
// Between cycles: cold → (break) → hot
// After last cold: session ends (no trailing break)
function getNextPhase(current: Phase, prevPhase: Phase | null, preset: Preset): Phase | null {
  if (current === 'hot') {
    return preset.breakDurationSec > 0 ? 'break' : 'cold'
  }
  if (current === 'break') {
    // break after hot → go to cold; break after cold → go to hot (new cycle)
    return prevPhase === 'hot' ? 'cold' : 'hot'
  }
  // cold: cycle-end logic is handled in tick/skipPhase
  return null
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
          prevPhase: null,
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
        const now = Date.now()

        // cold = end of cycle
        if (s.currentPhase === 'cold') {
          const newCompleted = s.completedCycles + 1
          if (newCompleted >= s.preset.cyclesCount) {
            // Session complete — no trailing break
            set({ active: { ...s, ...accumulated, completedCycles: newCompleted } })
            return { phaseCompleted: true, sessionCompleted: true }
          }
          // Between cycles: break → hot (or directly hot if no break)
          const nextPhase: Phase = s.preset.breakDurationSec > 0 ? 'break' : 'hot'
          set({
            active: {
              ...s, ...accumulated,
              completedCycles: newCompleted,
              currentCycle: s.currentCycle + 1,
              currentPhase: nextPhase,
              prevPhase: 'cold',
              phaseStartedAt: now,
              pausedRemainingMs: null,
              pausedAt: null,
            },
          })
          return { phaseCompleted: true, sessionCompleted: false }
        }

        // hot or break: use getNextPhase
        const nextPhase = getNextPhase(s.currentPhase, s.prevPhase, s.preset)
        if (nextPhase !== null) {
          set({
            active: {
              ...s, ...accumulated,
              currentPhase: nextPhase,
              prevPhase: s.currentPhase,
              phaseStartedAt: now,
              pausedRemainingMs: null,
              pausedAt: null,
            },
          })
          return { phaseCompleted: true, sessionCompleted: false }
        }

        return { phaseCompleted: false, sessionCompleted: false }
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

        let elapsed: number
        if (s.isPaused) {
          const total = getPhaseDuration(s.currentPhase, s.preset)
          elapsed = total - (s.pausedRemainingMs ?? 0)
        } else {
          elapsed = Date.now() - s.phaseStartedAt
        }
        elapsed = Math.min(elapsed, getPhaseDuration(s.currentPhase, s.preset))
        const accumulated = accumulatePhaseTime(s, elapsed)
        const now = Date.now()

        // cold = end of cycle
        if (s.currentPhase === 'cold') {
          const newCompleted = s.completedCycles + 1
          if (newCompleted >= s.preset.cyclesCount) {
            set({ active: { ...s, ...accumulated, completedCycles: newCompleted } })
            return { sessionCompleted: true }
          }
          const nextPhase: Phase = s.preset.breakDurationSec > 0 ? 'break' : 'hot'
          set({
            active: {
              ...s, ...accumulated,
              completedCycles: newCompleted,
              currentCycle: s.currentCycle + 1,
              currentPhase: nextPhase,
              prevPhase: 'cold',
              phaseStartedAt: now,
              isPaused: false,
              pausedAt: null,
              pausedRemainingMs: null,
            },
          })
          return { sessionCompleted: false }
        }

        // hot or break
        const nextPhase = getNextPhase(s.currentPhase, s.prevPhase, s.preset)
        if (nextPhase !== null) {
          set({
            active: {
              ...s, ...accumulated,
              currentPhase: nextPhase,
              prevPhase: s.currentPhase,
              phaseStartedAt: now,
              isPaused: false,
              pausedAt: null,
              pausedRemainingMs: null,
            },
          })
          return { sessionCompleted: false }
        }

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
