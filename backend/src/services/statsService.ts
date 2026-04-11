import { prisma } from '../lib/prisma'

export async function getStatsSummary(userId: string) {
  const sessions = await prisma.session.findMany({
    where: { userId },
    select: {
      status: true,
      startedAt: true,
      actualHotSec: true,
      actualColdSec: true,
      actualBreakSec: true,
      totalActualSec: true,
    },
    orderBy: { startedAt: 'asc' },
  })

  const total = sessions.length
  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED')
  const completed = completedSessions.length
  const interrupted = total - completed

  const totalHotSec = sessions.reduce((acc, s) => acc + s.actualHotSec, 0)
  const totalColdSec = sessions.reduce((acc, s) => acc + s.actualColdSec, 0)
  const totalBreakSec = sessions.reduce((acc, s) => acc + s.actualBreakSec, 0)
  const totalSec = sessions.reduce((acc, s) => acc + s.totalActualSec, 0)
  const avgDurationSec = total > 0 ? Math.round(totalSec / total) : 0

  // Streak is computed from completed sessions only
  const completedDates = completedSessions.map((s) => s.startedAt)
  const { currentStreak, bestStreak } = calculateStreaks(completedDates)

  // Today's goal: at least 1 completed session today (UTC)
  const today = todayUTC()
  const todayCompleted = completedSessions.some(
    (s) => s.startedAt.toISOString().slice(0, 10) === today
  )

  return {
    total,
    completed,
    interrupted,
    totalHotSec,
    totalColdSec,
    totalBreakSec,
    totalSec,
    avgDurationSec,
    currentStreak,
    bestStreak,
    todayCompleted,
  }
}

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export function yesterdayUTC(): string {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10)
}

export function calculateStreaks(dates: Date[]): { currentStreak: number; bestStreak: number } {
  if (dates.length === 0) return { currentStreak: 0, bestStreak: 0 }

  // Only unique days (UTC), sorted ascending
  const daySet = new Set(dates.map((d) => d.toISOString().slice(0, 10)))
  const days = Array.from(daySet).sort()

  let bestStreak = 1
  let streak = 1

  for (let i = 1; i < days.length; i++) {
    const diffDays = dayDiff(days[i - 1], days[i])
    if (diffDays === 1) {
      streak++
    } else {
      bestStreak = Math.max(bestStreak, streak)
      streak = 1
    }
  }
  bestStreak = Math.max(bestStreak, streak)

  // Current streak: count backwards from the last day only if it's today or yesterday
  const today = todayUTC()
  const yesterday = yesterdayUTC()
  const lastDay = days[days.length - 1]

  let currentStreak = 0
  if (lastDay === today || lastDay === yesterday) {
    currentStreak = 1
    for (let i = days.length - 2; i >= 0; i--) {
      if (dayDiff(days[i], days[i + 1]) === 1) {
        currentStreak++
      } else {
        break
      }
    }
  }

  return { currentStreak, bestStreak }
}

// Update stored streak fields after a completed session
export async function recalcAndStoreStreak(userId: string): Promise<{ currentStreak: number; bestStreak: number }> {
  const sessions = await prisma.session.findMany({
    where: { userId, status: 'COMPLETED' },
    select: { startedAt: true },
    orderBy: { startedAt: 'asc' },
  })

  const { currentStreak, bestStreak } = calculateStreaks(sessions.map((s) => s.startedAt))
  const lastCompletedDate = sessions.length > 0
    ? sessions[sessions.length - 1].startedAt.toISOString().slice(0, 10)
    : null

  await prisma.userSettings.upsert({
    where: { userId },
    update: { currentStreak, bestStreak, lastCompletedDate },
    create: {
      userId,
      currentStreak,
      bestStreak,
      lastCompletedDate,
    },
  })

  return { currentStreak, bestStreak }
}

function dayDiff(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}
