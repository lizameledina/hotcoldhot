import React, { useMemo, useState } from 'react'
import { usePresetsStore } from '../store/presetsStore'
import { useNavigationStore } from '../store/navigationStore'
import type { Preset, ProtocolStep, StepType } from '../types'

interface Props {
  editingPreset?: Preset
}

interface PresetForm {
  name: string
  steps: ProtocolStep[]
}

const MIN_DURATION_SEC = 1
const DEFAULT_DURATION_SEC = 30

function createStep(partial?: Partial<ProtocolStep>, fallbackType: StepType = 'hot'): ProtocolStep {
  return {
    id: partial?.id ?? `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: partial?.type ?? fallbackType,
    durationSec: partial?.durationSec ?? DEFAULT_DURATION_SEC,
  }
}

function getOppositeType(type: StepType): StepType {
  return type === 'hot' ? 'cold' : 'hot'
}

function enforceAlternatingSteps(steps: ProtocolStep[]): ProtocolStep[] {
  if (steps.length === 0) return steps
  const firstType = steps[0].type

  return steps.map((step, index) => ({
    ...step,
    type: index === 0 ? firstType : index % 2 === 1 ? getOppositeType(firstType) : firstType,
  }))
}

function defaultForm(preset?: Preset): PresetForm {
  const steps = preset?.steps?.length
    ? preset.steps.map((step) => createStep(step, step.type))
    : [createStep({ type: 'hot', durationSec: DEFAULT_DURATION_SEC })]

  return {
    name: preset?.name ?? '',
    steps: enforceAlternatingSteps(steps),
  }
}

function formatDuration(sec: number) {
  if (sec < 60) return `${sec} с`
  const minutes = Math.floor(sec / 60)
  const rest = sec % 60
  return rest > 0 ? `${minutes}:${String(rest).padStart(2, '0')}` : `${minutes}:00`
}

function getStepTitle(type: StepType) {
  return type === 'hot' ? 'Горячая вода' : 'Холодная вода'
}

function getStepIcon(type: StepType) {
  return type === 'hot' ? '🔥' : '❄️'
}

function pluralSteps(value: number): string {
  if (value % 10 === 1 && value % 100 !== 11) return 'шаг'
  if (value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 10 || value % 100 >= 20)) return 'шага'
  return 'шагов'
}

export function CreatePresetScreen({ editingPreset }: Props) {
  const { create, update } = usePresetsStore()
  const { goBack } = useNavigationStore()
  const [form, setForm] = useState<PresetForm>(defaultForm(editingPreset))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEdit = Boolean(editingPreset)
  const totalDurationSec = useMemo(() => form.steps.reduce((sum, step) => sum + step.durationSec, 0), [form.steps])

  function patchStep(id: string, patch: Partial<ProtocolStep>) {
    setForm((current) => ({
      ...current,
      steps: enforceAlternatingSteps(
        current.steps.map((step, index) => {
          if (step.id !== id) return step
          if (index === 0) return { ...step, ...patch }
          return { ...step, durationSec: patch.durationSec ?? step.durationSec }
        })
      ),
    }))
  }

  function addStep() {
    setForm((current) => {
      const lastStep = current.steps[current.steps.length - 1]
      const fallbackType = lastStep ? getOppositeType(lastStep.type) : 'hot'
      const next = createStep({
        type: fallbackType,
        durationSec: lastStep?.durationSec ?? DEFAULT_DURATION_SEC,
      })

      return {
        ...current,
        steps: enforceAlternatingSteps([...current.steps, next]),
      }
    })
  }

  function deleteLastStep() {
    setForm((current) => ({
      ...current,
      steps: enforceAlternatingSteps(current.steps.slice(0, -1)),
    }))
  }

  function validate() {
    const nextErrors: Record<string, string> = {}
    if (!form.name.trim()) nextErrors.name = 'Укажите название'
    if (form.steps.length === 0) nextErrors.steps = 'Добавьте хотя бы один шаг'

    form.steps.forEach((step) => {
      if (step.durationSec < MIN_DURATION_SEC) {
        nextErrors[`step_${step.id}`] = 'Минимум 1 секунда'
      }
    })

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        steps: form.steps,
        progressionEnabled: false,
        increaseStepSec: null,
        increaseEveryNDays: null,
        maxColdDurationSec: null,
      }

      if (isEdit && editingPreset) {
        await update(editingPreset.id, payload)
      } else {
        await create(payload)
      }

      goBack()
    } catch {
      alert('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <button className="back-btn" onClick={goBack}>‹</button>
        <span className="topbar-title">Контрастные переходы</span>
      </div>

      <div className="screen" style={{ paddingTop: 8, paddingBottom: 132 }}>
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <label className="form-label">Название режима</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Мой режим"
          />
          {errors.name && <InlineError text={errors.name} />}
        </div>

        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div className="type-section" style={{ marginBottom: 4 }}>Структура режима</div>
          <div className="type-secondary numeric-tabular">
            {form.steps.length} {pluralSteps(form.steps.length)} · {formatDuration(totalDurationSec)}
          </div>
        </div>

        {form.steps.length === 0 ? (
          <div className="card" style={{ padding: 24, marginBottom: 16, textAlign: 'center' }}>
            <div className="type-section" style={{ marginBottom: 8 }}>Добавьте первый шаг</div>
            <div className="type-body text-secondary" style={{ marginBottom: 16 }}>
              Соберите простую последовательность горячих и холодных шагов
            </div>
            <button className="btn btn-primary" onClick={addStep}>Добавить шаг</button>
            {errors.steps && <InlineError text={errors.steps} />}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
            {form.steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                isFirst={index === 0}
                isLast={index === form.steps.length - 1}
                error={errors[`step_${step.id}`]}
                onPatch={patchStep}
                onDeleteLast={deleteLastStep}
              />
            ))}
          </div>
        )}

        <button className="btn btn-secondary" onClick={addStep}>Добавить шаг</button>
      </div>

      <div
        style={{
          position: 'sticky',
          bottom: 0,
          padding: '12px 18px calc(12px + var(--safe-bottom))',
          background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, var(--bg-primary) 22%)',
        }}
      >
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить режим'}
        </button>
      </div>
    </div>
  )
}

function StepCard({
  step,
  index,
  isFirst,
  isLast,
  error,
  onPatch,
  onDeleteLast,
}: {
  step: ProtocolStep
  index: number
  isFirst: boolean
  isLast: boolean
  error?: string
  onPatch: (id: string, patch: Partial<ProtocolStep>) => void
  onDeleteLast: () => void
}) {
  const accent = step.type === 'hot' ? 'var(--color-hot)' : 'var(--color-cold)'
  const tint = step.type === 'hot' ? 'var(--color-hot-bg)' : 'var(--color-cold-bg)'
  const canDecrease = step.durationSec > MIN_DURATION_SEC

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={{ width: 5, background: accent, flexShrink: 0 }} />
        <div style={{ flex: 1, padding: '16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: tint,
                color: accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {getStepIcon(step.type)}
            </div>
            <div style={{ flex: 1 }}>
              <div className="type-body" style={{ fontWeight: 600, marginBottom: isFirst ? 2 : 0 }}>
                {index + 1}. {getStepTitle(step.type)}
              </div>
              {isFirst && <div className="type-secondary">Выберите с чего начать</div>}
            </div>
            {isLast && (
              <button
                className="btn btn-sm"
                style={{
                  width: 36,
                  height: 36,
                  padding: 0,
                  background: 'rgba(255, 90, 47, 0.08)',
                  color: 'var(--color-hot)',
                  border: '1px solid rgba(255, 90, 47, 0.18)',
                }}
                onClick={onDeleteLast}
              >
                ×
              </button>
            )}
          </div>

          {isFirst ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <TypeChip label="Горячая" active={step.type === 'hot'} tone="hot" onClick={() => onPatch(step.id, { type: 'hot' })} />
              <TypeChip label="Холодная" active={step.type === 'cold'} tone="cold" onClick={() => onPatch(step.id, { type: 'cold' })} />
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              style={{ width: 44, height: 44, padding: 0 }}
              onClick={() => onPatch(step.id, { durationSec: Math.max(MIN_DURATION_SEC, step.durationSec - 5) })}
              disabled={!canDecrease}
            >
              −
            </button>
            <input
              className="form-input numeric-tabular"
              type="number"
              min={MIN_DURATION_SEC}
              value={step.durationSec}
              onChange={(event) => onPatch(step.id, { durationSec: Math.max(0, parseInt(event.target.value) || 0) })}
              style={{ textAlign: 'center' }}
            />
            <button
              className="btn btn-secondary btn-sm"
              style={{ width: 44, height: 44, padding: 0 }}
              onClick={() => onPatch(step.id, { durationSec: step.durationSec + 5 })}
            >
              +
            </button>
          </div>

          {error && <InlineError text={error} />}
        </div>
      </div>
    </div>
  )
}

function TypeChip({
  label,
  active,
  tone,
  onClick,
}: {
  label: string
  active: boolean
  tone: 'hot' | 'cold'
  onClick: () => void
}) {
  const styles =
    tone === 'hot'
      ? { activeBackground: 'var(--color-hot-bg)', activeColor: 'var(--color-hot)' }
      : { activeBackground: 'var(--color-cold-bg)', activeColor: 'var(--color-cold)' }

  return (
    <button
      className="segmented-chip"
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? styles.activeBackground : 'var(--bg-tertiary)',
        color: active ? styles.activeColor : 'var(--text-secondary)',
        borderColor: active ? 'transparent' : 'var(--border)',
      }}
    >
      {label}
    </button>
  )
}

function InlineError({ text }: { text: string }) {
  return <div className="type-caption text-warm" style={{ marginTop: 6 }}>{text}</div>
}
