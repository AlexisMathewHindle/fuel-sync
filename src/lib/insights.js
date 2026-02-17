/**
 * Insights Text Generation
 * Generates coach-like headline, action, and why text for each day
 */

import { DEBT_THRESHOLDS, roundToNearest } from './thresholds'

/**
 * Generate headline text for a day
 * @param {object} params
 * @param {number} params.debtEnd - Debt at end of day
 * @param {number} params.debtDelta - Change in debt (end - start)
 * @param {number} params.repletion - Glycogen replenished
 * @param {number} params.depletionTotal - Total depletion
 * @returns {string} Headline text
 */
export function generateHeadline({ debtEnd, debtDelta, repletion, depletionTotal }) {
  let headline = ''
  
  // Primary status based on debt level
  if (debtEnd <= DEBT_THRESHOLDS.GREEN_MAX) {
    headline = "Topped up — you're ready."
  } else if (debtEnd <= DEBT_THRESHOLDS.YELLOW_MAX) {
    headline = "Slightly low — manageable today."
  } else if (debtEnd <= DEBT_THRESHOLDS.ORANGE_MAX) {
    headline = "Compromised — fuel matters today."
  } else {
    headline = "High risk — you're running on empty."
  }
  
  // Add context clause if relevant
  if (debtDelta > 120) {
    headline += " Debt climbed after back-to-back load."
  } else if (repletion > depletionTotal && debtDelta < -50) {
    headline += " Nice — you paid down debt."
  }
  
  return headline
}

/**
 * Generate action text for a day
 * @param {object} params
 * @param {number} params.missedCarbs - Carbs under target
 * @param {number} params.proteinTarget - Protein target for the day
 * @param {boolean} params.isHardDay - Whether today is a hard day
 * @param {boolean} params.isHardTomorrow - Whether tomorrow is hard
 * @param {boolean} params.isRestDay - Whether today is a rest day
 * @returns {string} Action text
 */
export function generateAction({ 
  missedCarbs, 
  proteinTarget, 
  isHardDay, 
  isHardTomorrow, 
  isRestDay 
}) {
  let action = ''
  
  // Carb guidance based on how much was missed
  if (missedCarbs <= 0) {
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
  } else if (isRestDay) {
    action += " Steady carbs, focus on paydown."
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
  debtEnd, 
  debtStart, 
  debtDelta, 
  isHardDay, 
  isBackToBack, 
  missedCarbs 
}) {
  let why = ''
  
  // High debt scenarios
  if (isHardDay && debtEnd > DEBT_THRESHOLDS.COMPROMISED_THRESHOLD) {
    why = "Yesterday's load wasn't fully replaced, so you're carrying debt into today. "
    why += "If you keep intensity high without topping up, quality and recovery can stall."
  }
  // Back-to-back hard days
  else if (isBackToBack) {
    why = "This is a heavy block. Your body adapts when you replace the cost — "
    why += "today's fueling is what protects tomorrow's session."
  }
  // Debt improving
  else if (debtDelta < -50) {
    why = "You're replenishing faster than you're spending — that's what 'good recovery' looks like. "
    why += "Keep it steady and you'll be set up for the next hard effort."
  }
  // Moderate debt with missed carbs
  else if (debtEnd > DEBT_THRESHOLDS.YELLOW_MAX && missedCarbs > 100) {
    why = "You're running a deficit that's starting to add up. "
    why += "Consistent under-fueling shows up as fatigue, poor sleep, and reduced training quality."
  }
  // Default for lower debt
  else {
    why = "Your glycogen stores are in a good range. "
    why += "Matching your targets today keeps you ready for whatever comes next."
  }
  
  // Add high debt warning
  if (debtEnd > DEBT_THRESHOLDS.HIGH_RISK_THRESHOLD) {
    why += " High debt days often show up as cravings, restless sleep, and higher perceived effort."
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
    debt_start_g = 0,
    debt_end_g = 0,
    depletion_total_g = 0,
    repletion_g = 0,
    carbs_logged_g = 0,
    carb_target_g = 0,
    protein_target_g = 0,
    is_hard_day = false,
    is_hard_tomorrow = false,
    is_rest_day = false,
    is_back_to_back = false
  } = dayData
  
  const debtDelta = debt_end_g - debt_start_g
  const missedCarbs = Math.max(0, carb_target_g - carbs_logged_g)
  
  const headline = generateHeadline({
    debtEnd: debt_end_g,
    debtDelta,
    repletion: repletion_g,
    depletionTotal: depletion_total_g
  })
  
  const action = generateAction({
    missedCarbs,
    proteinTarget: protein_target_g,
    isHardDay: is_hard_day,
    isHardTomorrow: is_hard_tomorrow,
    isRestDay: is_rest_day
  })
  
  const why = generateWhy({
    debtEnd: debt_end_g,
    debtStart: debt_start_g,
    debtDelta,
    isHardDay: is_hard_day,
    isBackToBack: is_back_to_back,
    missedCarbs
  })
  
  return {
    headline,
    action,
    why
  }
}

