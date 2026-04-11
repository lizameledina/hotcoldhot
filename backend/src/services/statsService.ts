import { prisma } from '../lib/prisma'

export async function getStatsSummary(userId: string) {
  const sessions = await prisma.session.findMany({
    where: { userId },
    select: {
      status: true,
      startedAt: true,
      completedCycles: true,
      actualHotSec: true,
      actualColdSec: true,
      actualBreakSec: true,
      totalActualSec: true,
    },
    orderBy: { startedAt: 'asc' },
  })

  const total = sessions.length
  const completed = sessions.filter((s) => s.status === 'COMPLETED').length
  const interrupted = total - completed

  const totalHotSec = sessions.reduce((acc, s) => acc + s.actualHotSec, 0)
  const totalColdSec = sessions.reduce((acc, s) => acc + s.actualColdSec, 0)
  const totalBreakSec = sessions.reduce((acc, s) => acc + s.actualBreakSec, 0)
  const totalSec = sessions.reduce((acc, s) => acc + s.totalActualSec, 0)
  const avgDurationSec = total > 0 ? Math.round(totalSec / total) : 0

  // Streak calculation
  const { currentStreak, bestStreak } = calculateStreaks(sessions.map((s) => s.startedAt))

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
  }
}

function calculateStreaks(dates: Date[]): { currentStreak: number; bestStreak: number } {
  if (dates.length === 0) return { currentStreak: 0, bestStreak: 0 }

  // Get unique days (YYYY-MM-DD strings in UTC)
  const daySet = new Set(dates.map((d) => d.toISOString().slice(0, 10)))
  const days = Array.from(daySet).sort()

  let currentStreak = 0
  let bestStreak = 0
  let streak = 1

  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1])
    const curr = new Date(days[i])
    const diffMs = curr.getTime() - prev.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      streak++
    } else {
      bestStreak = Math.max(bestStreak, streak)
      streak = 1
    }
  }
  bestStreak = Math.max(bestStreak, streak)

  // Check if streak is current (last day is today or yesterday)
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const lastDay = days[days.length - 1]

  if (lastDay === today || lastDay === yesterday) {
    // Count backwards from last day
    currentStreak = 1
    for (let i = days.length - 2; i >= 0; i--) {
      const curr = new Date(days[i + 1])
      const prev = new Date(days[i])
      const diffMs = curr.getTime() - prev.getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        currentStreak++
      } else {
        break
      }
    }
  } else {
    currentStreak = 0
  }

  return { currentStreak, bestStreak }
}
