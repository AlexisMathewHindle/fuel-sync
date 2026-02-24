/**
 * Pure ledger model helpers.
 * These functions are shared between recompute logic and test harnesses.
 */

import { calculateRepletion, clamp, DEBT_THRESHOLDS, REPLETION } from './thresholds.js'

/**
 * Resolve intake source and repletion inputs for a day.
 * @param {object} params
 * @param {object|null} params.intake - Intake row for the day (if any)
 * @param {number} params.carbTarget - Computed carb target for the day
 * @returns {{
 *   hasIntake: boolean,
 *   intakeType: 'logged'|'estimated'|'none',
 *   intakeConfidence: 'high'|'low',
 *   carbsLogged: number,
 *   proteinLogged: number,
 *   estimatedIntakeG: number|null,
 *   repletion: number
 * }}
 */
export function resolveDailyIntakeModel({ intake, carbTarget }) {
  const hasIntake = !!intake

  if (hasIntake) {
    const carbsLogged = Math.max(0, Number(intake.carbs_g) || 0)
    const proteinLogged = Math.max(0, Number(intake.protein_g) || 0)
    return {
      hasIntake: true,
      intakeType: 'logged',
      intakeConfidence: 'high',
      carbsLogged,
      proteinLogged,
      estimatedIntakeG: null,
      repletion: calculateRepletion(carbsLogged)
    }
  }

  if (Number.isFinite(carbTarget) && carbTarget > 0) {
    const estimatedIntakeG = Math.round(carbTarget * REPLETION.DEFAULT_INTAKE_RATIO)
    return {
      hasIntake: false,
      intakeType: 'estimated',
      intakeConfidence: 'low',
      carbsLogged: estimatedIntakeG,
      proteinLogged: 0,
      estimatedIntakeG,
      repletion: calculateRepletion(estimatedIntakeG)
    }
  }

  return {
    hasIntake: false,
    intakeType: 'none',
    intakeConfidence: 'low',
    carbsLogged: 0,
    proteinLogged: 0,
    estimatedIntakeG: null,
    repletion: 0
  }
}

/**
 * Calculate debt from store and apply soft buffer bounds.
 * @param {number} capacity - Baseline glycogen capacity
 * @param {number} store - Current store level
 * @returns {number} Bounded debt in grams
 */
export function calculateBoundedDebt(capacity, store) {
  return clamp(capacity - store, DEBT_THRESHOLDS.DEBT_MIN, DEBT_THRESHOLDS.DEBT_MAX)
}
