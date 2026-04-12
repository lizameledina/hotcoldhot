import { strict as assert } from 'node:assert'
import { calculatePresetProgression } from '../services/progressionService'
import { buildLegacySteps, summarizeProtocol, updateLastColdStep } from '../services/protocolService'
import { buildTimeseries, calculateInsights, calculateStreaks, todayUTC, yesterdayUTC } from '../services/statsService'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed += 1
  } catch (err) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${err instanceof Error ? err.message : err}`)
    failed += 1
  }
}

function relativeDate(offsetDays: number): Date {
  return new Date(Date.now() - offsetDays * 86400000)
}

function isoDate(value: string): Date {
  return new Date(`${value}T08:00:00.000Z`)
}

console.log('\nStreak calculation:')

test('empty dates -> 0/0', () => {
  const result = calculateStreaks([])
  assert.equal(result.currentStreak, 0)
  assert.equal(result.bestStreak, 0)
})

test('single session today -> currentStreak=1, bestStreak=1', () => {
  const result = calculateStreaks([relativeDate(0)])
  assert.equal(result.currentStreak, 1)
  assert.equal(result.bestStreak, 1)
})

test('single session yesterday -> currentStreak=1, bestStreak=1', () => {
  const result = calculateStreaks([relativeDate(1)])
  assert.equal(result.currentStreak, 1)
  assert.equal(result.bestStreak, 1)
})

test('session 2 days ago -> currentStreak=0', () => {
  const result = calculateStreaks([relativeDate(2)])
  assert.equal(result.currentStreak, 0)
  assert.equal(result.bestStreak, 1)
})

test('3 consecutive days ending today -> currentStreak=3', () => {
  const result = calculateStreaks([relativeDate(2), relativeDate(1), relativeDate(0)])
  assert.equal(result.currentStreak, 3)
  assert.equal(result.bestStreak, 3)
})

test('3 consecutive days ending yesterday -> currentStreak=3', () => {
  const result = calculateStreaks([relativeDate(3), relativeDate(2), relativeDate(1)])
  assert.equal(result.currentStreak, 3)
  assert.equal(result.bestStreak, 3)
})

test('gap in the middle keeps best streak', () => {
  const result = calculateStreaks([relativeDate(4), relativeDate(3), relativeDate(1), relativeDate(0)])
  assert.equal(result.currentStreak, 2)
  assert.equal(result.bestStreak, 2)
})

test('multiple sessions same day count as one', () => {
  const today = new Date()
  const result = calculateStreaks([today, today, today])
  assert.equal(result.currentStreak, 1)
  assert.equal(result.bestStreak, 1)
})

console.log('\nDate helpers:')

test('todayUTC returns YYYY-MM-DD', () => {
  assert.match(todayUTC(), /^\d{4}-\d{2}-\d{2}$/)
})

test('yesterdayUTC is 1 day before todayUTC', () => {
  const today = new Date(todayUTC())
  const yesterday = new Date(yesterdayUTC())
  assert.equal(today.getTime() - yesterday.getTime(), 86400000)
})

console.log('\nTimeseries aggregation:')

test('buildTimeseries fills empty days and aggregates completed sessions only', () => {
  const now = isoDate('2026-04-11')
  const days = buildTimeseries(
    [
      {
        status: 'COMPLETED',
        startedAt: isoDate('2026-04-11'),
        actualHotSec: 90,
        actualColdSec: 30,
        actualBreakSec: 10,
        totalActualSec: 130,
        feelingAfter: null,
      },
      {
        status: 'COMPLETED',
        startedAt: isoDate('2026-04-09'),
        actualHotSec: 120,
        actualColdSec: 45,
        actualBreakSec: 0,
        totalActualSec: 165,
        feelingAfter: null,
      },
      {
        status: 'INTERRUPTED',
        startedAt: isoDate('2026-04-09'),
        actualHotSec: 30,
        actualColdSec: 5,
        actualBreakSec: 0,
        totalActualSec: 35,
        feelingAfter: null,
      },
    ],
    '7d',
    now
  )

  assert.equal(days.length, 7)
  assert.deepEqual(days[0], { date: '2026-04-05', completedSessions: 0, coldSec: 0, totalSec: 0 })
  assert.deepEqual(days[4], { date: '2026-04-09', completedSessions: 1, coldSec: 45, totalSec: 165 })
  assert.deepEqual(days[6], { date: '2026-04-11', completedSessions: 1, coldSec: 30, totalSec: 130 })
})

console.log('\nInsights calculation:')

test('calculateInsights compares current and previous periods', () => {
  const now = isoDate('2026-04-11')
  const result = calculateInsights(
    [
      {
        status: 'COMPLETED',
        startedAt: isoDate('2026-04-10'),
        actualHotSec: 90,
        actualColdSec: 30,
        actualBreakSec: 0,
        totalActualSec: 120,
        feelingAfter: 'ENERGIZED',
      },
      {
        status: 'COMPLETED',
        startedAt: isoDate('2026-04-08'),
        actualHotSec: 90,
        actualColdSec: 45,
        actualBreakSec: 0,
        totalActualSec: 135,
        feelingAfter: 'NORMAL',
      },
      {
        status: 'COMPLETED',
        startedAt: isoDate('2026-04-03'),
        actualHotSec: 90,
        actualColdSec: 15,
        actualBreakSec: 0,
        totalActualSec: 105,
        feelingAfter: 'NORMAL',
      },
      {
        status: 'COMPLETED',
        startedAt: isoDate('2026-04-02'),
        actualHotSec: 90,
        actualColdSec: 15,
        actualBreakSec: 0,
        totalActualSec: 105,
        feelingAfter: 'HARD',
      },
    ],
    '7d',
    now
  )

  assert.equal(result.hasEnoughData, true)
  assert.ok(result.insights.length >= 1)
  assert.ok(result.insights.some((item) => item.type === 'cold_time'))
  assert.ok(
    result.insights.some((item) => /На этой неделе|Холодной воды стало/.test(item.text))
  )
})

test('calculateInsights returns not enough data for too few sessions', () => {
  const result = calculateInsights(
    [
      {
        status: 'COMPLETED',
        startedAt: isoDate('2026-04-11'),
        actualHotSec: 90,
        actualColdSec: 30,
        actualBreakSec: 0,
        totalActualSec: 120,
        feelingAfter: 'ENERGIZED',
      },
    ],
    '7d',
    isoDate('2026-04-11')
  )

  assert.equal(result.hasEnoughData, false)
  assert.equal(result.insights.length, 0)
})

console.log('\nProgression logic:')

test('progression increases cold duration after enough days', () => {
  const result = calculatePresetProgression(
    {
      coldDurationSec: 30,
      progressionEnabled: true,
      increaseStepSec: 5,
      increaseEveryNDays: 3,
      maxColdDurationSec: 45,
      lastProgressionAppliedAt: new Date('2026-04-07T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    },
    new Date('2026-04-11T12:00:00.000Z')
  )

  assert.equal(result.applied, true)
  assert.equal(result.nextColdDurationSec, 35)
})

test('progression does not run twice too early', () => {
  const result = calculatePresetProgression(
    {
      coldDurationSec: 30,
      progressionEnabled: true,
      increaseStepSec: 5,
      increaseEveryNDays: 7,
      maxColdDurationSec: 45,
      lastProgressionAppliedAt: new Date('2026-04-10T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    },
    new Date('2026-04-11T12:00:00.000Z')
  )

  assert.equal(result.applied, false)
  assert.equal(result.nextColdDurationSec, 30)
})

test('progression respects maximum cold duration', () => {
  const result = calculatePresetProgression(
    {
      coldDurationSec: 42,
      progressionEnabled: true,
      increaseStepSec: 10,
      increaseEveryNDays: 2,
      maxColdDurationSec: 45,
      lastProgressionAppliedAt: new Date('2026-04-08T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    },
    new Date('2026-04-11T12:00:00.000Z')
  )

  assert.equal(result.applied, true)
  assert.equal(result.nextColdDurationSec, 45)
})

console.log('\nProtocol sequence helpers:')

test('buildLegacySteps expands repeated legacy cycles into ordered steps', () => {
  const result = buildLegacySteps({
    hotDurationSec: 40,
    coldDurationSec: 15,
    breakDurationSec: 5,
    cyclesCount: 3,
  })

  assert.equal(result.length, 6)
  assert.equal(result[0].type, 'hot')
  assert.equal(result[0].durationSec, 40)
  assert.equal(result[5].type, 'cold')
  assert.equal(result[5].durationSec, 15)
})

test('summarizeProtocol returns total and last cold step duration', () => {
  const result = summarizeProtocol([
    { id: '1', type: 'hot', durationSec: 40 },
    { id: '2', type: 'cold', durationSec: 10 },
    { id: '3', type: 'hot', durationSec: 20 },
    { id: '4', type: 'cold', durationSec: 25 },
  ])

  assert.equal(result.cyclesCount, 2)
  assert.equal(result.totalDurationSec, 95)
  assert.equal(result.coldDurationSec, 25)
})

test('updateLastColdStep updates only final cold step', () => {
  const result = updateLastColdStep(
    [
      { id: '1', type: 'hot', durationSec: 40 },
      { id: '2', type: 'cold', durationSec: 10 },
      { id: '3', type: 'hot', durationSec: 20 },
      { id: '4', type: 'cold', durationSec: 25 },
    ],
    30
  )

  assert.equal(result[1].durationSec, 10)
  assert.equal(result[3].durationSec, 30)
})

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
