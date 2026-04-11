import React, { useEffect, useState } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import { useSessionStore } from '../store/sessionStore'
import { useStatsStore } from '../store/statsStore'
import { sessionsApi } from '../api'
import type { Session } from '../types'

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} сек`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m} мин ${s} сек` : `${m} мин`
}

function pluralDays(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'день'
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'дня'
  return 'дней'
}

export function ResultScreen() {
  const { navigate } = useNavigationStore()
  const { resultSessionId, setResultSessionId } = useSessionStore()
  const { summary, fetch: fetchStats, invalidate } = useStatsStore()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!resultSessionId || resultSessionId.startsWith('local_')) {
      setLoading(false)
      return
    }
    sessionsApi.getOne(resultSessionId)
      .then(setSession)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [resultSessionId])

  // Refresh stats when result screen opens (session just finished)
  useEffect(() => {
    invalidate()
    fetchStats()
  }, [])

  function handleRepeat() {
    setResultSessionId(null)
    navigate('session')
  }

  function handleHome() {
    setResultSessionId(null)
    navigate('home')
  }

  const isCompleted = session?.status === 'COMPLETED'
  const statusEmoji = isCompleted ? '✅' : '⚠️'
  const statusLabel = isCompleted ? 'Завершено' : 'Прервано'
  const statusColor = isCompleted ? 'var(--color-cold)' : 'var(--color-break)'

  const streak = summary?.currentStreak ?? 0
  const todayCompleted = summary?.todayCompleted ?? false

  return (
    <div className="screen fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Status */}
      <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
        {loading ? (
          <div style={{ fontSize: 64, marginBottom: 12 }} className="pulse">🚿</div>
        ) : (
          <>
            <div style={{ fontSize: 64, marginBottom: 12 }}>{statusEmoji}</div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: statusColor, marginBottom: 8 }}>
              {statusLabel}
            </h1>
            {session && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
                {(session.presetSnapshot as { name?: string })?.name}
              </p>
            )}
          </>
        )}
      </div>

      {/* Streak & goal badges (only for completed sessions) */}
      {isCompleted && summary && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div
            className="card fade-in"
            style={{
              flex: 1,
              padding: '12px 14px',
              textAlign: 'center',
              border: streak > 0 ? '1px solid rgba(255,107,53,0.3)' : '1px solid var(--border)',
            }}
          >
            {streak > 0 ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-hot)' }}>
                  🔥 {streak} {pluralDays(streak)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Стрик</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 700 }}>🔥 Начало</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Новый стрик</div>
              </>
            )}
          </div>

          {todayCompleted && (
            <div
              className="card fade-in"
              style={{
                flex: 1,
                padding: '12px 14px',
                textAlign: 'center',
                border: '1px solid rgba(74,158,255,0.3)',
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-cold)' }}>🎯</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Цель дня выполнена</div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {!loading && session && (
        <div className="card fade-in" style={{ padding: '20px', marginBottom: 16 }}>
          <StatRow label="Выполнено циклов" value={`${session.completedCycles} / ${session.plannedCycles}`} />
          <div className="divider" />
          <StatRow
            label="🔥 Горячая вода"
            value={formatDuration(session.actualHotSec)}
            color="var(--color-hot)"
          />
          <div className="divider" />
          <StatRow
            label="❄️ Холодная вода"
            value={formatDuration(session.actualColdSec)}
            color="var(--color-cold)"
          />
          {session.actualBreakSec > 0 && (
            <>
              <div className="divider" />
              <StatRow
                label="⏸ Паузы"
                value={formatDuration(session.actualBreakSec)}
                color="var(--color-break)"
              />
            </>
          )}
          <div className="divider" />
          <StatRow
            label="⏱ Общее время"
            value={formatDuration(session.totalActualSec)}
          />
        </div>
      )}

      {loading && (
        <div className="card" style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}>
          <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
        </div>
      )}

      {!loading && !session && (
        <div className="card" style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}>
          <p style={{ color: 'var(--text-secondary)' }}>Данные сессии не сохранены (нет сети)</p>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-hot" onClick={handleRepeat}>
          🔄 Повторить
        </button>
        <button className="btn btn-secondary" onClick={handleHome}>
          На главную
        </button>
      </div>
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}
