import { prisma } from '../lib/prisma'
import { SessionStatus } from '@prisma/client'
import { recalcAndStoreStreak } from './statsService'

interface PresetSnapshot {
  name: string
  hotDurationSec: number
  coldDurationSec: number
  breakDurationSec: number
  cyclesCount: number
  [key: string]: unknown
}

export async function startSession(userId: string, presetId: string) {
  let preset = await prisma.preset.findFirst({
    where: {
      id: presetId,
      OR: [{ userId }, { isSystem: true }],
    },
  })

  if (!preset) throw new Error('Preset not found')

  const snapshot: PresetSnapshot = {
    name: preset.name,
    hotDurationSec: preset.hotDurationSec,
    coldDurationSec: preset.coldDurationSec,
    breakDurationSec: preset.breakDurationSec,
    cyclesCount: preset.cyclesCount,
  }

  const session = await prisma.session.create({
    data: {
      userId,
      presetId: preset.id,
      presetSnapshot: JSON.parse(JSON.stringify(snapshot)),
      startedAt: new Date(),
      plannedCycles: preset.cyclesCount,
      status: 'COMPLETED',
    },
  })

  return session
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
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId },
  })
  if (!session) throw new Error('Session not found')

  const totalActualSec = data.actualHotSec + data.actualColdSec + data.actualBreakSec

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: data.status as SessionStatus,
      endedAt: new Date(),
      completedCycles: data.completedCycles,
      actualHotSec: data.actualHotSec,
      actualColdSec: data.actualColdSec,
      actualBreakSec: data.actualBreakSec,
      totalActualSec,
    },
  })

  // Recalculate and store streak on completed session
  if (data.status === 'COMPLETED') {
    await recalcAndStoreStreak(userId).catch(() => {}) // non-blocking
  }

  return updated
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
