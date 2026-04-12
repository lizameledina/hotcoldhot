import { prisma } from '../lib/prisma'

export interface HomeInsight {
  id: string
  type:
    | 'progress'
    | 'completion'
    | 'time_of_day'
    | 'pattern'
    | 'recent'
  text: string
  context: 'general' | 'morning' | 'evening' | 'after_last_session'
}

interface InsightSession {
  status: 'COMPLETED' | 'INTERRUPTED'
  startedAt: Date
  completedCycles: number
  plannedCycles: number
  actualColdSec: number
  totalActualSec: number
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function createInsight(
  id: string,
  type: HomeInsight['type'],
  text: string,
  context: HomeInsight['context'] = 'general'
): HomeInsight {
  return { id, type, text, context }
}

export async function getHomeInsights(userId: string): Promise<HomeInsight[]> {
  const sessions = await prisma.session.findMany({
    where: { userId },
    select: {
      status: true,
      startedAt: true,
      completedCycles: true,
      plannedCycles: true,
      actualColdSec: true,
      totalActualSec: true,
    },
    orderBy: { startedAt: 'desc' },
    take: 24,
  }) as InsightSession[]

  const completed = sessions.filter((session) => session.status === 'COMPLETED')
  if (completed.length < 2) return []

  const items: HomeInsight[] = []
  const recentCompleted = completed.slice(0, 3)
  const previousCompleted = completed.slice(3, 6)
  const latest = completed[0]

  if (latest && latest.completedCycles >= latest.plannedCycles && latest.plannedCycles > 0) {
    items.push(createInsight('recent_full', 'recent', 'Последний протокол завершён без сокращений', 'after_last_session'))
  }

  if (recentCompleted.length >= 2 && previousCompleted.length >= 2) {
    const recentCold = average(recentCompleted.map((session) => session.actualColdSec))
    const previousCold = average(previousCompleted.map((session) => session.actualColdSec))
    if (recentCold > previousCold + 5) {
      items.push(createInsight('cold_up', 'progress', 'Холодные отрезки стали длиннее, чем раньше'))
    }
  }

  const recentCompletionRate = average(
    sessions.slice(0, 5).map((session) =>
      session.plannedCycles > 0 ? session.completedCycles / session.plannedCycles : 0
    )
  )
  if (recentCompletionRate >= 0.95) {
    items.push(createInsight('completion_strong', 'completion', 'Ты стабильно проходишь протоколы до конца'))
  } else if (recentCompletionRate > 0 && recentCompletionRate <= 0.7) {
    items.push(createInsight('completion_drop', 'completion', 'Последние циклы чаще сокращаются ближе к финалу'))
  }

  const morning = completed.filter((session) => {
    const hour = session.startedAt.getUTCHours()
    return hour >= 5 && hour < 12
  })
  const evening = completed.filter((session) => {
    const hour = session.startedAt.getUTCHours()
    return hour >= 18 && hour < 24
  })

  if (morning.length >= 2 && evening.length >= 2) {
    const morningTotal = average(morning.map((session) => session.totalActualSec))
    const eveningTotal = average(evening.map((session) => session.totalActualSec))
    if (morningTotal > eveningTotal + 20) {
      items.push(createInsight('morning_longer', 'time_of_day', 'Утром сессии у тебя длиннее', 'morning'))
    } else if (eveningTotal > morningTotal + 20) {
      items.push(createInsight('evening_longer', 'time_of_day', 'Вечером ты держишься дольше', 'evening'))
    }
  }

  const avgTotal = average(completed.slice(0, 6).map((session) => session.totalActualSec))
  const avgCold = average(completed.slice(0, 6).map((session) => session.actualColdSec))
  if (avgTotal > 0) {
    if (avgTotal <= 240 && avgCold >= 20) {
      items.push(createInsight('short_intense', 'pattern', 'Ты предпочитаешь короткие интенсивные протоколы'))
    } else if (avgTotal >= 360) {
      items.push(createInsight('long_sessions', 'pattern', 'Тебе ближе длинные сессии с плавным ритмом'))
    }
  }

  return items.slice(0, 2)
}
