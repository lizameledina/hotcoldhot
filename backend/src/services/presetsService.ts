import { prisma } from '../lib/prisma'
import {
  ProtocolStep,
  getProtocolSteps,
  serializeProtocol,
  summarizeProtocol,
} from './protocolService'

interface PresetMutationData {
  name?: string
  steps?: ProtocolStep[]
  hotDurationSec?: number
  coldDurationSec?: number
  breakDurationSec?: number
  cyclesCount?: number
  progressionEnabled?: boolean
  increaseStepSec?: number | null
  increaseEveryNDays?: number | null
  maxColdDurationSec?: number | null
}

interface ProgressionPayload {
  progressionEnabled: boolean
  increaseStepSec: number | null
  increaseEveryNDays: number | null
  maxColdDurationSec: number | null
  lastProgressionAppliedAt: Date | null
}

function resolveProgressionPayload(
  data: PresetMutationData,
  coldDurationSec: number,
  existingPreset?: {
    progressionEnabled: boolean
    increaseStepSec: number | null
    increaseEveryNDays: number | null
    maxColdDurationSec: number | null
    lastProgressionAppliedAt: Date | null
  }
): ProgressionPayload {
  const progressionEnabled = data.progressionEnabled ?? existingPreset?.progressionEnabled ?? false

  if (!progressionEnabled) {
    return {
      progressionEnabled: false,
      increaseStepSec: null,
      increaseEveryNDays: null,
      maxColdDurationSec: null,
      lastProgressionAppliedAt: null,
    }
  }

  const increaseStepSec = data.increaseStepSec ?? existingPreset?.increaseStepSec ?? null
  const increaseEveryNDays = data.increaseEveryNDays ?? existingPreset?.increaseEveryNDays ?? null
  const maxColdDurationSec = data.maxColdDurationSec ?? existingPreset?.maxColdDurationSec ?? null

  if (
    increaseStepSec === null ||
    increaseEveryNDays === null ||
    maxColdDurationSec === null ||
    increaseStepSec <= 0 ||
    increaseEveryNDays <= 0 ||
    maxColdDurationSec <= 0
  ) {
    throw new Error('Invalid progression data')
  }

  if (maxColdDurationSec < coldDurationSec) {
    throw new Error('Progression max must be >= cold duration')
  }

  const shouldResetAnchor =
    !existingPreset ||
    !existingPreset.progressionEnabled ||
    data.progressionEnabled !== undefined ||
    data.steps !== undefined ||
    data.coldDurationSec !== undefined ||
    data.increaseStepSec !== undefined ||
    data.increaseEveryNDays !== undefined ||
    data.maxColdDurationSec !== undefined

  return {
    progressionEnabled: true,
    increaseStepSec,
    increaseEveryNDays,
    maxColdDurationSec,
    lastProgressionAppliedAt: shouldResetAnchor ? null : existingPreset?.lastProgressionAppliedAt ?? null,
  }
}

function withSteps<T extends { protocol?: unknown; hotDurationSec: number; coldDurationSec: number; breakDurationSec: number; cyclesCount: number }>(
  preset: T
) {
  const steps = getProtocolSteps(preset)
  return {
    ...preset,
    steps,
  }
}

export async function getPresets(userId: string) {
  const [system, user] = await Promise.all([
    prisma.preset.findMany({
      where: {
        isSystem: true,
        hiddenBy: {
          none: {
            userId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.preset.findMany({
      where: { userId, isSystem: false },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return {
    system: system.map(withSteps),
    user: user.map(withSteps),
  }
}

export async function createPreset(
  userId: string,
  data: {
    name: string
    steps: ProtocolStep[]
    progressionEnabled?: boolean
    increaseStepSec?: number | null
    increaseEveryNDays?: number | null
    maxColdDurationSec?: number | null
  }
) {
  const summary = summarizeProtocol(data.steps)
  const progression = resolveProgressionPayload(data, summary.coldDurationSec)

  const preset = await prisma.preset.create({
    data: {
      userId,
      isSystem: false,
      name: data.name,
      protocol: JSON.parse(JSON.stringify(serializeProtocol(data.steps))),
      hotDurationSec: summary.hotDurationSec,
      coldDurationSec: summary.coldDurationSec,
      breakDurationSec: summary.breakDurationSec,
      cyclesCount: summary.cyclesCount,
      ...progression,
    },
  })

  return withSteps(preset)
}

export async function updatePreset(userId: string, presetId: string, data: PresetMutationData) {
  const preset = await prisma.preset.findFirst({
    where: { id: presetId, userId, isSystem: false },
  })
  if (!preset) throw new Error('Preset not found')

  const nextSteps = data.steps ?? getProtocolSteps(preset)
  const summary = summarizeProtocol(nextSteps)
  const progression = resolveProgressionPayload(data, summary.coldDurationSec, preset)

  const updated = await prisma.preset.update({
    where: { id: presetId },
    data: {
      name: data.name,
      protocol: JSON.parse(JSON.stringify(serializeProtocol(nextSteps))),
      hotDurationSec: summary.hotDurationSec,
      coldDurationSec: summary.coldDurationSec,
      breakDurationSec: summary.breakDurationSec,
      cyclesCount: summary.cyclesCount,
      ...progression,
    },
  })

  return withSteps(updated)
}

export async function deletePreset(userId: string, presetId: string) {
  const preset = await prisma.preset.findFirst({
    where: {
      id: presetId,
      OR: [
        { userId, isSystem: false },
        { isSystem: true },
      ],
    },
  })
  if (!preset) throw new Error('Preset not found')

  if (preset.isSystem) {
    await prisma.hiddenSystemPreset.upsert({
      where: {
        userId_presetId: {
          userId,
          presetId,
        },
      },
      update: {},
      create: {
        userId,
        presetId,
      },
    })
    return
  }

  await prisma.preset.delete({ where: { id: presetId } })
}
