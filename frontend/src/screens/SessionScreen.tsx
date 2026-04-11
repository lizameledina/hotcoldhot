import React, { useEffect, useCallback, useState, useRef } from 'react'
import { useSessionStore } from '../store/sessionStore'
import { usePresetsStore } from '../store/presetsStore'
import { useNavigationStore } from '../store/navigationStore'
import { useTimer } from '../hooks/useTimer'
import { sessionsApi } from '../api'
import type { Preset } from '../types'

const PHASE_LABELS: Record<string, string> = {
  hot: 'Горячая вода',
  cold: 'Холодная вода',
  break: 'Пауза',
}

const PHASE_COLORS: Record<string, string> = {
  hot: 'var(--color-hot)',
  cold: 'var(--color-cold)',
  break: 'var(--color-break)',
}

const PHASE_BG: Record<string, string> = {
  hot: 'var(--color-hot-bg)',
  cold: 'var(--color-cold-bg)',
  break: 'var(--color-break-bg)',
}

function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return m > 0
    ? `${m}:${String(s).padStart(2, '0')}`
    : String(totalSec)
}

export function SessionScreen() {
  const { active, initSession, pause, resume, skipPhase, finishEarly, getRemainingMs, getPhaseTotal, clearSession, setResultSessionId } = useSessionStore()
  const { lastPresetId, getById } = usePresetsStore()
  const { navigate } = useNavigationStore()
  const [, forceUpdate] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const sessionIdRef = useRef<string | null>(null)

  // Tick for re-render
  useEffect(() => {
    if (!active || active.isPaused) return
    const id = setInterval(() => forceUpdate((n) => n + 1), 100)
    return () => clearInterval(id)
  }, [active?.isPaused, active?.currentPhase, active?.currentCycle])

  // Start session if none active
  useEffect(() => {
    if (!active && lastPresetId) {
      const preset = getById(lastPresetId)
      if (!preset) {
        navigate('home')
        return
      }
      startNewSession(preset)
    }
  }, [])

  async function startNewSession(preset: Preset) {
    try {
      const session = await sessionsApi.start(preset.id)
      sessionIdRef.current = session.id
      initSession(session.id, preset)
    } catch {
      // Offline fallback: use a local ID
      const localId = `local_${Date.now()}`
      sessionIdRef.current = localId
      initSession(localId, preset)
    }
  }

  const handlePhaseComplete = useCallback(() => {
    forceUpdate((n) => n + 1)
  }, [])

  const handleSessionComplete = useCallback(async () => {
    if (!active) return
    const data = active
    setFinishing(true)
    try {
      const sessionId = sessionIdRef.current || data.sessionId
      if (!sessionId.startsWith('local_')) {
        await sessionsApi.finish(sessionId, {
          status: 'COMPLETED',
          completedCycles: data.preset.cyclesCount,
          actualHotSec: data.actualHotSec,
          actualColdSec: data.actualColdSec,
          actualBreakSec: data.actualBreakSec,
        })
      }
      setResultSessionId(sessionId)
    } catch { /* ignore network errors */ }
    clearSession()
    navigate('result')
  }, [active, clearSession, navigate, setResultSessionId])

  useTimer({ onPhaseComplete: handlePhaseComplete, onSessionComplete: handleSessionComplete })

  async function handleFinishEarly() {
    if (finishing) return
    setFinishing(true)
    if (!active) return
    const result = finishEarly()
    const sessionId = sessionIdRef.current || active.sessionId
    try {
      if (!sessionId.startsWith('local_')) {
        await sessionsApi.finish(sessionId, {
          status: 'INTERRUPTED',
          completedCycles: result.completedCycles,
          actualHotSec: result.actualHotSec,
          actualColdSec: result.actualColdSec,
          actualBreakSec: result.actualBreakSec,
        })
      }
      setResultSessionId(sessionId)
    } catch { /* ignore */ }
    clearSession()
    navigate('result')
  }

  function handleSkip() {
    const result = skipPhase()
    if (result.sessionCompleted) {
      handleSessionComplete()
    } else {
      forceUpdate((n) => n + 1)
    }
  }

  if (!active) {
    return (
      <div className="loading" style={{ height: '100%', flexDirection: 'column', gap: 16 }}>
        <div className="pulse" style={{ fontSize: 48 }}>🚿</div>
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
      </div>
    )
  }

  const remainingMs = getRemainingMs()
  const totalMs = getPhaseTotal()
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0
  const phase = active.currentPhase
  const phaseColor = PHASE_COLORS[phase]
  const phaseBg = PHASE_BG[phase]

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: `radial-gradient(ellipse at top, ${phaseBg} 0%, var(--bg-primary) 70%)`,
      transition: 'background 0.6s ease',
    }}>
      {/* Top info */}
      <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{active.preset.name}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Цикл {active.currentCycle} из {active.preset.cyclesCount}
          </p>
        </div>
      </div>

      {/* Main timer area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        gap: 16,
      }}>
        {/* Phase label */}
        <div style={{
          padding: '8px 20px',
          borderRadius: 20,
          background: phaseBg,
          border: `1px solid ${phaseColor}40`,
          transition: 'all 0.3s ease',
        }}>
          <p style={{ fontSize: 18, fontWeight: 600, color: phaseColor, letterSpacing: 0.3 }}>
            {PHASE_LABELS[phase]}
          </p>
        </div>

        {/* Timer */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: remainingMs >= 60000 ? 88 : 112,
            fontWeight: 800,
            color: phaseColor,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: -4,
            lineHeight: 1,
            transition: 'color 0.3s ease, font-size 0.2s ease',
          }}>
            {formatTime(remainingMs)}
          </div>
          {active.isPaused && (
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }} className="pulse">
              ⏸ Пауза
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', maxWidth: 300 }}>
          <div style={{
            height: 6,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: phaseColor,
              borderRadius: 3,
              transition: 'width 0.1s linear, background 0.3s ease',
            }} />
          </div>
        </div>

        {/* Cycle dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {Array.from({ length: active.preset.cyclesCount }).map((_, i) => (
            <div key={i} style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i < active.completedCycles
                ? 'var(--color-cold)'
                : i === active.currentCycle - 1
                  ? phaseColor
                  : 'rgba(255,255,255,0.15)',
              transition: 'background 0.3s ease',
            }} />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: '16px 24px', paddingBottom: 'max(24px, var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Pause/Resume + Skip */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={active.isPaused ? resume : pause}
            style={{ flex: 1, fontSize: 18 }}
          >
            {active.isPaused ? '▶ Продолжить' : '⏸ Пауза'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleSkip}
            style={{ flex: 1, fontSize: 18 }}
          >
            ⏭ Пропустить
          </button>
        </div>

        {/* Finish */}
        <button
          className="btn btn-danger"
          onClick={handleFinishEarly}
          disabled={finishing}
        >
          Завершить
        </button>
      </div>
    </div>
  )
}
