import type { FeelingAfter, SessionStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'

export type StatsPeriod = '7d' | '30d'

export interface StatsTimeseriesDay {
  date: string
  completedSessions: number
  coldSec: number
  totalSec: number
}

export interface StatsBestWeek {
  startDate: string
  endDate: string
  completedSessions: number
  coldSec: number
  metric: 'coldSec'
}

export interface StatsInsight {
  type: 'completed_sessions' | 'cold_time' | 'avg_session'
  direction: 'up' | 'down' | 'flat'
  value: number
  text: string
}

interface StatsSessionRecord {
  status: SessionStatus
  startedAt: Date
  actualHotSec: number
  actualColdSec: number
  actualBreakSec: number
  totalActualSec: number
  feelingAfter: FeelingAfter | null
}

interface PeriodMetrics {
  completedSessions: number
  coldSec: number
  totalSec: number
  avgSessionSec: number
}

const PERIOD_DAYS: Record<StatsPeriod, number> = {
  '7d': 7,
  '30d': 30,
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getWeekStartUtc(date: Date): Date {
  const start = startOfUtcDay(date)
  const day = start.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  return addUtcDays(start, diff)
}

function formatSessionWord(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return 'сессию'
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'сессии'
  return 'сессий'
}

function getNoChangesText(period: StatsPeriod): string {
  return period === '7d'
    ? 'По сравнению с прошлой неделей изменений нет'
    : 'По сравнению с прошлыми 30 днями изменений нет'
}

function buildPeriodBounds(period: StatsPeriod, now = new Date()) {
  const days = PERIOD_DAYS[period]
  const today = startOfUtcDay(now)
  const currentStart = addUtcDays(today, -(days - 1))
  const currentEnd = addUtcDays(today, 1)
  const previousStart = addUtcDays(currentStart, -days)
  const previousEnd = currentStart

  return {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
  }
}

function getCompletedSessions(records: StatsSessionRecord[]): StatsSessionRecord[] {
  return records.filter((record) => record.status === 'COMPLETED')
}

function filterByRange(records: StatsSessionRecord[], start: Date, end: Date): StatsSessionRecord[] {
  return records.filter((record) => record.startedAt >= start && record.startedAt < end)
}

function summarizePeriod(records: StatsSessionRecord[]): PeriodMetrics {
  const completedSessions = records.length
  const coldSec = records.reduce((sum, record) => sum + record.actualColdSec, 0)
  const totalSec = records.reduce((sum, record) => sum + record.totalActualSec, 0)

  return {
    completedSessions,
    coldSec,
    totalSec,
    avgSessionSec: completedSessions > 0 ? Math.round(totalSec / completedSessions) : 0,
  }
}

function getPeriodMetrics(records: StatsSessionRecord[], period: StatsPeriod, now = new Date()): PeriodMetrics {
  const { currentStart, currentEnd } = buildPeriodBounds(period, now)
  return summarizePeriod(filterByRange(getCompletedSessions(records), currentStart, currentEnd))
}

export function parseStatsPeriod(period?: string): StatsPeriod {
  if (!period || period === '7d') return '7d'
  if (period === '30d') return '30d'
  throw new Error('Invalid period')
}

export function buildTimeseries(
  records: StatsSessionRecord[],
  period: StatsPeriod,
  now = new Date()
): StatsTimeseriesDay[] {
  const { currentStart, currentEnd } = buildPeriodBounds(period, now)
  const completed = filterByRange(getCompletedSessions(records), currentStart, currentEnd)
  const byDay = new Map<string, StatsTimeseriesDay>()

  for (let cursor = new Date(currentStart); cursor < currentEnd; cursor = addUtcDays(cursor, 1)) {
    const key = toUtcDateKey(cursor)
    byDay.set(key, {
      date: key,
      completedSessions: 0,
      coldSec: 0,
      totalSec: 0,
    })
  }

  for (const session of completed) {
    const key = toUtcDateKey(session.startedAt)
    const day = byDay.get(key)
    if (!day) continue
    day.completedSessions += 1
    day.coldSec += session.actualColdSec
    day.totalSec += session.totalActualSec
  }

  return Array.from(byDay.values())
}

export function calculateBestWeek(records: StatsSessionRecord[]): StatsBestWeek | null {
  const weekly = new Map<string, StatsBestWeek>()

  for (const session of getCompletedSessions(records)) {
    const start = getWeekStartUtc(session.startedAt)
    const startDate = toUtcDateKey(start)
    const current =
      weekly.get(startDate) ??
      {
        startDate,
        endDate: toUtcDateKey(addUtcDays(start, 6)),
        completedSessions: 0,
        coldSec: 0,
        metric: 'coldSec' as const,
      }

    current.completedSessions += 1
    current.coldSec += session.actualColdSec
    weekly.set(startDate, current)
  }

  const values = Array.from(weekly.values())
  if (values.length === 0) return null

  values.sort((a, b) => {
    if (b.coldSec !== a.coldSec) return b.coldSec - a.coldSec
    if (b.completedSessions !== a.completedSessions) return b.completedSessions - a.completedSessions
    return b.startDate.localeCompare(a.startDate)
  })

  return values[0]
}

export function calculateMostCommonFeeling(
  records: StatsSessionRecord[],
  period: StatsPeriod,
  now = new Date()
): FeelingAfter | null {
  const { currentStart, currentEnd } = buildPeriodBounds(period, now)
  const feelings = filterByRange(getCompletedSessions(records), currentStart, currentEnd)
    .map((record) => record.feelingAfter)
    .filter((value): value is FeelingAfter => value !== null)

  if (feelings.length === 0) return null

  const counter = feelings.reduce<Record<FeelingAfter, number>>(
    (acc, feeling) => {
      acc[feeling] = (acc[feeling] ?? 0) + 1
      return acc
    },
    {
      ENERGIZED: 0,
      NORMAL: 0,
      HARD: 0,
    }
  )

  return (Object.entries(counter) as Array<[FeelingAfter, number]>)
    .sort((a, b) => b[1] - a[1])
    .find(([, count]) => count > 0)?.[0] ?? null
}

export function calculateInsights(
  records: StatsSessionRecord[],
  period: StatsPeriod,
  now = new Date()
): { period: StatsPeriod; hasEnoughData: boolean; insights: StatsInsight[] } {
  const { currentStart, currentEnd, previousStart, previousEnd } = buildPeriodBounds(period, now)
  const completed = getCompletedSessions(records)
  const current = summarizePeriod(filterByRange(completed, currentStart, currentEnd))
  const previous = summarizePeriod(filterByRange(completed, previousStart, previousEnd))
  const totalComparableSessions = current.completedSessions + previous.completedSessions

  if (totalComparableSessions < 2) {
    return { period, hasEnoughData: false, insights: [] }
  }

  const insights: StatsInsight[] = []
  const completedDiff = current.completedSessions - previous.completedSessions

  if (completedDiff > 0) {
    insights.push({
      type: 'completed_sessions',
      direction: 'up',
      value: completedDiff,
      text:
        period === '7d'
          ? `На этой неделе у тебя на ${completedDiff} ${formatSessionWord(completedDiff)} больше`
          : `За последние 30 дней у тебя на ${completedDiff} ${formatSessionWord(completedDiff)} больше`,
    })
  } else if (completedDiff < 0) {
    insights.push({
      type: 'completed_sessions',
      direction: 'down',
      value: Math.abs(completedDiff),
      text: `Активность снизилась на ${Math.abs(completedDiff)} ${formatSessionWord(Math.abs(completedDiff))}`,
    })
  }

  const coldDiff = current.coldSec - previous.coldSec
  if (coldDiff !== 0) {
    if (previous.coldSec > 0) {
      const percent = Math.max(1, Math.round((Math.abs(coldDiff) / previous.coldSec) * 100))
      insights.push({
        type: 'cold_time',
        direction: coldDiff > 0 ? 'up' : 'down',
        value: percent,
        text:
          coldDiff > 0
            ? `Холодной воды стало на ${percent}% больше`
            : `Холодной воды стало на ${percent}% меньше`,
      })
    } else if (current.coldSec > 0) {
      insights.push({
        type: 'cold_time',
        direction: 'up',
        value: current.coldSec,
        text:
          period === '7d'
            ? 'На этой неделе холодной воды стало заметно больше'
            : 'За последние 30 дней холодной воды стало заметно больше',
      })
    }
  }

  const avgDiff = current.avgSessionSec - previous.avgSessionSec
  if (current.avgSessionSec > 0 && previous.avgSessionSec > 0 && avgDiff !== 0) {
    insights.push({
      type: 'avg_session',
      direction: avgDiff > 0 ? 'up' : 'down',
      value: Math.abs(avgDiff),
      text:
        avgDiff > 0
          ? `Средняя сессия выросла на ${Math.abs(avgDiff)} сек`
          : `Средняя сессия стала короче на ${Math.abs(avgDiff)} сек`,
    })
  }

  if (insights.length === 0) {
    return {
      period,
      hasEnoughData: true,
      insights: [
        {
          type: 'completed_sessions',
          direction: 'flat',
          value: 0,
          text: getNoChangesText(period),
        },
      ],
    }
  }

  return {
    period,
    hasEnoughData: true,
    insights: insights.slice(0, 3),
  }
}

async function getUserStatsSessions(userId: string): Promise<StatsSessionRecord[]> {
  return prisma.session.findMany({
    where: { userId },
    select: {
      status: true,
      startedAt: true,
      actualHotSec: true,
      actualColdSec: true,
      actualBreakSec: true,
      totalActualSec: true,
      feelingAfter: true,
    },
    orderBy: { startedAt: 'asc' },
  })
}

export async function getStatsSummary(userId: string, period: StatsPeriod = '7d') {
  const now = new Date()
  const sessions = await getUserStatsSessions(userId)

  const total = sessions.length
  const completedSessions = getCompletedSessions(sessions)
  const completed = completedSessions.length
  const interrupted = total - completed

  const totalHotSec = sessions.reduce((acc, session) => acc + session.actualHotSec, 0)
  const totalColdSec = sessions.reduce((acc, session) => acc + session.actualColdSec, 0)
  const totalBreakSec = sessions.reduce((acc, session) => acc + session.actualBreakSec, 0)
  const totalSec = sessions.reduce((acc, session) => acc + session.totalActualSec, 0)
  const avgDurationSec = total > 0 ? Math.round(totalSec / total) : 0
  const periodMetrics = getPeriodMetrics(sessions, period, now)
  const last7Metrics = getPeriodMetrics(sessions, '7d', now)

  const completedDates = completedSessions.map((session) => session.startedAt)
  const { currentStreak, bestStreak } = calculateStreaks(completedDates)

  const today = todayUTC()
  const todayCompletedCount = completedSessions.filter(
    (session) => session.startedAt.toISOString().slice(0, 10) === today
  ).length
  const todayCompleted = todayCompletedCount > 0

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
    todayCompletedCount,
    period,
    periodCompletedSessions: periodMetrics.completedSessions,
    periodColdSec: periodMetrics.coldSec,
    periodTotalSec: periodMetrics.totalSec,
    avgSessionSec: periodMetrics.avgSessionSec,
    last7ColdSec: last7Metrics.coldSec,
    last7CompletedSessions: last7Metrics.completedSessions,
    bestWeek: calculateBestWeek(sessions),
    mostCommonFeeling: calculateMostCommonFeeling(sessions, period, now),
  }
}

export async function getStatsTimeseries(userId: string, period: StatsPeriod = '7d') {
  const sessions = await getUserStatsSessions(userId)
  return {
    period,
    days: buildTimeseries(sessions, period),
  }
}

export async function getStatsInsights(userId: string, period: StatsPeriod = '7d') {
  const sessions = await getUserStatsSessions(userId)
  return calculateInsights(sessions, period)
}

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export function yesterdayUTC(): string {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10)
}

export function calculateStreaks(dates: Date[]): { currentStreak: number; bestStreak: number } {
  if (dates.length === 0) return { currentStreak: 0, bestStreak: 0 }

  const daySet = new Set(dates.map((date) => date.toISOString().slice(0, 10)))
  const days = Array.from(daySet).sort()

  let bestStreak = 1
  let streak = 1

  for (let index = 1; index < days.length; index++) {
    const diffDays = dayDiff(days[index - 1], days[index])
    if (diffDays === 1) {
      streak += 1
    } else {
      bestStreak = Math.max(bestStreak, streak)
      streak = 1
    }
  }
  bestStreak = Math.max(bestStreak, streak)

  const today = todayUTC()
  const yesterday = yesterdayUTC()
  const lastDay = days[days.length - 1]

  let currentStreak = 0
  if (lastDay === today || lastDay === yesterday) {
    currentStreak = 1
    for (let index = days.length - 2; index >= 0; index--) {
      if (dayDiff(days[index], days[index + 1]) === 1) {
        currentStreak += 1
      } else {
        break
      }
    }
  }

  return { currentStreak, bestStreak }
}

export async function recalcAndStoreStreak(userId: string): Promise<{ currentStreak: number; bestStreak: number }> {
  const sessions = await prisma.session.findMany({
    where: { userId, status: 'COMPLETED' },
    select: { startedAt: true },
    orderBy: { startedAt: 'asc' },
  })

  const { currentStreak, bestStreak } = calculateStreaks(sessions.map((session) => session.startedAt))
  const lastCompletedDate =
    sessions.length > 0 ? sessions[sessions.length - 1].startedAt.toISOString().slice(0, 10) : null

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
