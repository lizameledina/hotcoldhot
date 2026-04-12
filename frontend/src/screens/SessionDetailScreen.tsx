import React from 'react'
import { useNavigationStore } from '../store/navigationStore'
import type { Session } from '../types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} сек`
  const minutes = Math.floor(sec / 60)
  const seconds = sec % 60
  return seconds > 0 ? `${minutes} мин ${seconds} сек` : `${minutes} мин`
}

function feelingLabel(value: Session['feelingAfter']): string | null {
  if (value === 'energized') return 'Бодро'
  if (value === 'normal') return 'Нормально'
  if (value === 'hard') return 'Тяжело'
  return null
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

export function SessionDetailScreen() {
  const { selectedSession, goBack } = useNavigationStore()
  const session = selectedSession as Session | null

  if (!session) {
    goBack()
    return null
  }

  const snap = session.presetSnapshot
  const isCompleted = session.status === 'COMPLETED'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <button className="back-btn" onClick={goBack}>‹</button>
        <span className="topbar-title">Детали сессии</span>
      </div>

      <div className="screen" style={{ paddingTop: 8 }}>
        <div className="card" style={{ padding: 20, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{isCompleted ? '✅' : '⚠️'}</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            {isCompleted ? 'Завершено' : 'Прервано'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{snap.name}</p>
        </div>

        <div className="card" style={{ padding: '0 16px', marginBottom: 16 }}>
          <StatRow label="Начало" value={formatDate(session.startedAt)} />
          {session.endedAt && (
            <>
              <div className="divider" />
              <StatRow label="Конец" value={formatDate(session.endedAt)} />
            </>
          )}
          {session.feelingAfter && (
            <>
              <div className="divider" />
              <StatRow label="Самочувствие" value={feelingLabel(session.feelingAfter) || '—'} />
            </>
          )}
        </div>

        <div className="card" style={{ padding: '0 16px', marginBottom: 16 }}>
          <StatRow label="Шагов выполнено" value={`${session.completedCycles} из ${session.plannedCycles}`} />
          <div className="divider" />
          <StatRow label="Горячая вода" value={formatDuration(session.actualHotSec)} color="var(--color-hot)" />
          <div className="divider" />
          <StatRow label="Холодная вода" value={formatDuration(session.actualColdSec)} color="var(--color-cold)" />
          <div className="divider" />
          <StatRow label="Итого" value={formatDuration(session.totalActualSec)} />
        </div>

        <div className="card" style={{ padding: '0 16px', marginBottom: 16 }}>
          <p style={{ padding: '12px 0 4px', color: 'var(--text-secondary)', fontSize: 13 }}>
            Параметры режима
          </p>
          <StatRow label="Горячая (план)" value={`${snap.hotDurationSec} сек`} color="var(--color-hot)" />
          <div className="divider" />
          <StatRow label="Холодная (план)" value={`${snap.coldDurationSec} сек`} color="var(--color-cold)" />
          <div className="divider" />
          <StatRow label="Шагов (план)" value={String(snap.steps.length)} />
        </div>

        <button className="btn btn-secondary" onClick={goBack}>
          Назад
        </button>
      </div>
    </div>
  )
}
