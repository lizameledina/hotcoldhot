import React, { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { usePresetsStore } from '../store/presetsStore'
import { useNavigationStore } from '../store/navigationStore'
import { useSessionStore } from '../store/sessionStore'
import type { Preset } from '../types'

export function HomeScreen() {
  const { user } = useAuthStore()
  const { system, user: userPresets, isLoading, lastPresetId, fetch, setLastPreset } = usePresetsStore()
  const { navigate } = useNavigationStore()
  const { active } = useSessionStore()

  useEffect(() => {
    fetch()
  }, [fetch])

  const allPresets = [...system, ...userPresets]
  const lastPreset = lastPresetId ? allPresets.find((p) => p.id === lastPresetId) : allPresets[0]

  function handleStart(preset: Preset) {
    setLastPreset(preset.id)
    navigate('session')
  }

  return (
    <div className="screen fade-in" style={{ paddingTop: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>Добро пожаловать</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>
          {user?.firstName ? `Привет, ${user.firstName}` : 'Контрастный душ'}
        </h1>
      </div>

      {/* Resume session banner */}
      {active && (
        <button
          className="btn fade-in"
          onClick={() => navigate('session')}
          style={{
            background: 'linear-gradient(135deg, #ff6b35, #4a9eff)',
            color: 'white',
            marginBottom: 16,
            gap: 8,
          }}
        >
          <span>🔄</span>
          <span>Продолжить сессию</span>
        </button>
      )}

      {/* Quick start */}
      {lastPreset && !active && (
        <div className="card fade-in" style={{ padding: 20, marginBottom: 20 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>
            Последний режим
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{lastPreset.name}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
            {lastPreset.cyclesCount} цикл{lastPreset.cyclesCount === 1 ? '' : lastPreset.cyclesCount < 5 ? 'а' : 'ов'} · {' '}
            горячая {lastPreset.hotDurationSec}с · холодная {lastPreset.coldDurationSec}с
          </p>
          <button className="btn btn-hot" onClick={() => handleStart(lastPreset)}>
            Начать
          </button>
        </div>
      )}

      {/* All presets */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Режимы</h3>
          <button className="btn-ghost btn" style={{ width: 'auto', padding: '4px 0' }} onClick={() => navigate('presets')}>
            Все режимы →
          </button>
        </div>

        {isLoading ? (
          <div style={{ color: 'var(--text-secondary)', padding: 16, textAlign: 'center' }}>Загрузка...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...system, ...userPresets].slice(0, 4).map((preset) => (
              <PresetRow
                key={preset.id}
                preset={preset}
                isActive={preset.id === lastPreset?.id}
                onSelect={() => handleStart(preset)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Nav grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
        <NavCard icon="📋" label="История" onClick={() => navigate('history')} />
        <NavCard icon="📊" label="Статистика" onClick={() => navigate('stats')} />
        <NavCard icon="⚙️" label="Настройки" onClick={() => navigate('settings')} />
        <NavCard icon="➕" label="Новый режим" onClick={() => navigate('create-preset')} />
      </div>
    </div>
  )
}

function PresetRow({ preset, isActive, onSelect }: { preset: Preset; isActive: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '14px 16px',
        background: isActive ? 'rgba(74,158,255,0.1)' : 'var(--bg-card)',
        border: `1px solid ${isActive ? 'rgba(74,158,255,0.3)' : 'var(--border)'}`,
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'opacity 0.15s',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
          {preset.name}
          {preset.isSystem && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>системный</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          🔴 {preset.hotDurationSec}с · 🔵 {preset.coldDurationSec}с · {preset.cyclesCount}×
        </div>
      </div>
      <span style={{ color: 'var(--text-muted)', fontSize: 20 }}>›</span>
    </button>
  )
}

function NavCard({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card"
      style={{
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
        cursor: 'pointer',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        transition: 'opacity 0.15s',
        borderRadius: 'var(--radius)',
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
    </button>
  )
}
