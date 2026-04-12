import React from 'react'
import { useNavigationStore } from '../store/navigationStore'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'

export function SettingsScreen() {
  const { goBack } = useNavigationStore()
  const { soundEnabled, dailyGoalSessions, setSoundEnabled, setDailyGoalSessions } = useSettingsStore()
  const { user } = useAuthStore()

  function handleDailyGoalChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = Number(event.target.value)
    if (Number.isNaN(nextValue)) return
    setDailyGoalSessions(nextValue)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <button className="back-btn" onClick={goBack}>‹</button>
        <span className="topbar-title">Настройки</span>
      </div>

      <div className="screen" style={{ paddingTop: 8 }}>
        {user && (
          <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: 'linear-gradient(135deg, var(--color-hot-bg), var(--color-cold-bg))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="type-section"
            >
              {user.firstName[0]?.toUpperCase()}
            </div>
            <div>
              <div className="type-section">{user.firstName} {user.lastName ?? ''}</div>
              {user.username && <div className="type-secondary">@{user.username}</div>}
            </div>
          </div>
        )}

        <SectionLabel>Цель дня</SectionLabel>
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div className="type-section" style={{ marginBottom: 4 }}>Собственная цель</div>
            <div className="type-secondary">Выберите, сколько завершённых сессий вы хотите делать за день.</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" style={{ width: 44, padding: 0, height: 44 }} onClick={() => setDailyGoalSessions(dailyGoalSessions - 1)} disabled={dailyGoalSessions <= 1}>−</button>
            <input type="number" min={1} max={10} value={dailyGoalSessions} onChange={handleDailyGoalChange} className="form-input numeric-tabular" style={{ textAlign: 'center', fontWeight: 600 }} />
            <button className="btn btn-secondary btn-sm" style={{ width: 44, padding: 0, height: 44 }} onClick={() => setDailyGoalSessions(dailyGoalSessions + 1)} disabled={dailyGoalSessions >= 10}>+</button>
          </div>

          <div className="type-secondary numeric-tabular" style={{ marginTop: 10 }}>
            Сейчас цель: {dailyGoalSessions} {pluralSessions(dailyGoalSessions)} в день
          </div>
        </div>

        <SectionLabel>Звук</SectionLabel>
        <div className="card" style={{ marginBottom: 16 }}>
          <ToggleRow label="Звуковой сигнал" description="Сигнал при смене этапа" checked={soundEnabled} onChange={setSoundEnabled} />
        </div>

        <SectionLabel>О приложении</SectionLabel>
        <div className="card" style={{ padding: '0 16px', marginBottom: 16 }}>
          <InfoRow label="Версия" value="1.0.0" />
          <div className="divider" />
          <InfoRow label="Платформа" value="Telegram Mini Apps" />
        </div>
      </div>
    </div>
  )
}

function pluralSessions(value: number): string {
  if (value % 10 === 1 && value % 100 !== 11) return 'сессия'
  if (value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 10 || value % 100 >= 20)) return 'сессии'
  return 'сессий'
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="type-caption" style={{ marginBottom: 8, paddingLeft: 4, textTransform: 'uppercase' }}>{children}</p>
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div className="type-body" style={{ fontWeight: 600 }}>{label}</div>
        <div className="type-secondary" style={{ marginTop: 2 }}>{description}</div>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
      <span className="type-body text-secondary">{label}</span>
      <span className="type-body">{value}</span>
    </div>
  )
}
