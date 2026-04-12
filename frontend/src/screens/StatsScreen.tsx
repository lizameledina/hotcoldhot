import React, { useEffect, useState } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import { statsApi } from '../api'
import type { FeelingAfter, StatsPeriod, StatsSummary, StatsTimeseriesDay } from '../types'

const PERIOD_OPTIONS: StatsPeriod[] = ['7d', '30d']

function formatDuration(sec: number): string {
  if (sec <= 0) return '0 сек'
  if (sec < 60) return `${sec} сек`
  const minutes = Math.floor(sec / 60)
  const seconds = sec % 60
  return seconds > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${minutes}:00`
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatWeekRange(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const sameMonth = start.getUTCMonth() === end.getUTCMonth()
  if (sameMonth) return `${start.getUTCDate()}–${end.getUTCDate()} ${end.toLocaleDateString('ru-RU', { month: 'short', timeZone: 'UTC' })}`
  return `${start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' })} – ${end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`
}

function pluralDays(value: number): string {
  if (value % 10 === 1 && value % 100 !== 11) return 'день'
  if (value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 10 || value % 100 >= 20)) return 'дня'
  return 'дней'
}

function getFeelingLabel(feeling: FeelingAfter | null): string | null {
  if (feeling === 'energized') return 'Бодро'
  if (feeling === 'normal') return 'Нормально'
  if (feeling === 'hard') return 'Тяжело'
  return null
}

export function StatsScreen() {
  const { goBack } = useNavigationStore()
  const [period, setPeriod] = useState<StatsPeriod>('7d')
  const [summary, setSummary] = useState<StatsSummary | null>(null)
  const [timeseries, setTimeseries] = useState<StatsTimeseriesDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([statsApi.getSummary(period), statsApi.getTimeseries(period)])
      .then(([nextSummary, nextTimeseries]) => {
        setSummary(nextSummary)
        setTimeseries(nextTimeseries.days)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <button className="back-btn" onClick={goBack}>‹</button>
        <span className="topbar-title">Статистика</span>
      </div>

      <div className="screen" style={{ paddingTop: 8 }}>
        <div className="segmented-control" style={{ marginBottom: 16 }}>
          {PERIOD_OPTIONS.map((option) => (
            <button key={option} className={`segmented-chip ${period === option ? 'is-active' : ''}`} onClick={() => setPeriod(option)}>
              {option === '7d' ? '7 дней' : '30 дней'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading" style={{ height: 220 }}>Загрузка...</div>
        ) : !summary ? (
          <div className="empty-state">
            <div className="empty-state-icon">▦</div>
            <p className="empty-state-text">Нет данных</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <SeriesCard title="Текущая серия" value={summary.currentStreak} accent="warm" />
              <SeriesCard title="Лучшая серия" value={summary.bestStreak} accent="cold" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <MetricCard label="Средняя длительность" value={formatDuration(summary.avgSessionSec)} />
              <MetricCard label="Холодной воды за 7 дней" value={formatDuration(summary.last7ColdSec)} accent="var(--color-cold)" />
              <MetricCard label="Завершённых сессий за 7 дней" value={String(summary.last7CompletedSessions)} />
              <MetricCard label="Лучшая неделя" value={summary.bestWeek ? formatWeekRange(summary.bestWeek.startDate, summary.bestWeek.endDate) : 'Пока нет'} />
            </div>

            {summary.mostCommonFeeling && (
              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <p className="type-secondary" style={{ marginBottom: 6 }}>Чаще всего после душа</p>
                <p className="type-section">{getFeelingLabel(summary.mostCommonFeeling)}</p>
              </div>
            )}

            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <p className="type-section" style={{ marginBottom: 12 }}>Сессии по дням</p>
              <BarsChart days={timeseries} />
            </div>

            <div className="card" style={{ padding: '0 16px', marginBottom: 16 }}>
              <SectionHeader>Всего</SectionHeader>
              <StatRow label="Сессий" value={String(summary.total)} />
              <div className="divider" />
              <StatRow label="Завершено" value={String(summary.completed)} color="var(--color-cold)" />
              <div className="divider" />
              <StatRow label="Прервано" value={String(summary.interrupted)} />
              <div className="divider" />
              <StatRow label="Общее время" value={formatDuration(summary.totalSec)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function BarsChart({ days }: { days: StatsTimeseriesDay[] }) {
  const width = 320
  const height = 140
  const gap = days.length > 7 ? 4 : 8
  const barWidth = Math.max(4, (width - gap * Math.max(days.length - 1, 0)) / Math.max(days.length, 1))
  const maxValue = Math.max(...days.map((day) => day.completedSessions), 0)
  const chartHeight = 110
  const labels = days.length > 0 ? [days[0], days[Math.floor(days.length / 2)], days[days.length - 1]] : []

  return (
    <div>
      <div className="type-caption numeric-tabular" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span>0</span>
        <span>{maxValue}</span>
      </div>
      <div className="chart-shell">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: 140 }}>
          <line x1="0" y1={chartHeight + 8} x2={width} y2={chartHeight + 8} stroke="var(--border)" strokeWidth="1" />
          {days.map((day, index) => {
            const value = day.completedSessions
            const barHeight = maxValue > 0 ? Math.max((value / maxValue) * chartHeight, value > 0 ? 6 : 0) : 0
            const x = index * (barWidth + gap)
            const y = chartHeight + 8 - barHeight
            return (
              <rect
                key={day.date}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={Math.min(barWidth / 2, 4)}
                fill="var(--color-cold)"
                opacity={value > 0 ? 0.95 : 0.18}
              />
            )
          })}
        </svg>
      </div>
      <div className="type-caption" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {labels.map((day, index) => (
          <span key={`${day.date}-${index}`}>{formatShortDate(day.date)}</span>
        ))}
      </div>
      {maxValue === 0 && <p className="type-secondary" style={{ marginTop: 10 }}>Пустые дни отображаются, данные появятся после завершённых сессий</p>}
    </div>
  )
}

function SeriesCard({ title, value, accent }: { title: string; value: number; accent: 'warm' | 'cold' }) {
  const color = accent === 'warm' ? 'var(--color-hot)' : 'var(--color-cold)'
  const background = accent === 'warm' ? 'var(--color-hot-bg)' : 'var(--color-cold-bg)'
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="type-caption" style={{ display: 'inline-flex', padding: '5px 10px', borderRadius: 12, background, color, marginBottom: 12 }}>{title}</div>
      <div className="type-section numeric-tabular">{value} {pluralDays(value)}</div>
    </div>
  )
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <p className="type-caption" style={{ marginBottom: 8 }}>{label}</p>
      <p className="type-section numeric-tabular" style={{ color: accent || 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <p className="type-caption" style={{ padding: '12px 0 4px', textTransform: 'uppercase' }}>{children}</p>
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
      <span className="type-body text-secondary">{label}</span>
      <span className="type-body numeric-tabular" style={{ fontWeight: 600, color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}
