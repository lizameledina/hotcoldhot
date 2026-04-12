import { FeelingAfter, SessionStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { calculatePresetProgression } from './progressionService'
import { getProtocolSteps, summarizeProtocol, updateLastColdStep } from './protocolService'
import { recalcAndStoreStreak } from './statsService'

interface PresetSnapshot {
  name: string
  steps: ReturnType<typeof getProtocolSteps>
  hotDurationSec: number
  coldDurationSec: number
  breakDurationSec: number
  cyclesCount: number
  [key: string]: unknown
}

export async function startSession(userId: string, presetId: string) {
  const preset = await prisma.preset.findFirst({
    where: {
      id: presetId,
      OR: [{ userId }, { isSystem: true }],
      hiddenBy: {
        none: {
          userId,
        },
      },
    },
  })

  if (!preset) throw new Error('Preset not found')

  const steps = getProtocolSteps(preset)
  const summary = summarizeProtocol(steps)
  const snapshot: PresetSnapshot = {
    name: preset.name,
    steps,
    hotDurationSec: summary.hotDurationSec,
    coldDurationSec: summary.coldDurationSec,
    breakDurationSec: summary.breakDurationSec,
    cyclesCount: summary.cyclesCount,
  }

  return prisma.session.create({
    data: {
      userId,
      presetId: preset.id,
      presetSnapshot: JSON.parse(JSON.stringify(snapshot)),
      startedAt: new Date(),
      plannedCycles: steps.length,
      status: 'COMPLETED',
    },
  })
}

export async function finishSession(
  userId: string,
  sessionId: string,
  data: {
    status: 'COMPLETED' | 'INTERRUPTED'
    completedCycles: number
    actualHotSec: number
    actualColdSec: number
    actualBreakSec: number
  }
) {
  const existingSession = await prisma.session.findFirst({
    where: { id: sessionId, userId },
    include: { preset: true },
  })
  if (!existingSession) throw new Error('Session not found')

  const totalActualSec = data.actualHotSec + data.actualColdSec + data.actualBreakSec
  const finishedAt = new Date()

  const result = await prisma.$transaction(async (tx) => {
    const updatedSession = await tx.session.update({
      where: { id: sessionId },
      data: {
        status: data.status as SessionStatus,
        endedAt: finishedAt,
        completedCycles: data.completedCycles,
        actualHotSec: data.actualHotSec,
        actualColdSec: data.actualColdSec,
        actualBreakSec: data.actualBreakSec,
        totalActualSec,
      },
    })

    let progression:
      | {
          applied: true
          newColdDurationSec: number
        }
      | null = null

    if (data.status === 'COMPLETED' && existingSession.preset && !existingSession.preset.isSystem) {
      const steps = getProtocolSteps(existingSession.preset)
      const currentColdDurationSec =
        [...steps].reverse().find((step) => step.type === 'cold')?.durationSec ?? existingSession.preset.coldDurationSec

      const progressionResult = calculatePresetProgression(
        {
          coldDurationSec: currentColdDurationSec,
          progressionEnabled: existingSession.preset.progressionEnabled,
          increaseStepSec: existingSession.preset.increaseStepSec,
          increaseEveryNDays: existingSession.preset.increaseEveryNDays,
          maxColdDurationSec: existingSession.preset.maxColdDurationSec,
          lastProgressionAppliedAt: existingSession.preset.lastProgressionAppliedAt,
          updatedAt: existingSession.preset.updatedAt,
        },
        finishedAt
      )

      if (progressionResult.applied) {
        const updatedSteps = updateLastColdStep(steps, progressionResult.nextColdDurationSec)
        const summary = summarizeProtocol(updatedSteps)

        await tx.preset.update({
          where: { id: existingSession.preset.id },
          data: {
            protocol: JSON.parse(JSON.stringify({ version: 2, steps: updatedSteps })),
            coldDurationSec: progressionResult.nextColdDurationSec,
            hotDurationSec: summary.hotDurationSec,
            breakDurationSec: summary.breakDurationSec,
            cyclesCount: summary.cyclesCount,
            lastProgressionAppliedAt: progressionResult.appliedAt,
          },
        })
        progression = {
          applied: true,
          newColdDurationSec: progressionResult.nextColdDurationSec,
        }
      }
    }

    return { session: updatedSession, progression }
  })

  if (data.status === 'COMPLETED') {
    await recalcAndStoreStreak(userId).catch(() => {})
  }

  return result
}

export async function saveSessionFeeling(
  userId: string,
  sessionId: string,
  feelingAfter: FeelingAfter | null
) {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId },
  })
  if (!session) throw new Error('Session not found')
  if (session.status !== 'COMPLETED') throw new Error('Feeling available only for completed sessions')

  return prisma.session.update({
    where: { id: sessionId },
    data: { feelingAfter },
  })
}

export async function getSessions(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.session.count({ where: { userId } }),
  ])
  return { sessions, total, page, limit }
}

export async function getSession(userId: string, sessionId: string) {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId },
  })
  if (!session) throw new Error('Session not found')
  return session
}
