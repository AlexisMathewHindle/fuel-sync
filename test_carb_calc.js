/**
 * Deterministic test harness for carb target calculation.
 * Imports constants + functions from the SINGLE source of truth (src/lib/thresholds.js).
 *
 * Run:  node test_carb_calc.js
 */

import { CARB_TARGET, calculateCarbTarget } from './src/lib/thresholds.js'

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.error(`  ❌ ${label}`)
    failed++
  }
}

function assertEq(actual, expected, label) {
  assert(actual === expected, `${label}  (got ${actual}, expected ${expected})`)
}

// ── Verify constants match spec ──────────────────────────────────────────────

console.log('\n🔑 Constants (from src/lib/thresholds.js):')
assertEq(CARB_TARGET.BASE_MULTIPLIER, 3.0, 'BASE_MULTIPLIER = 3.0')
assertEq(CARB_TARGET.TRAINING_MULTIPLIER, 0.8, 'TRAINING_MULTIPLIER = 0.8')
assertEq(CARB_TARGET.PAYDOWN_MULTIPLIER, 0.25, 'PAYDOWN_MULTIPLIER = 0.25')
assertEq(CARB_TARGET.PAYDOWN_CAP, 200, 'PAYDOWN_CAP = 200')
assertEq(CARB_TARGET.MIN_MULTIPLIER, 2.0, 'MIN_MULTIPLIER = 2.0')
assertEq(CARB_TARGET.MAX_MULTIPLIER, 8.0, 'MAX_MULTIPLIER = 8.0')

// ── Deterministic scenarios ──────────────────────────────────────────────────

console.log('\n📐 Scenario 1 — Feb 15 replay (85 kg, 68 g depletion, no debt):')
{
  const r = calculateCarbTarget({ weightKg: 85, depletionTotal: 68, debtStart: 0 })
  // base = 255, training = 54.4, paydown = 0 → raw 309.4
  // min = 170, max = 680 → clamp → 309
  assertEq(r, 309, 'carb target = 309 g')
}

console.log('\n📐 Scenario 2 — Heavy day that hits the MAX clamp (85 kg):')
{
  // depletion 600 g, debt 900 g
  const r = calculateCarbTarget({ weightKg: 85, depletionTotal: 600, debtStart: 900 })
  // base = 255, training = 480, paydown = min(225, 200) = 200 → raw 935
  // max = 85 * 8 = 680 → clamped to 680
  assertEq(r, 680, 'carb target clamped to 680 g (85 × 8)')
}

console.log('\n📐 Scenario 3 — Rest day (60 kg, no training, no debt):')
{
  const r = calculateCarbTarget({ weightKg: 60, depletionTotal: 0, debtStart: 0 })
  // base = 180, training = 0, paydown = 0 → raw 180
  // min = 120, max = 480 → 180
  assertEq(r, 180, 'rest-day target = 180 g')
}

console.log('\n📐 Scenario 4 — Light athlete rest day (50 kg):')
{
  const r = calculateCarbTarget({ weightKg: 50, depletionTotal: 0, debtStart: 0 })
  // base = 150, training = 0, paydown = 0 → raw 150
  // min = 100, max = 400 → 150
  assertEq(r, 150, 'light rest-day target = 150 g')
}

console.log('\n📐 Scenario 5 — Paydown cap (debt 1000 → paydown limited to 200):')
{
  const r = calculateCarbTarget({ weightKg: 70, depletionTotal: 100, debtStart: 1000 })
  // base = 210, training = 80, paydown = min(250, 200) = 200 → raw 490
  // min = 140, max = 560 → 490
  assertEq(r, 490, 'paydown capped at 200 g → target = 490 g')
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`)
console.log(`Results:  ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
} else {
  console.log('All tests passed ✅\n')
}