/**
 * Fueling Engine v1
 * Simple, testable logic for calculating nutrition targets based on training load
 */

/**
 * Calculate glycogen depletion estimate (0-100 scale)
 * Based on duration and TSS
 * @param {number} totalDurationMin - Total training duration in minutes
 * @param {number} totalTss - Total Training Stress Score
 * @returns {number} - Glycogen debt estimate (0-100)
 */
export function calculateGlycogenDebt(totalDurationMin, totalTss) {
  // If we have TSS, use it as primary indicator
  if (totalTss && totalTss > 0) {
    // TSS of 100 = moderate depletion (50)
    // TSS of 200 = high depletion (80)
    // TSS of 300+ = very high depletion (100)
    const tssDebt = Math.min(100, (totalTss / 300) * 100)
    return Math.round(tssDebt)
  }
  
  // Fallback to duration-based estimate
  // 60 min = low depletion (25)
  // 120 min = moderate depletion (50)
  // 180+ min = high depletion (75+)
  const durationDebt = Math.min(100, (totalDurationMin / 180) * 75)
  return Math.round(durationDebt)
}

/**
 * Calculate protein target in grams
 * @param {number} weightKg - Body weight in kg
 * @param {number} proteinGPerKg - Protein grams per kg body weight (default: 1.8)
 * @returns {number} - Protein target in grams
 */
export function calculateProteinTarget(weightKg, proteinGPerKg = 1.8) {
  if (!weightKg || weightKg <= 0) {
    return 0
  }
  
  return Math.round(weightKg * proteinGPerKg)
}

/**
 * Calculate carbohydrate target in grams
 * @param {number} weightKg - Body weight in kg
 * @param {number} totalDurationMin - Total training duration in minutes
 * @param {number} totalTss - Total Training Stress Score
 * @param {number} carbFactor - Carb multiplier (default: 1.0)
 * @returns {number} - Carb target in grams
 */
export function calculateCarbTarget(weightKg, totalDurationMin, totalTss, carbFactor = 1.0) {
  if (!weightKg || weightKg <= 0) {
    return 0
  }
  
  // Base carbs: 3g/kg body weight
  let carbTarget = weightKg * 3
  
  // Add training load
  if (totalTss && totalTss > 0) {
    // TSS-based: add 0.03g per TSS point
    // Example: TSS 100 = +30g, TSS 200 = +60g
    carbTarget += totalTss * 0.03
  } else if (totalDurationMin && totalDurationMin > 0) {
    // Duration-based fallback: add 0.8g per minute
    // Example: 60 min = +48g, 120 min = +96g
    carbTarget += totalDurationMin * 0.8
  }
  
  // Apply user's carb factor (allows customization)
  carbTarget *= carbFactor
  
  // Clamp to sensible bounds
  // Min: 100g (even on rest days, need some carbs)
  // Max: 800g (extreme training day upper limit)
  carbTarget = Math.max(100, Math.min(800, carbTarget))
  
  return Math.round(carbTarget)
}

/**
 * Calculate all nutrition targets for a day
 * @param {object} daySummary - Day summary object with training data
 * @param {object} userSettings - User settings (weight, protein factor, carb factor)
 * @returns {object} - Nutrition targets
 */
export function calculateNutritionTargets(daySummary, userSettings) {
  const {
    total_duration_min = 0,
    total_tss = 0
  } = daySummary
  
  const {
    weight_kg = 70, // Default 70kg if not set
    protein_g_per_kg = 1.8,
    carb_factor = 1.0
  } = userSettings || {}
  
  const glycogenDebt = calculateGlycogenDebt(total_duration_min, total_tss)
  const proteinTarget = calculateProteinTarget(weight_kg, protein_g_per_kg)
  const carbTarget = calculateCarbTarget(weight_kg, total_duration_min, total_tss, carb_factor)
  
  return {
    glycogen_debt_est: glycogenDebt,
    protein_target_g: proteinTarget,
    carb_target_g: carbTarget
  }
}

/**
 * Get a human-readable description of training load
 * @param {number} glycogenDebt - Glycogen debt estimate (0-100)
 * @returns {string} - Description
 */
export function getTrainingLoadDescription(glycogenDebt) {
  if (glycogenDebt === 0) return 'Rest day'
  if (glycogenDebt < 25) return 'Light training'
  if (glycogenDebt < 50) return 'Moderate training'
  if (glycogenDebt < 75) return 'Hard training'
  return 'Very hard training'
}

