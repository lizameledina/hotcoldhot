import React, { useState } from 'react'
import { usePresetsStore } from '../store/presetsStore'
import { useNavigationStore } from '../store/navigationStore'
import type { Preset } from '../types'

interface PresetForm {
  name: string
  hotDurationSec: string
  coldDurationSec: string
  breakDurationSec: string
  cyclesCount: string
}

function defaultForm(preset?: Preset): PresetForm {
  return {
    name: preset?.name ?? '',
    hotDurationSec: String(preset?.hotDurationSec ?? 90),
    coldDurationSec: String(preset?.coldDurationSec ?? 30),
    breakDurationSec: String(preset?.breakDurationSec ?? 10),
    cyclesCount: String(preset?.cyclesCount ?? 3),
  }
}

interface Props {
  editingPreset?: Preset
}

export function CreatePresetScreen({ editingPreset }: Props) {
  const { create, update } = usePresetsStore()
  const { goBack } = useNavigationStore()
  const [form, setForm] = useState<PresetForm>(defaultForm(editingPreset))
  const [errors, setErrors] = useState<Partial<PresetForm>>({})
  const [saving, setSaving] = useState(false)

  const isEdit = !!editingPreset

  function validate(): boolean {
    const e: Partial<PresetForm> = {}
    if (!form.name.trim()) e.name = 'Обязательное поле'
    if (parseInt(form.hotDurationSec) <= 0) e.hotDurationSec = 'Должно быть > 0'
    if (parseInt(form.coldDurationSec) <= 0) e.coldDurationSec = 'Должно быть > 0'
    if (parseInt(form.breakDurationSec) < 0) e.breakDurationSec = 'Должно быть ≥ 0'
    if (parseInt(form.cyclesCount) < 1) e.cyclesCount = 'Должно быть ≥ 1'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const data = {
        name: form.name.trim(),
        hotDurationSec: parseInt(form.hotDurationSec),
        coldDurationSec: parseInt(form.coldDurationSec),
        breakDurationSec: parseInt(form.breakDurationSec) || 0,
        cyclesCount: parseInt(form.cyclesCount),
      }
      if (isEdit && editingPreset) {
        await update(editingPreset.id, data)
      } else {
        await create(data)
      }
      goBack()
    } catch (err) {
      alert('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  function field(label: string, key: keyof PresetForm, hint?: string) {
    return (
      <div className="form-group">
        <label className="form-label">{label}</label>
        <input
          className="form-input"
          type={key === 'name' ? 'text' : 'number'}
          inputMode={key === 'name' ? 'text' : 'numeric'}
          value={form[key]}
          onChange={(e) => {
            setForm((f) => ({ ...f, [key]: e.target.value }))
            setErrors((err) => ({ ...err, [key]: undefined }))
          }}
          placeholder={hint}
        />
        {errors[key] && (
          <div style={{ color: '#ff453a', fontSize: 12, marginTop: 4 }}>{errors[key]}</div>
        )}
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <button className="back-btn" onClick={goBack}>‹</button>
        <span className="topbar-title">{isEdit ? 'Редактировать режим' : 'Новый режим'}</span>
      </div>

      <div className="screen" style={{ paddingTop: 8 }}>
        {field('Название', 'name', 'Мой режим')}

        <div className="card" style={{ padding: '16px', marginBottom: 16 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
            Длительность этапов
          </p>
          {field('Горячая вода (сек)', 'hotDurationSec', '90')}
          {field('Холодная вода (сек)', 'coldDurationSec', '30')}
          {field('Пауза (сек, 0 = без паузы)', 'breakDurationSec', '10')}
        </div>

        {field('Количество циклов', 'cyclesCount', '3')}

        {/* Preview */}
        <div className="card" style={{ padding: 16, marginBottom: 24 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 10 }}>Предпросмотр</p>
          <PreviewBar form={form} />
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
            Общее время: ~{estimateTotal(form)} мин
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button className="btn btn-ghost" onClick={goBack} style={{ marginTop: 8 }}>
          Отмена
        </button>
      </div>
    </div>
  )
}

function PreviewBar({ form }: { form: PresetForm }) {
  const hot = parseInt(form.hotDurationSec) || 0
  const cold = parseInt(form.coldDurationSec) || 0
  const brk = parseInt(form.breakDurationSec) || 0
  const cycles = parseInt(form.cyclesCount) || 1
  const total = (hot + cold + brk) * cycles || 1

  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
      {Array.from({ length: Math.min(cycles, 5) }).map((_, i) => (
        <React.Fragment key={i}>
          <div style={{ flex: hot / total, background: 'var(--color-hot)', minWidth: hot > 0 ? 2 : 0 }} />
          <div style={{ flex: cold / total, background: 'var(--color-cold)', minWidth: cold > 0 ? 2 : 0 }} />
          {brk > 0 && <div style={{ flex: brk / total, background: 'var(--color-break)', minWidth: 2 }} />}
        </React.Fragment>
      ))}
    </div>
  )
}

function estimateTotal(form: PresetForm): string {
  const hot = parseInt(form.hotDurationSec) || 0
  const cold = parseInt(form.coldDurationSec) || 0
  const brk = parseInt(form.breakDurationSec) || 0
  const cycles = parseInt(form.cyclesCount) || 1
  const totalSec = (hot + cold + brk) * cycles
  return (totalSec / 60).toFixed(1)
}
