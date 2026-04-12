import { prisma } from '../lib/prisma'

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

interface SettingsUpdate {
  soundEnabled?: boolean
  vibrationEnabled?: boolean
  theme?: 'SYSTEM' | 'LIGHT' | 'DARK'
  reminderEnabled?: boolean
  reminderTime?: string | null
  dailyGoalSessions?: number
}

export async function updateSettings(userId: string, data: SettingsUpdate) {
  if (data.reminderEnabled === true && !data.reminderTime) {
    // Check if reminderTime is already stored
    const existing = await prisma.userSettings.findUnique({ where: { userId } })
    if (!existing?.reminderTime) {
      throw new Error('reminderTime required when reminderEnabled is true')
    }
  }

  if (data.reminderTime !== undefined && data.reminderTime !== null) {
    if (!TIME_REGEX.test(data.reminderTime)) {
      throw new Error('reminderTime must be in HH:mm format')
    }
  }

  if (data.dailyGoalSessions !== undefined) {
    if (!Number.isInteger(data.dailyGoalSessions) || data.dailyGoalSessions < 1 || data.dailyGoalSessions > 10) {
      throw new Error('dailyGoalSessions must be an integer between 1 and 10')
    }
  }

  return prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      soundEnabled: data.soundEnabled ?? true,
      vibrationEnabled: data.vibrationEnabled ?? true,
      theme: data.theme ?? 'SYSTEM',
      reminderEnabled: data.reminderEnabled ?? false,
      reminderTime: data.reminderTime ?? null,
      dailyGoalSessions: data.dailyGoalSessions ?? 1,
    },
  })
}

export async function getSettings(userId: string) {
  return prisma.userSettings.findUnique({ where: { userId } })
}
