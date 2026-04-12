import React, { useEffect, useState } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import { useSessionStore } from '../store/sessionStore'
import { useStatsStore } from '../store/statsStore'
import { sessionsApi } from '../api'
import type { FeelingAfter, Session } from '../types'

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} сек`
  const minutes = Math.floor(sec / 60)
  const seconds = sec % 60
  return seconds > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${minutes}:00`
}

function pluralDays(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return 'день'
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'дня'
  return 'дней'
}

const FEELING_OPTIONS: Array<{ value: FeelingAfter; label: string }> = [
  { value: 'energized', label: 'Бодро' },
  { value: 'normal', label: 'Нормально' },
  { value: 'hard', label: 'Тяжело' },
]

export function ResultScreen() {
  const { navigate } = useNavigationStore()
  const { resultSessionId, resultProgression, clearResultMeta } = useSessionStore()
  const { summary, fetch: fetchStats, invalidate } = useStatsStore()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [feeling, setFeeling] = useState<FeelingAfter | null>(null)
  const [savingFeeling, setSavingFeeling] = useState(false)
  const [feelingHidden, setFeelingHidden] = useState(false)

  useEffect(() => {
    if (!resultSessionId || resultSessionId.startsWith('local_')) {
      setLoading(false)
      return
    }

    sessionsApi.getOne(resultSessionId)
      .then((data) => {
        setSession(data)
        setFeeling(data.feelingAfter)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [resultSessionId])

  useEffect(() => {
    invalidate()
    fetchStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleHome() {
    clearResultMeta()
    navigate('home')
  }

  async function handleFeelingSelect(nextFeeling: FeelingAfter) {
    if (!session || savingFeeling) return
    setSavingFeeling(true)
    try {
      const updated = await sessionsApi.saveFeeling(session.id, nextFeeling)
      setSession(updated)
      setFeeling(updated.feelingAfter)
      invalidate()
      fetchStats()
    } catch {
      alert('Не удалось сохранить самочувствие')
    } finally {
      setSavingFeeling(false)
    }
  }

  const isCompleted = session?.status === 'COMPLETED'
  const statusLabel = isCompleted ? 'Завершено' : 'Прервано'
  const statusColor = isCompleted ? 'var(--color-cold)' : 'var(--text-secondary)'
  const streak = summary?.currentStreak ?? 0
  const todayCompleted = summary?.todayCompleted ?? false

  return (
    <div className="screen fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingTop: 18 }}>
      <div className="card" style={{ padding: 22, textAlign: 'center', marginBottom: 16 }}>
        {loading ? (
          <div style={{ fontSize: 56 }} className="pulse">🚿</div>
        ) : (
          <>
            <div style={{ width: 64, height: 64, margin: '0 auto 12px', borderRadius: '50%', background: isCompleted ? 'var(--surface-cold)' : 'rgba(138, 143, 152, 0.14)', color: statusColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="type-title">
              {isCompleted ? '✓' : '–'}
            </div>
            <h1 className="type-title" style={{ color: statusColor, marginBottom: 6 }}>{statusLabel}</h1>
            {session && <p className="type-body text-secondary">{(session.presetSnapshot as { name?: string })?.name}</p>}
          </>
        )}
      </div>

      {isCompleted && summary && (
        <div style={{ display: 'grid', gridTemplateColumns: todayCompleted ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 16 }}>
          <SummaryBadge title="Серия" value={streak > 0 ? `${streak} ${pluralDays(streak)}` : 'Новый старт'} tone="warm" />
          {todayCompleted && <SummaryBadge title="Цель дня" value="Выполнена" tone="cold" />}
        </div>
      )}

      {resultProgression && (
        <div className="card" style={{ padding: 16, marginBottom: 16, background: 'var(--surface-cold)' }}>
          <p className="type-body text-cold" style={{ fontWeight: 600 }}>Холодная вода увеличена до {resultProgression.newColdDurationSec} сек</p>
        </div>
      )}

      {!loading && session && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <StatRow label="Выполнено шагов" value={`${session.completedCycles} / ${session.plannedCycles}`} />
          <div className="divider" />
          <StatRow label="Горячая вода" value={formatDuration(session.actualHotSec)} color="var(--color-hot)" />
          <div className="divider" />
          <StatRow label="Холодная вода" value={formatDuration(session.actualColdSec)} color="var(--color-cold)" />
          <div className="divider" />
          <StatRow label="Общее время" value={formatDuration(session.totalActualSec)} />
        </div>
      )}

      {!loading && session && session.status === 'COMPLETED' && !feelingHidden && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <p className="type-section" style={{ marginBottom: 6 }}>Как самочувствие после душа?</p>
          <p className="type-secondary" style={{ marginBottom: 14 }}>Ответ можно изменить позже</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {FEELING_OPTIONS.map((option) => (
              <button key={option.value} className={feeling === option.value ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => handleFeelingSelect(option.value)} disabled={savingFeeling} style={{ justifyContent: 'space-between' }}>
                <span>{option.label}</span>
                {feeling === option.value && <span>✓</span>}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost" onClick={() => setFeelingHidden(true)} style={{ marginTop: 10 }}>Пропустить</button>
        </div>
      )}

      {loading && <div className="card" style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}><p className="type-body text-secondary">Загрузка...</p></div>}
      {!loading && !session && <div className="card" style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}><p className="type-body text-secondary">Данные сессии не сохранены</p></div>}

      <div style={{ flex: 1 }} />
      <button className="btn btn-primary" onClick={handleHome}>На главную</button>
    </div>
  )
}

function SummaryBadge({ title, value, tone }: { title: string; value: string; tone: 'warm' | 'cold' }) {
  const style = tone === 'warm' ? { background: 'var(--surface-warm)', color: 'var(--color-hot)' } : { background: 'var(--surface-cold)', color: 'var(--color-cold)' }
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="type-caption" style={{ ...style, display: 'inline-flex', padding: '4px 10px', borderRadius: 999, marginBottom: 10 }}>{title}</div>
      <p className="type-section">{value}</p>
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
      <span className="type-body text-secondary">{label}</span>
      <span className="type-body numeric-tabular" style={{ fontWeight: 600, color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}
