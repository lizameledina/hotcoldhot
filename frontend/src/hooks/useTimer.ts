import { useEffect, useRef, useCallback } from 'react'
import { useSessionStore } from '../store/sessionStore'
import { useSettingsStore } from '../store/settingsStore'

interface UseTimerOptions {
  onPhaseComplete: () => void
  onSessionComplete: () => void
}

export function useTimer({ onPhaseComplete, onSessionComplete }: UseTimerOptions) {
  const { active, tick } = useSessionStore()
  const { soundEnabled, vibrationEnabled } = useSettingsStore()
  const rafRef = useRef<number | null>(null)
  const prevRemainingRef = useRef<number>(Infinity)

  const vibrate = useCallback((pattern: number | number[]) => {
    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }, [vibrationEnabled])

  const playBeep = useCallback(() => {
    if (!soundEnabled) return
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch { /* ignore audio errors */ }
  }, [soundEnabled])

  useEffect(() => {
    if (!active || active.isPaused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    const loop = () => {
      const result = tick()

      if (result.sessionCompleted) {
        playBeep()
        vibrate([200, 100, 200, 100, 400])
        onSessionComplete()
        return
      }

      if (result.phaseCompleted) {
        playBeep()
        vibrate([200, 100, 200])
        onPhaseComplete()
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [active, tick, onPhaseComplete, onSessionComplete, playBeep, vibrate])

  return null
}
