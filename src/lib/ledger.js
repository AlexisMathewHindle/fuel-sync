/**
 * Glycogen Ledger Recompute Service
 * Deterministic day-by-day calculation of glycogen debt, targets, and insights
 */

import { supabase } from './supabase'
import { getWorkouts, getDayIntakes, getUserSettings } from './database'
import { processWorkout, calculateDayDepletion } from './depletion'
import {
  calculateRepletion,
  calculateCarbTarget,
  calculateProteinTarget,
  calculateAlignmentScore,
  calculateReadinessScore,
  getRiskFlag,
  isHardDay,
  clamp,
  DEBT_THRESHOLDS
} from './thresholds'
import { generateDayInsights } from './insights'

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
    const weightKg = settings?.weight_kg || 70
    const proteinGPerKg = settings?.protein_g_per_kg || 1.8
    const hrMax = settings?.hr_max || 180
    
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
    
    // Process each day sequentially
    const daysSummaries = []
    let previousDebtEnd = settings?.starting_debt_g || 0
    
    for (let i = 0; i < allDates.length; i++) {
      const date = allDates[i]
      const dayWorkouts = workoutsByDate[date] || []
      const intake = intakesByDate[date]
      const hasIntake = !!intake

      // Calculate depletion (always computed for display, even on no-data days)
      const depletionTotal = calculateDayDepletion(dayWorkouts)

      // Calculate repletion
      const carbsLogged = intake?.carbs_g || 0
      const proteinLogged = intake?.protein_g || 0
      const repletion = hasIntake ? calculateRepletion(carbsLogged) : 0

      // Ledger update
      const debtStart = previousDebtEnd
      let debtEnd

      if (hasIntake) {
        // Normal ledger: apply depletion and repletion
        debtEnd = clamp(
          debtStart + depletionTotal - repletion,
          0,
          DEBT_THRESHOLDS.DEBT_CAP
        )
      } else {
        // Option B: No intake data — freeze debt, don't apply depletion
        // We can't verify what the athlete actually ate, so carry forward
        debtEnd = debtStart
      }

      // Calculate targets (still useful even on no-data days — shows what they should eat)
      const carbTarget = calculateCarbTarget({
        weightKg,
        depletionTotal,
        debtStart
      })

      const proteinTarget = calculateProteinTarget(weightKg, proteinGPerKg)

      // Calculate scores — only meaningful when intake data exists
      const alignmentScore = hasIntake
        ? calculateAlignmentScore({
            carbsLogged,
            carbTarget,
            proteinLogged,
            proteinTarget
          })
        : null

      const readinessScore = calculateReadinessScore(debtEnd)
      const riskFlag = hasIntake ? getRiskFlag(debtEnd) : 'gray'

      // Determine if hard day
      const totalTSS = dayWorkouts.reduce((sum, w) => sum + (w.tss || 0), 0)
      const hardDay = isHardDay({
        totalTSS,
        depletionTotal,
        workouts: dayWorkouts
      })

      // Store day summary
      const daySummary = {
        date,
        has_intake: hasIntake,
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
      previousDebtEnd = debtEnd

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

