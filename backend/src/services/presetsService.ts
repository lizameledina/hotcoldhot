import { prisma } from '../lib/prisma'

export async function getPresets(userId: string) {
  const [system, user] = await Promise.all([
    prisma.preset.findMany({
      where: { isSystem: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.preset.findMany({
      where: { userId, isSystem: false },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  return { system, user }
}

export async function createPreset(
  userId: string,
  data: {
    name: string
    hotDurationSec: number
    coldDurationSec: number
    breakDurationSec: number
    cyclesCount: number
  }
) {
  return prisma.preset.create({
    data: { ...data, userId, isSystem: false },
  })
}

export async function updatePreset(
  userId: string,
  presetId: string,
  data: {
    name?: string
    hotDurationSec?: number
    coldDurationSec?: number
    breakDurationSec?: number
    cyclesCount?: number
  }
) {
  const preset = await prisma.preset.findFirst({
    where: { id: presetId, userId, isSystem: false },
  })
  if (!preset) throw new Error('Preset not found')

  return prisma.preset.update({
    where: { id: presetId },
    data,
  })
}

export async function deletePreset(userId: string, presetId: string) {
  const preset = await prisma.preset.findFirst({
    where: { id: presetId, userId, isSystem: false },
  })
  if (!preset) throw new Error('Preset not found')

  return prisma.preset.delete({ where: { id: presetId } })
}
