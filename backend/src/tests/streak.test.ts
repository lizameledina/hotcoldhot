/**
 * Tests for streak calculation logic.
 * Run with: npx tsx src/tests/streak.test.ts
 */
import { strict as assert } from 'node:assert'
import { calculateStreaks, todayUTC, yesterdayUTC } from '../services/statsService'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${err instanceof Error ? err.message : err}`)
    failed++
  }
}

function d(offsetDays: number): Date {
  return new Date(Date.now() - offsetDays * 86400000)
}

// --- calculateStreaks ---

console.log('\nStreak calculation:')

test('empty dates → 0/0', () => {
  const r = calculateStreaks([])
  assert.equal(r.currentStreak, 0)
  assert.equal(r.bestStreak, 0)
})

test('single session today → currentStreak=1, bestStreak=1', () => {
  const r = calculateStreaks([d(0)])
  assert.equal(r.currentStreak, 1)
  assert.equal(r.bestStreak, 1)
})

test('single session yesterday → currentStreak=1, bestStreak=1', () => {
  const r = calculateStreaks([d(1)])
  assert.equal(r.currentStreak, 1)
  assert.equal(r.bestStreak, 1)
})

test('session 2 days ago (gap) → currentStreak=0', () => {
  const r = calculateStreaks([d(2)])
  assert.equal(r.currentStreak, 0)
  assert.equal(r.bestStreak, 1)
})

test('3 consecutive days ending today → currentStreak=3', () => {
  const r = calculateStreaks([d(2), d(1), d(0)])
  assert.equal(r.currentStreak, 3)
  assert.equal(r.bestStreak, 3)
})

test('3 consecutive days ending yesterday → currentStreak=3', () => {
  const r = calculateStreaks([d(3), d(2), d(1)])
  assert.equal(r.currentStreak, 3)
  assert.equal(r.bestStreak, 3)
})

test('gap in the middle: [4,3,1,0] → currentStreak=2, bestStreak=2', () => {
  const r = calculateStreaks([d(4), d(3), d(1), d(0)])
  assert.equal(r.currentStreak, 2)
  assert.equal(r.bestStreak, 2)
})

test('longer past streak: [10,9,8,1,0] → currentStreak=2, bestStreak=3', () => {
  const r = calculateStreaks([d(10), d(9), d(8), d(1), d(0)])
  assert.equal(r.currentStreak, 2)
  assert.equal(r.bestStreak, 3)
})

test('multiple sessions same day count as one', () => {
  // Same day (today) three times
  const today = new Date()
  const r = calculateStreaks([today, today, today])
  assert.equal(r.currentStreak, 1)
  assert.equal(r.bestStreak, 1)
})

test('5-day streak → bestStreak=5', () => {
  const r = calculateStreaks([d(4), d(3), d(2), d(1), d(0)])
  assert.equal(r.currentStreak, 5)
  assert.equal(r.bestStreak, 5)
})

test('streak broken 3 days ago, new 2-day streak: [5,4,3, 1,0]', () => {
  const r = calculateStreaks([d(5), d(4), d(3), d(1), d(0)])
  assert.equal(r.currentStreak, 2)
  assert.equal(r.bestStreak, 3)
})

// --- Date helpers ---

console.log('\nDate helpers:')

test('todayUTC returns YYYY-MM-DD', () => {
  const today = todayUTC()
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/)
})

test('yesterdayUTC is 1 day before todayUTC', () => {
  const today = new Date(todayUTC())
  const yesterday = new Date(yesterdayUTC())
  const diffMs = today.getTime() - yesterday.getTime()
  assert.equal(diffMs, 86400000)
})

// --- Summary ---
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
