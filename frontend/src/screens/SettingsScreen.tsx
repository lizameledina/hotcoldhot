import React from 'react'
import { useNavigationStore } from '../store/navigationStore'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'
import type { Theme } from '../types'

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'SYSTEM', label: 'Системная' },
  { value: 'LIGHT', label: 'Светлая' },
  { value: 'DARK', label: 'Тёмная' },
]

export function SettingsScreen() {
  const { goBack } = useNavigationStore()
  const { soundEnabled, vibrationEnabled, theme, setSoundEnabled, setVibrationEnabled, setTheme } = useSettingsStore()
  const { user } = useAuthStore()

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <button className="back-btn" onClick={goBack}>‹</button>
        <span className="topbar-title">Настройки</span>
      </div>

      <div className="screen" style={{ paddingTop: 8 }}>
        {/* User info */}
        {user && (
          <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-hot), var(--color-cold))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: 'white',
              fontWeight: 700,
            }}>
              {user.firstName[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>
                {user.firstName} {user.lastName ?? ''}
              </div>
              {user.username && (
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>@{user.username}</div>
              )}
            </div>
          </div>
        )}

        {/* Sound & Vibration */}
        <SectionLabel>Уведомления</SectionLabel>
        <div className="card" style={{ marginBottom: 16 }}>
          <ToggleRow
            label="Звук"
            description="Сигнал при смене этапа"
            checked={soundEnabled}
            onChange={setSoundEnabled}
          />
          <div className="divider" style={{ margin: '0 16px' }} />
          <ToggleRow
            label="Вибрация"
            description="Вибрация при смене этапа"
            checked={vibrationEnabled}
            onChange={setVibrationEnabled}
          />
        </div>

        {/* Theme */}
        <SectionLabel>Тема</SectionLabel>
        <div className="card" style={{ marginBottom: 16 }}>
          {THEME_OPTIONS.map((opt, i) => (
            <React.Fragment key={opt.value}>
              {i > 0 && <div className="divider" style={{ margin: '0 16px' }} />}
              <button
                onClick={() => setTheme(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                }}
              >
                <span style={{ fontSize: 16 }}>{opt.label}</span>
                <span style={{ fontSize: 20, color: theme === opt.value ? 'var(--color-cold)' : 'transparent' }}>
                  ✓
                </span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* App info */}
        <SectionLabel>О приложении</SectionLabel>
        <div className="card" style={{ padding: '0 16px', marginBottom: 16 }}>
          <InfoRow label="Версия" value="1.0.0" />
          <div className="divider" />
          <InfoRow label="Разработано для" value="Telegram Mini Apps" />
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      paddingLeft: 4,
    }}>
      {children}
    </p>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{description}</div>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{label}</span>
      <span style={{ fontSize: 15, color: 'var(--text-muted)' }}>{value}</span>
    </div>
  )
}
