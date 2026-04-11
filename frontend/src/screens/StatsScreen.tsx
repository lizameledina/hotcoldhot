import React, { useEffect, useState } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import { statsApi } from '../api'
import type { StatsSummary } from '../types'

function formatDur(sec: number): string {
  if (sec === 0) return '0'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}ч ${m}м`
  if (m > 0) return `${m}м ${s}с`
  return `${s}с`
}

export function StatsScreen() {
  const { goBack } = useNavigationStore()
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    statsApi.getSummary()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <button className="back-btn" onClick={goBack}>‹</button>
        <span className="topbar-title">Статистика</span>
      </div>

      <div className="screen" style={{ paddingTop: 8 }}>
        {loading ? (
          <div className="loading" style={{ height: 200 }}>Загрузка...</div>
        ) : !stats ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <p className="empty-state-text">Нет данных</p>
          </div>
        ) : (
          <>
            {/* Streaks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <StreakCard
                label="Текущий стрик"
                value={stats.currentStreak}
                emoji="🔥"
                color={stats.currentStreak > 0 ? 'var(--color-hot)' : 'var(--text-secondary)'}
              />
              <StreakCard
                label="Лучший стрик"
                value={stats.bestStreak}
                emoji="🏆"
                color="var(--color-cold)"
              />
            </div>

            {/* Totals */}
            <div className="card" style={{ padding: '0 16px', marginBottom: 16 }}>
              <SectionHeader>Сессии</SectionHeader>
              <StatRow label="Всего" value={String(stats.total)} />
              <div className="divider" />
              <StatRow label="Завершено" value={String(stats.completed)} color="var(--color-cold)" />
              <div className="divider" />
              <StatRow label="Прервано" value={String(stats.interrupted)} color="var(--color-break)" />
            </div>

            <div className="card" style={{ padding: '0 16px', marginBottom: 16 }}>
              <SectionHeader>Время</SectionHeader>
              <StatRow label="🔥 Горячая вода" value={formatDur(stats.totalHotSec)} color="var(--color-hot)" />
              <div className="divider" />
              <StatRow label="❄️ Холодная вода" value={formatDur(stats.totalColdSec)} color="var(--color-cold)" />
              {stats.totalBreakSec > 0 && (
                <>
                  <div className="divider" />
                  <StatRow label="⏸ Паузы" value={formatDur(stats.totalBreakSec)} color="var(--color-break)" />
                </>
              )}
              <div className="divider" />
              <StatRow label="⏱ Общее время" value={formatDur(stats.totalSec)} />
              <div className="divider" />
              <StatRow label="📈 Средняя длительность" value={formatDur(stats.avgDurationSec)} />
            </div>

            {/* Cold water highlight */}
            {stats.totalColdSec > 0 && (
              <div className="card phase-cold-bg" style={{ padding: 20, textAlign: 'center', marginBottom: 16 }}>
                <p style={{ color: 'var(--color-cold)', fontSize: 13, marginBottom: 4 }}>Всего в холодной воде</p>
                <p style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-cold)' }}>
                  {formatDur(stats.totalColdSec)}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                  Это закаляет!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StreakCard({ label, value, emoji, color }: { label: string; value: number; emoji: string; color: string }) {
  return (
    <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {label}
        {value > 0 && <span> {value === 1 ? 'день' : value < 5 ? 'дня' : 'дней'}</span>}
      </div>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      padding: '12px 0 4px',
      color: 'var(--text-secondary)',
      fontSize: 13,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    }}>
      {children}
    </p>
  )
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}
