/**
 * Baseline Detection Module
 * Evaluates the first 3 days of imported data to detect ongoing training blocks.
 * 
 * Triggers when:
 *  - Sum of TSS across first 3 days >= 250, OR
 *  - Max single-day depletion >= 450g
 * 
 * Fallback: if TSS is missing, uses depletion_total_g from day_summaries.
 */

/**
 * Detect whether imported data suggests an ongoing training block
 * @param {Array} daySummaries - Array of day summary objects, sorted chronologically (oldest first)
 * @returns {{ shouldPrompt: boolean, reason: string|null, tss3: number, maxDepletion: number }}
 */
export function detectOngoingTrainingBlock(daySummaries) {
  // Need at least 3 days to evaluate
  if (!daySummaries || daySummaries.length < 3) {
    return {
      shouldPrompt: false,
      reason: null,
      tss3: 0,
      maxDepletion: 0
    }
  }

  // Take only the first 3 chronological days
  const firstThree = daySummaries.slice(0, 3)

  // Sum TSS across first 3 days
  const tss3 = firstThree.reduce((sum, day) => sum + (day.total_tss || 0), 0)

  // Max single-day depletion across first 3 days
  const maxDepletion = Math.max(...firstThree.map(day => day.depletion_total_g || 0))

  const TSS_THRESHOLD = 250
  const DEPLETION_THRESHOLD = 450

  let shouldPrompt = false
  let reason = null

  if (tss3 >= TSS_THRESHOLD) {
    shouldPrompt = true
    reason = `High training load detected: ${Math.round(tss3)} TSS in first 3 days`
  } else if (maxDepletion >= DEPLETION_THRESHOLD) {
    shouldPrompt = true
    reason = `Heavy session detected: ${Math.round(maxDepletion)}g glycogen depletion in a single day`
  }

  return {
    shouldPrompt,
    reason,
    tss3: Math.round(tss3),
    maxDepletion: Math.round(maxDepletion)
  }
}

/**
 * Check whether the baseline prompt should be shown to the user
 * @param {object} settings - User settings object from database
 * @param {Array} daySummaries - Day summaries sorted chronologically (oldest first)
 * @returns {{ show: boolean, reason: string|null }}
 */
export function shouldShowBaselinePrompt(settings, daySummaries) {
  // Don't show if user already has a non-zero baseline
  if (settings?.starting_debt_g && settings.starting_debt_g > 0) {
    return { show: false, reason: null }
  }

  // Don't show if user previously dismissed the prompt
  if (settings?.baseline_prompt_dismissed) {
    return { show: false, reason: null }
  }

  // Run detection
  const detection = detectOngoingTrainingBlock(daySummaries)

  return {
    show: detection.shouldPrompt,
    reason: detection.reason
  }
}

