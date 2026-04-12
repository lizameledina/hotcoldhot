import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActiveSessionState, Phase, Preset, ProtocolStep } from '../types'

const STORAGE_KEY = 'active-session'
const PREP_DURATION_MS = 10000

interface SessionStore {
  active: ActiveSessionState | null
  resultSessionId: string | null
  resultProgression: { newColdDurationSec: number } | null
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
  setResultProgression: (value: { newColdDurationSec: number } | null) => void
  clearResultMeta: () => void
}

function getCurrentStep(preset: Preset, currentStepIndex: number): ProtocolStep | null {
  return preset.steps[currentStepIndex] ?? null
}

function getStepPhase(step: ProtocolStep | null): Phase {
  return step?.type === 'cold' ? 'cold' : 'hot'
}

function getStepDuration(step: ProtocolStep | null, phase?: Phase): number {
  if (phase === 'prepare') return PREP_DURATION_MS
  return Math.max(0, (step?.durationSec ?? 0) * 1000)
}

function accumulatePhaseTime(state: ActiveSessionState, elapsed: number): Partial<ActiveSessionState> {
  const sec = Math.floor(elapsed / 1000)
  if (state.currentPhase === 'cold') return { actualColdSec: state.actualColdSec + sec }
  if (state.currentPhase === 'prepare') return {}
  return { actualHotSec: state.actualHotSec + sec }
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      active: null,
      resultSessionId: null,
      resultProgression: null,

      initSession: (sessionId, preset) => {
        const now = Date.now()
        const firstStep = getCurrentStep(preset, 0)
        const state: ActiveSessionState = {
          sessionId,
          preset,
          startedAt: now,
          currentPhase: firstStep ? 'prepare' : getStepPhase(firstStep),
          currentStepIndex: 0,
          phaseStartedAt: now,
          isPaused: false,
          pausedAt: null,
          pausedRemainingMs: null,
          completedSteps: 0,
          actualHotSec: 0,
          actualColdSec: 0,
          actualBreakSec: 0,
        }
        set({ active: state })
      },

      getRemainingMs: () => {
        const state = get().active
        if (!state) return 0
        if (state.isPaused) return state.pausedRemainingMs ?? 0
        const total = getStepDuration(getCurrentStep(state.preset, state.currentStepIndex), state.currentPhase)
        const elapsed = Date.now() - state.phaseStartedAt
        return Math.max(0, total - elapsed)
      },

      getPhaseTotal: () => {
        const state = get().active
        if (!state) return 0
        return getStepDuration(getCurrentStep(state.preset, state.currentStepIndex), state.currentPhase)
      },

      tick: () => {
        const state = get().active
        if (!state || state.isPaused) return { phaseCompleted: false, sessionCompleted: false }

        const remaining = get().getRemainingMs()
        if (remaining > 0) return { phaseCompleted: false, sessionCompleted: false }

        const currentStep = getCurrentStep(state.preset, state.currentStepIndex)
        const stepElapsed = getStepDuration(currentStep, state.currentPhase)

        if (state.currentPhase === 'prepare') {
          set({
            active: {
              ...state,
              currentPhase: getStepPhase(currentStep),
              phaseStartedAt: Date.now(),
              pausedRemainingMs: null,
              pausedAt: null,
            },
          })
          return { phaseCompleted: true, sessionCompleted: false }
        }

        const accumulated = accumulatePhaseTime(state, stepElapsed)
        const nextCompleted = state.completedSteps + 1

        if (nextCompleted >= state.preset.steps.length) {
          set({ active: { ...state, ...accumulated, completedSteps: nextCompleted } })
          return { phaseCompleted: true, sessionCompleted: true }
        }

        const nextStepIndex = state.currentStepIndex + 1
        const nextStep = getCurrentStep(state.preset, nextStepIndex)
        set({
          active: {
            ...state,
            ...accumulated,
            completedSteps: nextCompleted,
            currentStepIndex: nextStepIndex,
            currentPhase: getStepPhase(nextStep),
            phaseStartedAt: Date.now(),
            pausedRemainingMs: null,
            pausedAt: null,
          },
        })

        return { phaseCompleted: true, sessionCompleted: false }
      },

      pause: () => {
        const state = get().active
        if (!state || state.isPaused) return
        const remaining = get().getRemainingMs()
        set({
          active: {
            ...state,
            isPaused: true,
            pausedAt: Date.now(),
            pausedRemainingMs: remaining,
          },
        })
      },

      resume: () => {
        const state = get().active
        if (!state || !state.isPaused) return
        const remaining = state.pausedRemainingMs ?? 0
        const total = getStepDuration(getCurrentStep(state.preset, state.currentStepIndex), state.currentPhase)
        const fakeStartedAt = Date.now() - (total - remaining)
        set({
          active: {
            ...state,
            isPaused: false,
            pausedAt: null,
            pausedRemainingMs: null,
            phaseStartedAt: fakeStartedAt,
          },
        })
      },

      skipPhase: () => {
        const state = get().active
        if (!state) return { sessionCompleted: false }

        const currentStep = getCurrentStep(state.preset, state.currentStepIndex)
        const total = getStepDuration(currentStep, state.currentPhase)
        let elapsed: number
        if (state.isPaused) {
          elapsed = total - (state.pausedRemainingMs ?? 0)
        } else {
          elapsed = Date.now() - state.phaseStartedAt
        }

        if (state.currentPhase === 'prepare') {
          set({
            active: {
              ...state,
              currentPhase: getStepPhase(currentStep),
              phaseStartedAt: Date.now(),
              isPaused: false,
              pausedAt: null,
              pausedRemainingMs: null,
            },
          })
          return { sessionCompleted: false }
        }

        const accumulated = accumulatePhaseTime(state, Math.min(elapsed, total))
        const nextCompleted = state.completedSteps + 1

        if (nextCompleted >= state.preset.steps.length) {
          set({ active: { ...state, ...accumulated, completedSteps: nextCompleted } })
          return { sessionCompleted: true }
        }

        const nextStepIndex = state.currentStepIndex + 1
        const nextStep = getCurrentStep(state.preset, nextStepIndex)
        set({
          active: {
            ...state,
            ...accumulated,
            completedSteps: nextCompleted,
            currentStepIndex: nextStepIndex,
            currentPhase: getStepPhase(nextStep),
            phaseStartedAt: Date.now(),
            isPaused: false,
            pausedAt: null,
            pausedRemainingMs: null,
          },
        })

        return { sessionCompleted: false }
      },

      finishEarly: () => {
        const state = get().active
        if (!state) return { actualHotSec: 0, actualColdSec: 0, actualBreakSec: 0, completedCycles: 0 }

        const total = getStepDuration(getCurrentStep(state.preset, state.currentStepIndex), state.currentPhase)
        let elapsed: number
        if (state.isPaused) {
          elapsed = total - (state.pausedRemainingMs ?? 0)
        } else {
          elapsed = Date.now() - state.phaseStartedAt
        }

        const accumulated = accumulatePhaseTime(state, Math.min(elapsed, total))
        const finalState = { ...state, ...accumulated }

        return {
          actualHotSec: finalState.actualHotSec,
          actualColdSec: finalState.actualColdSec,
          actualBreakSec: 0,
          completedCycles: finalState.completedSteps,
        }
      },

      clearSession: () => set({ active: null }),
      setResultSessionId: (id) => set({ resultSessionId: id }),
      setResultProgression: (value) => set({ resultProgression: value }),
      clearResultMeta: () => set({ resultSessionId: null, resultProgression: null }),
    }),
    {
      name: STORAGE_KEY,
    }
  )
)
