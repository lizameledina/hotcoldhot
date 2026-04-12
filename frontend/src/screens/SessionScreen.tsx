import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useSessionStore } from '../store/sessionStore'
import { usePresetsStore } from '../store/presetsStore'
import { useNavigationStore } from '../store/navigationStore'
import { useTimer } from '../hooks/useTimer'
import { sessionsApi } from '../api'
import type { Preset } from '../types'

const PHASE_LABELS = {
  prepare: 'Подготовка',
  hot: 'Горячая вода',
  cold: 'Холодная вода',
} as const

const PHASE_COLORS = {
  prepare: 'var(--text-primary)',
  hot: 'var(--color-hot)',
  cold: 'var(--color-cold)',
} as const

const PHASE_SURFACES = {
  prepare: 'rgba(138, 143, 152, 0.14)',
  hot: 'var(--surface-warm)',
  cold: 'var(--surface-cold)',
} as const

function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : String(totalSec)
}

export function SessionScreen() {
  const {
    active,
    initSession,
    pause,
    resume,
    skipPhase,
    finishEarly,
    getRemainingMs,
    getPhaseTotal,
    clearSession,
    setResultSessionId,
    setResultProgression,
  } = useSessionStore()
  const { lastPresetId, getById } = usePresetsStore()
  const { navigate } = useNavigationStore()
  const [, forceUpdate] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!active || active.isPaused) return
    const id = setInterval(() => forceUpdate((value) => value + 1), 100)
    return () => clearInterval(id)
  }, [active?.isPaused, active?.currentPhase, active?.currentStepIndex])

  useEffect(() => {
    if (!active && lastPresetId) {
      const preset = getById(lastPresetId)
      if (!preset) {
        navigate('home')
        return
      }
      startNewSession(preset)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function startNewSession(preset: Preset) {
    try {
      const session = await sessionsApi.start(preset.id)
      sessionIdRef.current = session.id
      initSession(session.id, preset)
    } catch {
      const localId = `local_${Date.now()}`
      sessionIdRef.current = localId
      initSession(localId, preset)
    }
  }

  const handlePhaseComplete = useCallback(() => {
    forceUpdate((value) => value + 1)
  }, [])

  const handleSessionComplete = useCallback(async () => {
    if (!active) return

    setFinishing(true)
    try {
      const sessionId = sessionIdRef.current || active.sessionId
      let progression: { newColdDurationSec: number } | null = null

      if (!sessionId.startsWith('local_')) {
        const result = await sessionsApi.finish(sessionId, {
          status: 'COMPLETED',
          completedCycles: active.preset.steps.length,
          actualHotSec: active.actualHotSec,
          actualColdSec: active.actualColdSec,
          actualBreakSec: 0,
        })
        progression = result.progression
      }

      setResultProgression(progression)
      setResultSessionId(sessionId)
    } catch {
      setResultProgression(null)
    }

    clearSession()
    navigate('result')
  }, [active, clearSession, navigate, setResultProgression, setResultSessionId])

  useTimer({ onPhaseComplete: handlePhaseComplete, onSessionComplete: handleSessionComplete })

  async function handleFinishEarly() {
    if (finishing || !active) return

    setFinishing(true)
    const result = finishEarly()
    const sessionId = sessionIdRef.current || active.sessionId

    try {
      if (!sessionId.startsWith('local_')) {
        await sessionsApi.finish(sessionId, {
          status: 'INTERRUPTED',
          completedCycles: result.completedCycles,
          actualHotSec: result.actualHotSec,
          actualColdSec: result.actualColdSec,
          actualBreakSec: 0,
        })
      }
      setResultProgression(null)
      setResultSessionId(sessionId)
    } catch {
      setResultProgression(null)
    }

    clearSession()
    navigate('result')
  }

  function handleSkip() {
    const result = skipPhase()
    if (result.sessionCompleted) {
      handleSessionComplete()
    } else {
      forceUpdate((value) => value + 1)
    }
  }

  if (!active) {
    return (
      <div className="loading" style={{ height: '100%', flexDirection: 'column', gap: 16 }}>
        <div className="pulse" style={{ fontSize: 48 }}>🚿</div>
        <p className="type-body text-secondary">Загрузка...</p>
      </div>
    )
  }

  const phase = active.currentPhase === 'prepare' ? 'prepare' : active.currentPhase === 'cold' ? 'cold' : 'hot'
  const remainingMs = getRemainingMs()
  const totalMs = getPhaseTotal()
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0
  const phaseColor = PHASE_COLORS[phase]
  const phaseSurface = PHASE_SURFACES[phase]

  return (
    <div
      className="screen"
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        paddingTop: 20,
        background: `linear-gradient(180deg, ${phaseSurface} 0%, transparent 24%), linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)`,
      }}
    >
      <div className="card" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div>
            <p className="type-caption" style={{ marginBottom: 4 }}>Режим</p>
            <p className="type-section">{active.preset.name}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="type-caption" style={{ marginBottom: 4 }}>Шаг</p>
            <p className="type-body numeric-tabular" style={{ fontWeight: 600 }}>
              {active.currentStepIndex + 1} из {active.preset.steps.length}
            </p>
          </div>
        </div>

        <div
          className="type-body"
          style={{
            display: 'inline-flex',
            padding: '7px 12px',
            borderRadius: 999,
            background: phaseSurface,
            color: phaseColor,
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          {PHASE_LABELS[phase]}
        </div>

        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div className="type-timer numeric-tabular" style={{ color: phaseColor }}>
            {formatTime(remainingMs)}
          </div>
          {phase === 'prepare' && (
            <p className="type-secondary" style={{ marginTop: 8 }}>Подготовьтесь и займите позицию</p>
          )}
          {active.isPaused && (
            <p className="type-secondary" style={{ marginTop: 8 }}>Пауза</p>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              height: 8,
              background: 'rgba(46, 42, 38, 0.06)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress * 100}%`,
                background: phaseColor,
                borderRadius: 999,
                transition: 'width 0.1s linear',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {active.preset.steps.map((step, index) => {
            const baseColor = step.type === 'cold' ? 'var(--color-cold)' : 'var(--color-hot)'
            const isDone = index < active.completedSteps
            const isCurrent = index === active.currentStepIndex
            return (
              <div
                key={step.id}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: isDone ? baseColor : isCurrent ? phaseColor : 'rgba(46, 42, 38, 0.12)',
                  opacity: isDone || isCurrent ? 1 : 0.7,
                }}
              />
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 'max(8px, var(--safe-bottom))' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={active.isPaused ? resume : pause} style={{ flex: 1 }}>
            {active.isPaused ? 'Продолжить' : 'Пауза'}
          </button>
          <button className="btn btn-secondary" onClick={handleSkip} style={{ flex: 1 }}>
            {phase === 'prepare' ? 'Начать сейчас' : 'Пропустить'}
          </button>
        </div>

        <button className="btn btn-danger" onClick={handleFinishEarly} disabled={finishing}>
          Завершить
        </button>
      </div>
    </div>
  )
}
