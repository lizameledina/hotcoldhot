import type { Preset } from '@prisma/client'

export interface ProgressionResult {
  applied: boolean
  nextColdDurationSec: number
  appliedAt: Date | null
}

function diffInWholeDays(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  return Math.floor((toUtc - fromUtc) / 86400000)
}

export function calculatePresetProgression(
  preset: Pick<
    Preset,
    | 'coldDurationSec'
    | 'progressionEnabled'
    | 'increaseStepSec'
    | 'increaseEveryNDays'
    | 'maxColdDurationSec'
    | 'lastProgressionAppliedAt'
    | 'updatedAt'
  >,
  now = new Date()
): ProgressionResult {
  if (
    !preset.progressionEnabled ||
    !preset.increaseStepSec ||
    !preset.increaseEveryNDays ||
    !preset.maxColdDurationSec
  ) {
    return {
      applied: false,
      nextColdDurationSec: preset.coldDurationSec,
      appliedAt: null,
    }
  }

  if (preset.coldDurationSec >= preset.maxColdDurationSec) {
    return {
      applied: false,
      nextColdDurationSec: preset.coldDurationSec,
      appliedAt: null,
    }
  }

  const anchor = preset.lastProgressionAppliedAt ?? preset.updatedAt
  if (diffInWholeDays(anchor, now) < preset.increaseEveryNDays) {
    return {
      applied: false,
      nextColdDurationSec: preset.coldDurationSec,
      appliedAt: null,
    }
  }

  return {
    applied: true,
    nextColdDurationSec: Math.min(
      preset.coldDurationSec + preset.increaseStepSec,
      preset.maxColdDurationSec
    ),
    appliedAt: now,
  }
}
