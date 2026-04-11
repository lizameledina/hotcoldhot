import React, { useEffect } from 'react'
import { usePresetsStore } from '../store/presetsStore'
import { useNavigationStore } from '../store/navigationStore'
import type { Preset } from '../types'

export function PresetsScreen() {
  const { system, user: userPresets, isLoading, fetch, remove } = usePresetsStore()
  const { navigate, navigateToEdit, goBack } = useNavigationStore()

  useEffect(() => { fetch() }, [fetch])

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
        <button
          className="btn btn-primary btn-sm"
          style={{ width: 'auto', padding: '8px 16px' }}
          onClick={() => navigate('create-preset')}
        >
          + Создать
        </button>
      </div>

      <div className="screen" style={{ paddingTop: 8 }}>
        {isLoading ? (
          <div className="loading">Загрузка...</div>
        ) : (
          <>
            <SectionTitle>Системные</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {system.map((p) => (
                <PresetCard key={p.id} preset={p} onDelete={undefined} onEdit={undefined} />
              ))}
            </div>

            <SectionTitle>Мои режимы</SectionTitle>
            {userPresets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🚿</div>
                <p className="empty-state-text">Нет пользовательских режимов.<br />Создайте свой!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {userPresets.map((p) => (
                  <PresetCard
                    key={p.id}
                    preset={p}
                    onEdit={() => navigateToEdit(p)}
                    onDelete={() => handleDelete(p)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 10,
    }}>
      {children}
    </h3>
  )
}

function PresetCard({
  preset,
  onEdit,
  onDelete,
}: {
  preset: Preset
  onEdit: (() => void) | undefined
  onDelete: (() => void) | undefined
}) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{preset.name}</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--color-hot)' }}>🔥 {preset.hotDurationSec}с</span>
            <span style={{ color: 'var(--color-cold)' }}>❄️ {preset.coldDurationSec}с</span>
            {preset.breakDurationSec > 0 && <span>⏸ {preset.breakDurationSec}с</span>}
            <span>× {preset.cyclesCount}</span>
          </div>
        </div>
        {!preset.isSystem && (
          <div style={{ display: 'flex', gap: 6 }}>
            {onEdit && (
              <button
                onClick={onEdit}
                style={{
                  background: 'rgba(74,158,255,0.1)',
                  border: '1px solid rgba(74,158,255,0.2)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  color: 'var(--color-cold)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Изм.
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                style={{
                  background: 'rgba(255,59,48,0.1)',
                  border: '1px solid rgba(255,59,48,0.2)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  color: '#ff453a',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Удал.
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div style={{ marginTop: 10, height: 4, borderRadius: 2, display: 'flex', overflow: 'hidden', gap: 2 }}>
        {Array.from({ length: preset.cyclesCount }).map((_, i) => (
          <React.Fragment key={i}>
            <div style={{ flex: preset.hotDurationSec, background: 'var(--color-hot)', borderRadius: 2 }} />
            <div style={{ flex: preset.coldDurationSec, background: 'var(--color-cold)', borderRadius: 2 }} />
            {preset.breakDurationSec > 0 && (
              <div style={{ flex: preset.breakDurationSec, background: 'var(--color-break)', borderRadius: 2 }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
