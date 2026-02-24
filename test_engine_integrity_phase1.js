/**
 * Engine Credibility & Modeling Integrity (Phase 1) checks.
 *
 * Run:
 *   node test_engine_integrity_phase1.js
 */

import {
  calculateStoreCarbTarget,
  calculateDebtTrend,
  calculateGlycogenCapacity,
  calculateSupercompCap,
  clamp,
  deriveStoreMetrics
} from './src/lib/thresholds.js'
import { resolveDailyIntakeModel, calculateBoundedDebt } from './src/lib/ledgerModel.js'

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS ${label}`)
    passed++
  } else {
    console.error(`  FAIL ${label}`)
    failed++
  }
}

function simulateDay({ storeStart, capacity, weightKg, depletionTotal, intake = null }) {
  const startMetrics = deriveStoreMetrics(storeStart, capacity)
  const carbTarget = calculateStoreCarbTarget({
    weightKg,
    depletionTotal,
    deficit: startMetrics.deficit,
    surplus: startMetrics.surplus
  })
  const intakeModel = resolveDailyIntakeModel({ intake, carbTarget })
  const storeEnd = clamp(storeStart - depletionTotal + intakeModel.repletion, 0, calculateSupercompCap(capacity))
  const debtStart = calculateBoundedDebt(capacity, storeStart)
  const debtEnd = calculateBoundedDebt(capacity, storeEnd)

  return {
    carbTarget,
    intakeModel,
    storeEnd,
    debtStart,
    debtEnd
  }
}

console.log('\nEngine Integrity Phase 1 Checks\n')

const weightKg = 70
const capacity = calculateGlycogenCapacity(weightKg)

console.log('1) Intake fallback + no freeze')
{
  const day = simulateDay({
    storeStart: capacity,
    capacity,
    weightKg,
    depletionTotal: 300,
    intake: null
  })

  assert(day.intakeModel.intakeType === 'estimated', 'missing intake becomes estimated')
  assert(day.intakeModel.estimatedIntakeG === Math.round(day.carbTarget * 0.6), 'estimated intake uses 60% of target')
  assert(day.debtEnd > day.debtStart, 'hard day without logged intake still increases debt')
}

console.log('\n2) Consecutive days stack logically')
{
  const day1 = simulateDay({
    storeStart: capacity,
    capacity,
    weightKg,
    depletionTotal: 280,
    intake: null
  })
  const day2 = simulateDay({
    storeStart: day1.storeEnd,
    capacity,
    weightKg,
    depletionTotal: 360,
    intake: null
  })

  assert(day2.debtStart === day1.debtEnd, 'day 2 starts from day 1 end debt')
  assert(day2.debtEnd > day1.debtEnd, 'second hard day compounds debt')
}

console.log('\n3) No training days do not force debt increases')
{
  const prior = simulateDay({
    storeStart: capacity,
    capacity,
    weightKg,
    depletionTotal: 320,
    intake: null
  })
  const rest = simulateDay({
    storeStart: prior.storeEnd,
    capacity,
    weightKg,
    depletionTotal: 0,
    intake: null
  })

  assert(rest.debtEnd <= rest.debtStart, 'rest day does not increase debt when depletion is zero')
}

console.log('\n4) Soft surplus buffer bounds')
{
  assert(calculateBoundedDebt(490, 560) === -70, 'debt can go slightly negative for topped-up state')
  assert(calculateBoundedDebt(1000, 1200) === -150, 'negative debt is clamped to DEBT_MIN (-150)')
  assert(calculateBoundedDebt(490, -1000) === 900, 'upper debt bound is clamped to DEBT_MAX (900)')
}

console.log('\n5) Debt trend classification (3-day slope)')
{
  assert(calculateDebtTrend([120, 150, 190]) === 'increasing', 'trend increasing is detected')
  assert(calculateDebtTrend([220, 180, 130]) === 'decreasing', 'trend decreasing is detected')
  assert(calculateDebtTrend([150, 155, 160]) === 'stable', 'small slope is stable')
}

console.log('\n6) Intake type none fallback')
{
  const intakeModel = resolveDailyIntakeModel({ intake: null, carbTarget: 0 })
  assert(intakeModel.intakeType === 'none', 'intake type none is used when no estimate is possible')
  assert(intakeModel.repletion === 0, 'none state uses zero repletion')
}

console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
