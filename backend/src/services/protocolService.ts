export interface ProtocolStep {
  id: string
  type: 'hot' | 'cold'
  durationSec: number
}

interface LegacyPresetShape {
  id?: string
  hotDurationSec: number
  coldDurationSec: number
  breakDurationSec: number
  cyclesCount: number
  protocol?: unknown
}

interface ParsedProtocol {
  version: 2
  steps: ProtocolStep[]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseStep(raw: unknown, index: number): ProtocolStep | null {
  if (!isObject(raw)) return null
  const type = raw.type === 'cold' ? 'cold' : raw.type === 'hot' ? 'hot' : null
  const durationSec = Number(raw.durationSec)
  const id = typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : `step_${index + 1}`

  if (!type || !Number.isFinite(durationSec) || durationSec <= 0) return null

  return {
    id,
    type,
    durationSec: Math.round(durationSec),
  }
}

export function normalizeProtocolSteps(steps: ProtocolStep[]): ProtocolStep[] {
  return steps.map((step, index) => ({
    id: step.id || `step_${index + 1}`,
    type: step.type === 'cold' ? 'cold' : 'hot',
    durationSec: Math.round(step.durationSec),
  }))
}

export function buildLegacySteps(preset: Omit<LegacyPresetShape, 'protocol'>): ProtocolStep[] {
  const steps: ProtocolStep[] = []

  for (let index = 0; index < Math.max(preset.cyclesCount, 1); index++) {
    steps.push({
      id: `${preset.id ?? 'legacy'}_hot_${index + 1}`,
      type: 'hot',
      durationSec: preset.hotDurationSec,
    })
    steps.push({
      id: `${preset.id ?? 'legacy'}_cold_${index + 1}`,
      type: 'cold',
      durationSec: preset.coldDurationSec,
    })
  }

  return steps
}

export function getProtocolSteps(preset: LegacyPresetShape): ProtocolStep[] {
  if (isObject(preset.protocol)) {
    if (Array.isArray(preset.protocol.steps)) {
      const parsed = preset.protocol.steps
        .map((raw, index) => parseStep(raw, index))
        .filter((step): step is ProtocolStep => step !== null)
      if (parsed.length > 0) return normalizeProtocolSteps(parsed)
    }

    if (Array.isArray(preset.protocol.cycles)) {
      const legacySteps: ProtocolStep[] = []
      preset.protocol.cycles.forEach((raw, index) => {
        if (!isObject(raw)) return
        const warmSec = Number(raw.warmSec)
        const coldSec = Number(raw.coldSec)
        if (Number.isFinite(warmSec) && warmSec > 0) {
          legacySteps.push({ id: `cycle_hot_${index + 1}`, type: 'hot', durationSec: Math.round(warmSec) })
        }
        if (Number.isFinite(coldSec) && coldSec > 0) {
          legacySteps.push({ id: `cycle_cold_${index + 1}`, type: 'cold', durationSec: Math.round(coldSec) })
        }
      })
      if (legacySteps.length > 0) return normalizeProtocolSteps(legacySteps)
    }
  }

  return buildLegacySteps(preset)
}

export function serializeProtocol(steps: ProtocolStep[]): ParsedProtocol {
  return {
    version: 2,
    steps: normalizeProtocolSteps(steps),
  }
}

export function summarizeProtocol(steps: ProtocolStep[]) {
  const normalized = normalizeProtocolSteps(steps)
  const firstHot = normalized.find((step) => step.type === 'hot')
  const lastCold = [...normalized].reverse().find((step) => step.type === 'cold')

  return {
    hotDurationSec: firstHot?.durationSec ?? 0,
    coldDurationSec: lastCold?.durationSec ?? 0,
    breakDurationSec: 0,
    cyclesCount: Math.max(1, Math.ceil(normalized.length / 2)),
    totalDurationSec: normalized.reduce((sum, step) => sum + step.durationSec, 0),
    stepsCount: normalized.length,
  }
}

export function updateLastColdStep(steps: ProtocolStep[], nextColdSec: number): ProtocolStep[] {
  const normalized = normalizeProtocolSteps(steps)
  let updated = false

  return normalized.map((step, index) => {
    const isLastCold =
      step.type === 'cold' &&
      normalized.slice(index + 1).every((candidate) => candidate.type !== 'cold')

    if (isLastCold && !updated) {
      updated = true
      return { ...step, durationSec: nextColdSec }
    }
    return step
  })
}
