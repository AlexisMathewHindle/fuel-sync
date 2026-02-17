/**
 * Glycogen Ledger Thresholds and Constants
 * All default values for depletion, debt, repletion, and scoring
 */

// ============================================================================
// DEBT THRESHOLDS (grams)
// ============================================================================

export const DEBT_THRESHOLDS = {
  GREEN_MAX: 150,
  YELLOW_MAX: 350,
  ORANGE_MAX: 600,
  RED_MAX: 900,
  DEBT_CAP: 900,
  COMPROMISED_THRESHOLD: 350,
  HIGH_RISK_THRESHOLD: 600
}

/**
 * Get risk flag based on debt level
 * @param {number} debtGrams - Glycogen debt in grams
 * @returns {'green'|'yellow'|'orange'|'red'} Risk level
 */
export function getRiskFlag(debtGrams) {
  if (debtGrams <= DEBT_THRESHOLDS.GREEN_MAX) return 'green'
  if (debtGrams <= DEBT_THRESHOLDS.YELLOW_MAX) return 'yellow'
  if (debtGrams <= DEBT_THRESHOLDS.ORANGE_MAX) return 'orange'
  return 'red'
}

// ============================================================================
// REPLETION CONSTANTS
// ============================================================================

export const REPLETION = {
  EFFICIENCY: 0.70,           // 70% of carbs consumed go to glycogen
  CAP_PER_DAY: 500           // Max 500g glycogen repletion per day
}

/**
 * Calculate glycogen repletion from carb intake
 * @param {number} carbsGrams - Carbs consumed in grams
 * @returns {number} Glycogen replenished in grams
 */
export function calculateRepletion(carbsGrams) {
  if (!carbsGrams || carbsGrams <= 0) return 0
  return Math.min(carbsGrams * REPLETION.EFFICIENCY, REPLETION.CAP_PER_DAY)
}

// ============================================================================
// DEPLETION CONSTANTS
// ============================================================================

export const DEPLETION = {
  TSS_MULTIPLIER: 1.2,        // TSS * 1.2 = glycogen depletion estimate
  CALORIES_MULTIPLIER: 0.20,  // Calories * 0.20 = glycogen depletion estimate
  CALORIES_CLAMP_LOW: 0.7,    // Lower bound: cal_depletion * 0.7
  CALORIES_CLAMP_HIGH: 1.3    // Upper bound: cal_depletion * 1.3
}

// ============================================================================
// INTENSITY THRESHOLDS
// ============================================================================

export const INTENSITY = {
  IF: {
    EASY_MAX: 0.75,
    MODERATE_MAX: 0.88
    // hard is >= 0.88
  },
  HR: {
    EASY_MAX: 0.75,
    MODERATE_MAX: 0.85
    // hard is > 0.85
  }
}

/**
 * Determine intensity bucket from Intensity Factor
 * @param {number} intensityFactor - IF value (0-1+)
 * @returns {'easy'|'moderate'|'hard'} Intensity bucket
 */
export function getIntensityBucketFromIF(intensityFactor) {
  if (intensityFactor < INTENSITY.IF.EASY_MAX) return 'easy'
  if (intensityFactor < INTENSITY.IF.MODERATE_MAX) return 'moderate'
  return 'hard'
}

/**
 * Determine intensity bucket from heart rate ratio
 * @param {number} avgHr - Average heart rate
 * @param {number} hrMax - Maximum heart rate
 * @returns {'easy'|'moderate'|'hard'} Intensity bucket
 */
export function getIntensityBucketFromHR(avgHr, hrMax = 180) {
  const ratio = avgHr / hrMax
  if (ratio < INTENSITY.HR.EASY_MAX) return 'easy'
  if (ratio <= INTENSITY.HR.MODERATE_MAX) return 'moderate'
  return 'hard'
}

// ============================================================================
// HARD DAY DEFINITION
// ============================================================================

export const HARD_DAY = {
  TSS_THRESHOLD: 90,
  IF_THRESHOLD: 0.88,
  DURATION_MIN_THRESHOLD: 45,
  DEPLETION_THRESHOLD: 350
}

/**
 * Determine if a day qualifies as "hard"
 * @param {object} params
 * @param {number} params.totalTSS - Total TSS for the day
 * @param {number} params.depletionTotal - Total depletion in grams
 * @param {Array} params.workouts - Array of workouts with if_score and duration_min
 * @returns {boolean} True if day is hard
 */
export function isHardDay({ totalTSS, depletionTotal, workouts = [] }) {
  // Check total TSS
  if (totalTSS >= HARD_DAY.TSS_THRESHOLD) return true
  
  // Check total depletion
  if (depletionTotal >= HARD_DAY.DEPLETION_THRESHOLD) return true
  
  // Check for any hard workout (IF >= 0.88 AND duration >= 45 min)
  const hasHardWorkout = workouts.some(w => 
    w.if_score >= HARD_DAY.IF_THRESHOLD && 
    w.duration_min >= HARD_DAY.DURATION_MIN_THRESHOLD
  )
  
  return hasHardWorkout
}

// ============================================================================
// CARB TARGET CALCULATION
// ============================================================================

export const CARB_TARGET = {
  BASE_MULTIPLIER: 3.0,       // weight_kg * 3.0
  TRAINING_MULTIPLIER: 0.8,   // depletion * 0.8
  PAYDOWN_MULTIPLIER: 0.25,   // debt * 0.25
  PAYDOWN_CAP: 200,           // Max 200g for paydown
  MIN_MULTIPLIER: 2.0,        // Min: weight_kg * 2
  MAX_MULTIPLIER: 8.0         // Max: weight_kg * 8
}

/**
 * Calculate carb target for a day (ledger-aware)
 * @param {object} params
 * @param {number} params.weightKg - User's weight in kg
 * @param {number} params.depletionTotal - Total depletion for the day
 * @param {number} params.debtStart - Debt at start of day
 * @returns {number} Carb target in grams
 */
export function calculateCarbTarget({ weightKg, depletionTotal, debtStart }) {
  const base = weightKg * CARB_TARGET.BASE_MULTIPLIER
  const trainingAdd = depletionTotal * CARB_TARGET.TRAINING_MULTIPLIER
  const paydownAdd = Math.min(debtStart * CARB_TARGET.PAYDOWN_MULTIPLIER, CARB_TARGET.PAYDOWN_CAP)
  
  const target = base + trainingAdd + paydownAdd
  const min = weightKg * CARB_TARGET.MIN_MULTIPLIER
  const max = weightKg * CARB_TARGET.MAX_MULTIPLIER
  
  return Math.round(Math.max(min, Math.min(max, target)))
}

// ============================================================================
// PROTEIN TARGET CALCULATION
// ============================================================================

export const PROTEIN_TARGET = {
  DEFAULT_MULTIPLIER: 1.8,
  MIN_MULTIPLIER: 1.6,
  MAX_MULTIPLIER: 2.2
}

/**
 * Calculate protein target for a day
 * @param {number} weightKg - User's weight in kg
 * @param {number} proteinGPerKg - User's protein preference (default 1.8)
 * @returns {number} Protein target in grams
 */
export function calculateProteinTarget(weightKg, proteinGPerKg = PROTEIN_TARGET.DEFAULT_MULTIPLIER) {
  const target = weightKg * proteinGPerKg
  const min = weightKg * PROTEIN_TARGET.MIN_MULTIPLIER
  const max = weightKg * PROTEIN_TARGET.MAX_MULTIPLIER

  return Math.round(Math.max(min, Math.min(max, target)))
}

// ============================================================================
// ALIGNMENT SCORE CALCULATION
// ============================================================================

export const ALIGNMENT = {
  CARB_WEIGHT: 0.6,
  PROTEIN_WEIGHT: 0.4
}

/**
 * Calculate alignment score (how well intake matched targets)
 * @param {object} params
 * @param {number} params.carbsLogged - Carbs consumed in grams
 * @param {number} params.carbTarget - Carb target in grams
 * @param {number} params.proteinLogged - Protein consumed in grams
 * @param {number} params.proteinTarget - Protein target in grams
 * @returns {number} Alignment score 0-100
 */
export function calculateAlignmentScore({ carbsLogged, carbTarget, proteinLogged, proteinTarget }) {
  if (!carbTarget || !proteinTarget) return 0

  const carbScore = Math.min(100, (carbsLogged / carbTarget) * 100)
  const proteinScore = Math.min(100, (proteinLogged / proteinTarget) * 100)

  return Math.round(ALIGNMENT.CARB_WEIGHT * carbScore + ALIGNMENT.PROTEIN_WEIGHT * proteinScore)
}

// ============================================================================
// READINESS SCORE CALCULATION
// ============================================================================

/**
 * Calculate readiness score from glycogen debt (piecewise linear)
 * @param {number} debtGrams - Glycogen debt in grams
 * @returns {number} Readiness score 0-100
 */
export function calculateReadinessScore(debtGrams) {
  // Clamp debt to valid range
  const debt = Math.max(0, Math.min(debtGrams, 900))

  // Piecewise linear mapping
  if (debt <= 150) {
    // 0-150g → 95-100
    return Math.round(95 + (100 - 95) * (1 - debt / 150))
  } else if (debt <= 350) {
    // 150-350g → 80-95
    return Math.round(80 + (95 - 80) * (1 - (debt - 150) / (350 - 150)))
  } else if (debt <= 600) {
    // 350-600g → 60-80
    return Math.round(60 + (80 - 60) * (1 - (debt - 350) / (600 - 350)))
  } else if (debt <= 900) {
    // 600-900g → 35-60
    return Math.round(35 + (60 - 35) * (1 - (debt - 600) / (900 - 600)))
  } else {
    // 900+ → 25-35
    return Math.round(25 + (35 - 25) * (1 - Math.min(1, (debt - 900) / 100)))
  }
}

// ============================================================================
// WHAT-IF SCENARIO
// ============================================================================

export const WHAT_IF = {
  EXTRA_CARBS: 200,
  GLYCOGEN_CREDIT_MULTIPLIER: 0.70  // Same as repletion efficiency
}

/**
 * Calculate what-if readiness if extra carbs are consumed
 * @param {number} currentDebt - Current debt at end of day
 * @param {number} extraCarbs - Extra carbs to simulate (default 200g)
 * @returns {object} { debtAfter, readinessAfter }
 */
export function calculateWhatIfReadiness(currentDebt, extraCarbs = WHAT_IF.EXTRA_CARBS) {
  const glycogenCredit = extraCarbs * WHAT_IF.GLYCOGEN_CREDIT_MULTIPLIER
  const debtAfter = Math.max(0, currentDebt - glycogenCredit)
  const readinessAfter = calculateReadinessScore(debtAfter)

  return {
    debtAfter,
    readinessAfter
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Round to nearest multiple
 * @param {number} value - Value to round
 * @param {number} multiple - Multiple to round to
 * @returns {number} Rounded value
 */
export function roundToNearest(value, multiple) {
  return Math.round(value / multiple) * multiple
}

