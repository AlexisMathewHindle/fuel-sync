/**
 * Glycogen Ledger Recompute Service
 * Deterministic day-by-day calculation of glycogen store, targets, and insights
 *
 * v2: Full glycogen store simulation — tracks actual store level, supports
 *     surplus (buffer above baseline) and deficit (below baseline).
 */

import { supabase } from './supabase'
import { getWorkouts, getDayIntakes, getUserSettings } from './database'
import { processWorkout, calculateDayDepletion } from './depletion'
import {
  calculateStoreCarbTarget,
  calculateProteinTarget,
  calculateAlignmentScore,
  calculateReadinessFromFill,
  getRiskFlagFromFill,
  calculateDebtTrend,
  isHardDay,
  clamp,
  GLYCOGEN_STORE,
  calculateGlycogenCapacity,
  calculateSupercompCap,
  deriveStoreMetrics
} from './thresholds'
import { generateDayInsights } from './insights'
import { resolveDailyIntakeModel, calculateBoundedDebt } from './ledgerModel'

/**
 * Group workouts by date
 * @param {Array} workouts - Array of workout objects
 * @returns {object} Map of date -> workouts array
 */
function groupWorkoutsByDate(workouts) {
  const grouped = {}
  
  workouts.forEach(workout => {
    const date = workout.start_date.split('T')[0]
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(workout)
  })
  
  return grouped
}

/**
 * Generate array of dates in range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Array of date strings
 */
function generateDateRange(startDate, endDate) {
  const dates = []
  const current = new Date(startDate)
  const end = new Date(endDate)
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  
  return dates
}

/**
 * Check if day is back-to-back hard days
 * @param {Array} daysSummaries - Array of processed day summaries
 * @param {number} currentIndex - Index of current day
 * @returns {boolean} True if back-to-back hard days
 */
function isBackToBackHard(daysSummaries, currentIndex) {
  if (currentIndex === 0) return false
  
  const current = daysSummaries[currentIndex]
  const yesterday = daysSummaries[currentIndex - 1]
  
  return current.is_hard_day && yesterday.is_hard_day
}

/**
 * Recompute glycogen ledger for a user
 * @param {string} userId - User ID
 * @param {object} options - Options
 * @param {number} options.days - Number of days to recompute (default 60)
 * @param {function} options.onProgress - Progress callback
 * @returns {object} { success, daysProcessed, error }
 */
export async function recomputeLedger(userId, options = {}) {
  const { days = 60, onProgress } = options
  
  try {
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    
    if (onProgress) onProgress(0, 100, 'Fetching data...')
    
    // Fetch user settings
    const { data: settings } = await getUserSettings(userId)
    const parsedWeight = Number(settings?.weight_kg)
    const parsedProtein = Number(settings?.protein_g_per_kg)
    const parsedHrMax = Number(settings?.hr_max)

    // Guard against invalid settings values to prevent impossible targets.
    const weightKg = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 70
    const proteinGPerKg = Number.isFinite(parsedProtein) && parsedProtein > 0 ? parsedProtein : 1.8
    const hrMax = Number.isFinite(parsedHrMax) && parsedHrMax > 0 ? parsedHrMax : 180
    
    // Fetch workouts
    const { data: workouts, error: workoutsError } = await getWorkouts(userId, {
      startDate: startDateStr,
      endDate: endDateStr
    })
    
    if (workoutsError) throw new Error('Failed to fetch workouts: ' + workoutsError.message)
    
    // Fetch intakes
    const { data: intakes, error: intakesError } = await getDayIntakes(userId, {
      startDate: startDateStr,
      endDate: endDateStr
    })
    
    if (intakesError) {
      console.warn('Failed to fetch intakes:', intakesError.message)
    }
    
    if (onProgress) onProgress(20, 100, 'Processing workouts...')
    
    // Process workouts to calculate depletion and intensity
    const processedWorkouts = (workouts || []).map(w => processWorkout(w, hrMax))
    
    // Update workouts in database with depletion data
    for (const workout of processedWorkouts) {
      if (workout.depletion_g !== undefined) {
        const { error } = await supabase
          .from('workouts')
          .update({
            depletion_g: workout.depletion_g,
            depletion_method: workout.depletion_method,
            intensity_bucket: workout.intensity_bucket,
            intensity_source: workout.intensity_source
          })
          .eq('id', workout.id)

        if (error) {
          console.error('Error updating workout depletion:', error)
          throw new Error(`Failed to update workout ${workout.id}: ${error.message}`)
        }
      }
    }
    
    // Group workouts by date
    const workoutsByDate = groupWorkoutsByDate(processedWorkouts)
    
    // Create intake map
    const intakesByDate = {}
    if (intakes) {
      intakes.forEach(intake => {
        intakesByDate[intake.date] = intake
      })
    }
    
    // Generate all dates in range
    const allDates = generateDateRange(startDateStr, endDateStr)
    
    if (onProgress) onProgress(40, 100, 'Computing ledger...')
    
    // ── Glycogen store initialisation ──────────────────────────────────
    const parsedCapacityOverride = Number(settings?.glycogen_capacity_override_g)
    const capacityOverride = Number.isFinite(parsedCapacityOverride) && parsedCapacityOverride > 0
      ? parsedCapacityOverride
      : null
    const capacity = calculateGlycogenCapacity(weightKg, capacityOverride)
    const supercompCap = calculateSupercompCap(capacity)

    // If user has a legacy starting_debt_g, convert it to a starting store.
    // Otherwise start at 100% of capacity (INITIAL_FILL_RATIO).
    const startingDebt = Number(settings?.starting_debt_g) || 0
    let previousStoreEnd
    if (startingDebt > 0) {
      previousStoreEnd = Math.max(0, capacity - startingDebt)
    } else {
      previousStoreEnd = capacity * GLYCOGEN_STORE.INITIAL_FILL_RATIO
    }

    // Process each day sequentially
    const daysSummaries = []

    for (let i = 0; i < allDates.length; i++) {
      const date = allDates[i]
      const dayWorkouts = workoutsByDate[date] || []
      const intake = intakesByDate[date]

      // Calculate depletion (always computed, even on no-data days)
      const depletionTotal = calculateDayDepletion(dayWorkouts)

      // ── Store ledger update ─────────────────────────────────────────
      const storeStart = previousStoreEnd

      // Derive deficit/surplus at start-of-day for target calculation
      const startMetrics = deriveStoreMetrics(storeStart, capacity)

      // Calculate targets first — needed for assumed repletion on no-intake days
      const carbTarget = calculateStoreCarbTarget({
        weightKg,
        depletionTotal,
        deficit: startMetrics.deficit,
        surplus: startMetrics.surplus
      })

      const proteinTarget = calculateProteinTarget(weightKg, proteinGPerKg)

      const intakeModel = resolveDailyIntakeModel({ intake, carbTarget })
      const hasIntake = intakeModel.hasIntake
      const carbsLogged = intakeModel.carbsLogged
      const proteinLogged = intakeModel.proteinLogged
      const repletion = intakeModel.repletion
      const intakeType = intakeModel.intakeType
      const intakeConfidence = intakeModel.intakeConfidence
      const estimatedIntakeG = intakeModel.estimatedIntakeG

      // Store equation: store_end = clamp(store_start − depletion + repletion, 0, supercompCap)
      const storeEnd = clamp(
        storeStart - depletionTotal + repletion,
        0,
        supercompCap
      )

      // Derive end-of-day metrics
      const { deficit, surplus, fillPct } = deriveStoreMetrics(storeEnd, capacity)

      // ── Backward-compat debt columns ────────────────────────────────
      const debtStart = calculateBoundedDebt(capacity, storeStart)
      const debtEnd = calculateBoundedDebt(capacity, storeEnd)

      // Calculate scores — alignment only meaningful when intake data exists
      const alignmentScore = hasIntake
        ? calculateAlignmentScore({
            carbsLogged,
            carbTarget,
            proteinLogged,
            proteinTarget
          })
        : null

      const readinessScore = calculateReadinessFromFill(fillPct)
      const riskFlag = getRiskFlagFromFill(fillPct)

      // Determine if hard day
      const totalTSS = dayWorkouts.reduce((sum, w) => sum + (w.tss || 0), 0)
      const hardDay = isHardDay({
        totalTSS,
        depletionTotal,
        workouts: dayWorkouts
      })

      // Store day summary — includes both store columns (v2) and debt columns (compat)
      const daySummary = {
        date,
        has_intake: intakeType === 'logged',
        intake_type: intakeType,
        intake_confidence: intakeConfidence,
        estimated_intake_g: estimatedIntakeG,
        // v2 store model columns
        glycogen_store_start_g: Math.round(storeStart),
        glycogen_store_end_g: Math.round(storeEnd),
        glycogen_capacity_g: capacity,
        glycogen_surplus_g: Math.round(surplus),
        glycogen_deficit_g: Math.round(deficit),
        fill_pct: fillPct,
        // v1 debt columns (backward compat, derived from store)
        debt_start_g: Math.round(debtStart),
        debt_end_g: Math.round(debtEnd),
        depletion_total_g: Math.round(depletionTotal),
        repletion_g: Math.round(repletion),
        carbs_logged_g: carbsLogged,
        protein_logged_g: proteinLogged,
        carb_target_g: carbTarget,
        protein_target_g: proteinTarget,
        alignment_score: alignmentScore,
        readiness_score: readinessScore,
        risk_flag: riskFlag,
        is_hard_day: hardDay,
        is_rest_day: dayWorkouts.length === 0,
        total_tss: totalTSS,
        total_duration_min: dayWorkouts.reduce((sum, w) => sum + (w.duration_min || 0), 0)
      }

      daysSummaries.push(daySummary)
      previousStoreEnd = storeEnd

      if (onProgress && i % 5 === 0) {
        const progress = 40 + Math.round((i / allDates.length) * 40)
        onProgress(progress, 100, `Processing day ${i + 1}/${allDates.length}...`)
      }
    }
    
    if (onProgress) onProgress(80, 100, 'Generating insights...')
    
    // Second pass: generate insights with context
    for (let i = 0; i < daysSummaries.length; i++) {
      const day = daysSummaries[i]
      const isHardTomorrow = i < daysSummaries.length - 1 && daysSummaries[i + 1].is_hard_day
      const isBackToBack = isBackToBackHard(daysSummaries, i)
      const debtWindow = daysSummaries
        .slice(Math.max(0, i - 2), i + 1)
        .map(d => Number(d.debt_end_g) || 0)

      day.debt_trend = calculateDebtTrend(debtWindow)
      
      const insights = generateDayInsights({
        ...day,
        is_hard_tomorrow: isHardTomorrow,
        is_back_to_back: isBackToBack
      })
      
      day.insight_headline = insights.headline
      day.insight_action = insights.action
      day.insight_why = insights.why
    }
    
    if (onProgress) onProgress(90, 100, 'Saving to database...')
    
    // Upsert all day summaries
    for (const day of daysSummaries) {
      const { date, ...dayData } = day

      const { error } = await supabase
        .from('day_summaries')
        .upsert(
          {
            user_id: userId,
            date,
            ...dayData,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,date' }
        )

      if (error) {
        console.error('Error upserting day summary:', error)
        console.error('Failed day data:', { date, ...dayData })
        throw new Error(`Failed to upsert day summary for ${date}: ${error.message}`)
      }
    }
    
    if (onProgress) onProgress(100, 100, 'Complete!')
    
    return {
      success: true,
      daysProcessed: daysSummaries.length
    }
    
  } catch (error) {
    console.error('Error recomputing ledger:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
