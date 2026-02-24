/**
 * Insights Text Generation
 * Generates coach-like headline, action, and why text for each day
 *
 * v2: Store-model aware — uses fill_pct, surplus, deficit for messaging.
 *     Falls back to debt-based thresholds when fill_pct is not available.
 */

import { FILL_THRESHOLDS, REPLETION, roundToNearest } from './thresholds'

/**
 * Generate headline text for a day
 * @param {object} params
 * @param {number} params.fillPct - Fill percentage (0-120+), if available
 * @param {number} params.surplus - Glycogen surplus in grams (0 if at/below baseline)
 * @param {number} params.deficit - Glycogen deficit in grams (0 if at/above baseline)
 * @param {number} params.storeDelta - Change in store (end - start)
 * @param {number} params.repletion - Glycogen replenished
 * @param {number} params.depletionTotal - Total depletion
 * @returns {string} Headline text
 */
export function generateHeadline({ fillPct, surplus, deficit, storeDelta, repletion, depletionTotal }) {
  let headline = ''

  // Primary status based on fill percentage
  if (fillPct >= FILL_THRESHOLDS.LOADED_MIN) {
    headline = "Loaded and ready — buffer above baseline."
  } else if (fillPct >= FILL_THRESHOLDS.GREEN_MIN) {
    headline = "Topped up — you're ready."
  } else if (fillPct >= FILL_THRESHOLDS.YELLOW_MIN) {
    headline = "Slightly low — manageable today."
  } else if (fillPct >= FILL_THRESHOLDS.ORANGE_MIN) {
    headline = "Compromised — fuel matters today."
  } else {
    headline = "High risk — you're running on empty."
  }

  // Add context clause if relevant
  if (storeDelta < -120) {
    headline += " Stores dropped after back-to-back load."
  } else if (repletion > depletionTotal && storeDelta > 50) {
    headline += " Nice — you built stores back up."
  }

  return headline
}

/**
 * Generate action text for a day
 * @param {object} params
 * @param {number} params.missedCarbs - Carbs under target
 * @param {number} params.surplus - Glycogen surplus in grams
 * @param {number} params.proteinTarget - Protein target for the day
 * @param {boolean} params.isHardDay - Whether today is a hard day
 * @param {boolean} params.isHardTomorrow - Whether tomorrow is hard
 * @param {boolean} params.isRestDay - Whether today is a rest day
 * @returns {string} Action text
 */
export function generateAction({
  missedCarbs,
  surplus,
  proteinTarget,
  isHardDay,
  isHardTomorrow,
  isRestDay,
  intakeType
}) {
  let action = ''

  // If surplus, different guidance — you can ease off
  if (surplus > 0 && missedCarbs <= 0) {
    action = "Maintain normal intake — your buffer handles the load."
  } else if (missedCarbs <= 0) {
    action = "You're on track — maintain current intake."
  } else if (missedCarbs <= 60) {
    action = `Small top-up: add ~${Math.round(missedCarbs)}g carbs today.`
  } else if (missedCarbs <= 200) {
    const rounded = roundToNearest(missedCarbs, 25)
    action = `Priority: add ~${rounded}g carbs by evening.`
  } else {
    const rounded = roundToNearest(missedCarbs, 50)
    action = `Recovery push: aim for +${rounded}g carbs across the day.`
  }

  // Add protein guidance
  action += ` Protein: ${Math.round(proteinTarget)}g (split across meals).`

  // Add timing hint
  if (isHardDay || isHardTomorrow) {
    action += " Front-load carbs earlier + include a carb snack after training."
  } else if (isRestDay && surplus > 0) {
    action += " Rest day with buffer — steady intake is fine."
  } else if (isRestDay) {
    action += " Steady carbs, focus on recovery."
  }

  if (intakeType === 'estimated') {
    action += " Intake not logged; fueling is estimated."
  } else if (intakeType === 'none') {
    action += " Intake unknown; repletion assumed minimal."
  }

  return action
}

/**
 * Generate why text for a day
 * @param {object} params
 * @param {number} params.debtEnd - Debt at end of day
 * @param {number} params.debtStart - Debt at start of day
 * @param {number} params.debtDelta - Change in debt
 * @param {boolean} params.isHardDay - Whether today is a hard day
 * @param {boolean} params.isBackToBack - Whether this is back-to-back hard days
 * @param {number} params.missedCarbs - Carbs under target
 * @returns {string} Why text
 */
export function generateWhy({
  fillPct,
  surplus,
  deficit,
  storeDelta,
  isHardDay,
  isBackToBack,
  missedCarbs,
  intakeType,
  debtTrend,
  carbTarget,
  carbsLogged
}) {
  let why = ''

  // Surplus — explain the buffer concept
  if (surplus > 0) {
    why = `You have a ${Math.round(surplus)}g buffer above baseline (${fillPct}% fill). `
    why += "This buffer absorbs tomorrow's training cost before you dip into deficit. "
    why += "Great position — maintain steady intake."
  }
  // Hard day with low stores
  else if (isHardDay && fillPct < FILL_THRESHOLDS.YELLOW_MIN) {
    why = "Yesterday's load wasn't fully replaced, so you're carrying a deficit into today. "
    why += "If you keep intensity high without topping up, quality and recovery can stall."
  }
  // Back-to-back hard days
  else if (isBackToBack) {
    why = "This is a heavy block. Your body adapts when you replace the cost — "
    why += "today's fueling is what protects tomorrow's session."
  }
  // Stores improving
  else if (storeDelta > 50) {
    why = "You're replenishing faster than you're spending — that's what 'good recovery' looks like. "
    why += "Keep it steady and you'll be set up for the next hard effort."
  }
  // Moderate deficit with missed carbs
  else if (fillPct < FILL_THRESHOLDS.YELLOW_MIN && missedCarbs > 100) {
    why = "You're running a deficit that's starting to add up. "
    why += "Consistent under-fueling shows up as fatigue, poor sleep, and reduced training quality."
  }
  // Default — stores in good range
  else {
    why = "Your glycogen stores are in a good range. "
    why += "Matching your targets today keeps you ready for whatever comes next."
  }

  // Add low-fill warning
  if (fillPct < FILL_THRESHOLDS.ORANGE_MIN) {
    why += " Very low stores often show up as cravings, restless sleep, and higher perceived effort."
  }

  if (debtTrend === 'increasing') {
    why += " 3-day debt trend is rising."
  } else if (debtTrend === 'decreasing') {
    why += " 3-day debt trend is improving."
  } else {
    why += " 3-day debt trend is stable."
  }

  if (intakeType === 'estimated' && carbTarget > 0) {
    const estimated = Math.round(carbTarget * REPLETION.DEFAULT_INTAKE_RATIO)
    why += ` Intake was not logged, so the model used ${estimated}g (~${Math.round(REPLETION.DEFAULT_INTAKE_RATIO * 100)}% of target) for repletion.`
  } else if (intakeType === 'none') {
    why += " Intake was not logged and no estimate was possible, so repletion was set to 0g."
  } else if (intakeType === 'logged' && carbsLogged === 0) {
    why += " Intake is logged at 0g carbs."
  }

  return why
}

/**
 * Generate all insights for a day
 * @param {object} dayData - Day summary data with all relevant fields
 * @returns {object} { headline, action, why }
 */
export function generateDayInsights(dayData) {
  const {
    glycogen_store_start_g = 0,
    glycogen_store_end_g = 0,
    glycogen_surplus_g = 0,
    glycogen_deficit_g = 0,
    fill_pct = 100,
    depletion_total_g = 0,
    repletion_g = 0,
    carbs_logged_g = 0,
    carb_target_g = 0,
    protein_target_g = 0,
    intake_type = 'none',
    debt_trend = 'stable',
    is_hard_day = false,
    is_hard_tomorrow = false,
    is_rest_day = false,
    is_back_to_back = false
  } = dayData

  const storeDelta = glycogen_store_end_g - glycogen_store_start_g
  const missedCarbs = Math.max(0, carb_target_g - carbs_logged_g)

  const headline = generateHeadline({
    fillPct: fill_pct,
    surplus: glycogen_surplus_g,
    deficit: glycogen_deficit_g,
    storeDelta,
    repletion: repletion_g,
    depletionTotal: depletion_total_g
  })

  const action = generateAction({
    missedCarbs,
    surplus: glycogen_surplus_g,
    proteinTarget: protein_target_g,
    isHardDay: is_hard_day,
    isHardTomorrow: is_hard_tomorrow,
    isRestDay: is_rest_day,
    intakeType: intake_type
  })

  const why = generateWhy({
    fillPct: fill_pct,
    surplus: glycogen_surplus_g,
    deficit: glycogen_deficit_g,
    storeDelta,
    isHardDay: is_hard_day,
    isBackToBack: is_back_to_back,
    missedCarbs,
    intakeType: intake_type,
    debtTrend: debt_trend,
    carbTarget: carb_target_g,
    carbsLogged: carbs_logged_g
  })

  return {
    headline,
    action,
    why
  }
}
