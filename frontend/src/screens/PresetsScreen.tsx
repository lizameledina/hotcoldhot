import React, { useEffect } from 'react'
import { usePresetsStore } from '../store/presetsStore'
import { useNavigationStore } from '../store/navigationStore'
import type { Preset } from '../types'

export function PresetsScreen() {
  const { system, user: userPresets, isLoading, fetch, remove } = usePresetsStore()
  const { navigate, navigateToEdit, goBack } = useNavigationStore()

  useEffect(() => {
    fetch()
  }, [fetch])

  async function handleDelete(preset: Preset) {
    if (window.confirm(`Удалить режим "${preset.name}"?`)) {
      await remove(preset.id)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <button className="back-btn" onClick={goBack}>‹</button>
        <span className="topbar-title">Режимы</span>
        <button className="btn btn-primary btn-sm" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => navigate('create-preset')}>
          Создать
        </button>
      </div>

      <div className="screen" style={{ paddingTop: 8 }}>
        {isLoading ? (
          <div className="loading">Загрузка...</div>
        ) : (
          <>
            <SectionTitle>Мои режимы</SectionTitle>
            {userPresets.length === 0 ? (
              <div className="empty-state" style={{ paddingTop: 36, paddingBottom: 36 }}>
                <div className="empty-state-icon">＋</div>
                <p className="empty-state-text">Нет пользовательских режимов.<br />Создайте свой.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {userPresets.map((preset) => (
                  <PresetCard key={preset.id} preset={preset} onEdit={() => navigateToEdit(preset)} onDelete={() => handleDelete(preset)} />
                ))}
              </div>
            )}

            <SectionTitle>Системные</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {system.map((preset) => (
                <PresetCard key={preset.id} preset={preset} onDelete={() => handleDelete(preset)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="type-caption" style={{ textTransform: 'uppercase', marginBottom: 10 }}>{children}</h3>
}

function PresetCard({
  preset,
  onEdit,
  onDelete,
}: {
  preset: Preset
  onEdit?: () => void
  onDelete?: () => void
}) {
  const totalDuration = preset.steps.reduce((sum, step) => sum + step.durationSec, 0)

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <div className="type-section">{preset.name}</div>
            {preset.isSystem && (
              <span className="type-caption" style={{ background: 'rgba(138, 143, 152, 0.12)', padding: '4px 8px', borderRadius: 10 }}>
                системный
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <MetaPill label={`Всего ${formatDuration(totalDuration)}`} tone="warm" />
            <MetaPill label={`${preset.steps.length} ${pluralSteps(preset.steps.length)}`} tone="neutral" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {!preset.isSystem && onEdit && (
            <button onClick={onEdit} className="btn btn-secondary btn-sm" style={{ width: 'auto', padding: '8px 12px' }}>
              Изм.
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="btn btn-sm"
              style={{ width: 'auto', padding: '8px 12px', background: 'rgba(255, 90, 47, 0.08)', color: 'var(--color-hot)', border: '1px solid rgba(255, 90, 47, 0.18)' }}
            >
              Удал.
            </button>
          )}
        </div>
      </div>

    </div>
  )
}

function MetaPill({ label, tone }: { label: string; tone: 'warm' | 'cold' | 'neutral' }) {
  const style =
    tone === 'warm'
      ? { background: 'var(--color-hot-bg)', color: 'var(--color-hot)' }
      : tone === 'cold'
        ? { background: 'var(--color-cold-bg)', color: 'var(--color-cold)' }
        : { background: 'rgba(138, 143, 152, 0.12)', color: 'var(--text-secondary)' }

  return (
    <span className="type-secondary" style={{ ...style, display: 'inline-flex', padding: '6px 10px', borderRadius: 10 }}>
      {label}
    </span>
  )
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} с`
  const minutes = Math.floor(sec / 60)
  const seconds = sec % 60
  return seconds > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${minutes}:00`
}

function pluralSteps(value: number): string {
  if (value % 10 === 1 && value % 100 !== 11) return 'шаг'
  if (value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 10 || value % 100 >= 20)) return 'шага'
  return 'шагов'
}
