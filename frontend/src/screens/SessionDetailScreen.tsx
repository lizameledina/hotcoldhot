import React from 'react'
import { useNavigationStore } from '../store/navigationStore'
import type { Session } from '../types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatDur(sec: number): string {
  if (sec < 60) return `${sec} сек`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m} мин ${s} сек` : `${m} мин`
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

  const snap = session.presetSnapshot as {
    name?: string; hotDurationSec?: number; coldDurationSec?: number; breakDurationSec?: number; cyclesCount?: number
  }
  const isCompleted = session.status === 'COMPLETED'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <button className="back-btn" onClick={goBack}>‹</button>
        <span className="topbar-title">Детали сессии</span>
      </div>

      <div className="screen" style={{ paddingTop: 8 }}>
        {/* Header */}
        <div className="card" style={{ padding: 20, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>
            {isCompleted ? '✅' : '⚠️'}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            {isCompleted ? 'Завершено' : 'Прервано'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {snap.name}
          </p>
        </div>

        {/* Date/time */}
        <div className="card" style={{ padding: '0 16px', marginBottom: 16 }}>
          <StatRow label="Начало" value={formatDate(session.startedAt)} />
          {session.endedAt && (
            <>
              <div className="divider" />
              <StatRow label="Конец" value={formatDate(session.endedAt)} />
            </>
          )}
        </div>

        {/* Performance */}
        <div className="card" style={{ padding: '0 16px', marginBottom: 16 }}>
          <StatRow
            label="Циклов выполнено"
            value={`${session.completedCycles} из ${session.plannedCycles}`}
          />
          <div className="divider" />
          <StatRow label="🔥 Горячая вода" value={formatDur(session.actualHotSec)} color="var(--color-hot)" />
          <div className="divider" />
          <StatRow label="❄️ Холодная вода" value={formatDur(session.actualColdSec)} color="var(--color-cold)" />
          {session.actualBreakSec > 0 && (
            <>
              <div className="divider" />
              <StatRow label="⏸ Паузы" value={formatDur(session.actualBreakSec)} color="var(--color-break)" />
            </>
          )}
          <div className="divider" />
          <StatRow label="⏱ Итого" value={formatDur(session.totalActualSec)} />
        </div>

        {/* Preset info */}
        <div className="card" style={{ padding: '0 16px', marginBottom: 16 }}>
          <p style={{ padding: '12px 0 4px', color: 'var(--text-secondary)', fontSize: 13 }}>
            Параметры режима
          </p>
          {snap.hotDurationSec !== undefined && (
            <StatRow label="Горячая (план)" value={`${snap.hotDurationSec} сек`} color="var(--color-hot)" />
          )}
          {snap.coldDurationSec !== undefined && (
            <>
              <div className="divider" />
              <StatRow label="Холодная (план)" value={`${snap.coldDurationSec} сек`} color="var(--color-cold)" />
            </>
          )}
          {snap.cyclesCount !== undefined && (
            <>
              <div className="divider" />
              <StatRow label="Циклов (план)" value={String(snap.cyclesCount)} />
            </>
          )}
        </div>

        <button className="btn btn-secondary" onClick={goBack}>
          Назад
        </button>
      </div>
    </div>
  )
}
