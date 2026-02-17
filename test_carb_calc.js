// Test the carb target calculation
const CARB_TARGET = {
  BASE_MULTIPLIER: 3.0,
  TRAINING_MULTIPLIER: 0.8,
  PAYDOWN_MULTIPLIER: 0.25,
  PAYDOWN_CAP: 200,
  MIN_MULTIPLIER: 2.0,
  MAX_MULTIPLIER: 12.0
}

function calculateCarbTarget({ weightKg, depletionTotal, debtStart }) {
  const base = weightKg * CARB_TARGET.BASE_MULTIPLIER
  const trainingAdd = depletionTotal * CARB_TARGET.TRAINING_MULTIPLIER
  const paydownAdd = Math.min(debtStart * CARB_TARGET.PAYDOWN_MULTIPLIER, CARB_TARGET.PAYDOWN_CAP)
  
  const target = base + trainingAdd + paydownAdd
  const min = weightKg * CARB_TARGET.MIN_MULTIPLIER
  const max = weightKg * CARB_TARGET.MAX_MULTIPLIER
  
  return Math.round(Math.max(min, Math.min(max, target)))
}

// Test with Feb 15 data: TSS 205, 1489 cal, 68g depletion (from screenshot)
// Assuming 85kg weight
const result = calculateCarbTarget({
  weightKg: 85,
  depletionTotal: 68,
  debtStart: 0  // Assuming no debt
})

console.log('Test calculation for Feb 15:')
console.log('Weight: 85kg')
console.log('console.log('console.log('console. Start: 0g')
console.log('---')
console.log('Base: 85 × 3.0 =', 85 * 3.0, 'console.log('Base: 85 × 3 6console.log('Base:0.console.log('Base: 85Paydown: 0 × 0.25 =', 0, 'g')
console.log('---')
console.log('TOTAL:', result, 'g')
console.log('--console.log('--console.log('--console.log('--consoleal in UI: 652g (WRONG!)')
