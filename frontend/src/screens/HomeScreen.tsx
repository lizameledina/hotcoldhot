import React, { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { usePresetsStore } from '../store/presetsStore'
import { useNavigationStore } from '../store/navigationStore'
import { useSessionStore } from '../store/sessionStore'
import { useStatsStore } from '../store/statsStore'
import { useSettingsStore } from '../store/settingsStore'
import type { Preset } from '../types'

export function HomeScreen() {
  const { user } = useAuthStore()
  const { system, user: userPresets, isLoading, lastPresetId, fetch, setLastPreset } = usePresetsStore()
  const { navigate } = useNavigationStore()
  const { active } = useSessionStore()
  const { summary, fetch: fetchStats } = useStatsStore()
  const { dailyGoalSessions } = useSettingsStore()

  useEffect(() => {
    fetch()
    fetchStats()
  }, [fetch, fetchStats])

  const allPresets = [...userPresets, ...system]
  const lastPreset = lastPresetId ? allPresets.find((preset) => preset.id === lastPresetId) : allPresets[0]
  const streak = summary?.currentStreak ?? 0
  const todayCompletedCount = summary?.todayCompletedCount ?? 0
  const todayGoalDone = todayCompletedCount >= dailyGoalSessions
  const goalRemaining = Math.max(dailyGoalSessions - todayCompletedCount, 0)

  function handleStart(preset: Preset) {
    setLastPreset(preset.id)
    navigate('session')
  }

  return (
    <div className="screen fade-in" style={{ paddingTop: 18 }}>
      <div className="card" style={{ padding: 22, marginBottom: 18, position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(140deg, rgba(255, 90, 47, 0.08) 0 24%, transparent 24% 58%, rgba(47, 107, 255, 0.08) 58% 100%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative' }}>
          <p className="type-secondary" style={{ marginBottom: 6 }}>Добро пожаловать</p>
          <h1 className="type-title">
            {user?.firstName ? `Привет, ${user.firstName}` : 'Контрастный душ'}
          </h1>
        </div>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          <StatusCard
            title="Серия"
            value={streak > 0 ? `${streak} ${pluralDays(streak)}` : 'Пока нет'}
            hint={streak > 0 ? 'Продолжается' : 'Начнётся после первой завершённой сессии'}
            accent="warm"
          />
          <StatusCard
            title="Цель дня"
            value={todayGoalDone ? 'Выполнена' : dailyGoalSessions === 1 ? 'Не выполнена' : `${todayCompletedCount} из ${dailyGoalSessions}`}
            hint={getGoalHint(todayGoalDone, dailyGoalSessions, goalRemaining)}
            accent="cold"
          />
        </div>
      )}

      {active && (
        <button className="btn btn-primary fade-in" onClick={() => navigate('session')} style={{ marginBottom: 18 }}>
          Продолжить сессию
        </button>
      )}

      {lastPreset && !active && (
        <div className="card fade-in" style={{ padding: 20, marginBottom: 18, position: 'relative', overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(255, 90, 47, 0.05) 0 50%, rgba(47, 107, 255, 0.05) 50% 100%)',
              opacity: 0.9,
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative' }}>
            <p className="type-caption" style={{ textTransform: 'uppercase', marginBottom: 8 }}>Последний режим</p>
            <h2 className="type-title" style={{ fontSize: 22, lineHeight: '28px', marginBottom: 8 }}>{lastPreset.name}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <MetaPill label={`Общее время ${formatProtocolDuration(lastPreset.steps)}`} tone="warm" />
              <MetaPill label={`${lastPreset.steps.length} ${pluralSteps(lastPreset.steps.length)}`} tone="neutral" />
            </div>
            <button className="btn btn-hot" onClick={() => handleStart(lastPreset)}>
              Начать
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 className="type-section">Режимы</h3>
          <button className="btn-ghost btn" style={{ width: 'auto', padding: '4px 0' }} onClick={() => navigate('presets')}>
            Все режимы
          </button>
        </div>

        {isLoading ? (
          <div className="type-body text-secondary" style={{ padding: 16, textAlign: 'center' }}>Загрузка...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...userPresets, ...system].slice(0, 4).map((preset) => (
              <PresetRow key={preset.id} preset={preset} isActive={preset.id === lastPreset?.id} onSelect={() => handleStart(preset)} />
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
        <NavCard label="История" glyph="↺" onClick={() => navigate('history')} />
        <NavCard label="Статистика" glyph="▦" onClick={() => navigate('stats')} />
        <NavCard label="Настройки" glyph="⚙" onClick={() => navigate('settings')} />
        <NavCard label="Новый режим" glyph="＋" onClick={() => navigate('create-preset')} />
      </div>
    </div>
  )
}

function getGoalHint(isDone: boolean, dailyGoalSessions: number, goalRemaining: number): string {
  if (isDone) return 'Сегодня цель дня уже выполнена'
  if (dailyGoalSessions === 1) return 'Завершите одну сессию, чтобы выполнить цель дня!'
  if (goalRemaining === 1) return 'Осталась ещё одна сессия до цели дня'
  return `Осталось ещё ${goalRemaining} ${pluralSessions(goalRemaining)} до цели дня`
}

function formatProtocolDuration(steps: Preset['steps']): string {
  const total = steps.reduce((sum, step) => sum + step.durationSec, 0)
  if (total < 60) return `${total} с`
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return seconds > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${minutes}:00`
}

function pluralDays(value: number): string {
  if (value % 10 === 1 && value % 100 !== 11) return 'день'
  if (value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 10 || value % 100 >= 20)) return 'дня'
  return 'дней'
}

function pluralSessions(value: number): string {
  if (value % 10 === 1 && value % 100 !== 11) return 'сессия'
  if (value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 10 || value % 100 >= 20)) return 'сессии'
  return 'сессий'
}

function pluralSteps(value: number): string {
  if (value % 10 === 1 && value % 100 !== 11) return 'шаг'
  if (value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 10 || value % 100 >= 20)) return 'шага'
  return 'шагов'
}

function StatusCard({
  title,
  value,
  hint,
  accent,
}: {
  title: string
  value: string
  hint: string
  accent: 'warm' | 'cold'
}) {
  const accentStyle = accent === 'warm'
    ? { background: 'var(--color-hot-bg)', color: 'var(--color-hot)' }
    : { background: 'var(--color-cold-bg)', color: 'var(--color-cold)' }

  return (
    <div className="card" style={{ padding: 16, textAlign: 'center' }}>
      <div style={{ ...accentStyle, display: 'inline-flex', padding: '5px 10px', borderRadius: 12, marginBottom: 12 }} className="type-caption">
        {title}
      </div>
      <p className="type-section" style={{ marginBottom: 6 }}>{value}</p>
      <p className="type-secondary">{hint}</p>
    </div>
  )
}

function MetaPill({ label, tone }: { label: string; tone: 'warm' | 'cold' | 'neutral' }) {
  const styles =
    tone === 'warm'
      ? { background: 'var(--color-hot-bg)', color: 'var(--color-hot)' }
      : tone === 'cold'
        ? { background: 'var(--color-cold-bg)', color: 'var(--color-cold)' }
        : { background: 'rgba(138, 143, 152, 0.12)', color: 'var(--text-secondary)' }

  return (
    <span style={{ ...styles, display: 'inline-flex', padding: '7px 10px', borderRadius: 12 }} className="type-secondary">
      {label}
    </span>
  )
}

function PresetRow({ preset, isActive, onSelect }: { preset: Preset; isActive: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 16px',
        background: isActive ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        border: `1px solid ${isActive ? 'rgba(47, 107, 255, 0.22)' : 'var(--border)'}`,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <div className="type-body" style={{ fontWeight: 600 }}>{preset.name}</div>
          {preset.isSystem && <span className="type-caption" style={{ background: 'rgba(138, 143, 152, 0.12)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: 10 }}>системный</span>}
        </div>
        <div className="type-secondary">{formatProtocolDuration(preset.steps)} · {preset.steps.length} {pluralSteps(preset.steps.length)}</div>
      </div>
      <span className="type-section" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>›</span>
    </button>
  )
}

function NavCard({ label, glyph, onClick }: { label: string; glyph: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card"
      style={{
        padding: '20px 18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 118,
        cursor: 'pointer',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        gap: 12,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(255, 90, 47, 0.05) 0 34%, transparent 34% 66%, rgba(47, 107, 255, 0.05) 66% 100%)',
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          position: 'relative',
          width: 38,
          height: 38,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}
        className="type-section"
      >
        {glyph}
      </span>
      <span className="type-body" style={{ position: 'relative', fontWeight: 600 }}>{label}</span>
    </button>
  )
}
