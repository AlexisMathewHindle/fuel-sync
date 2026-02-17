/**
 * Day Summarizer
 * Computes daily summaries from workouts
 */

import { getWorkouts, upsertDaySummary, getUserSettings } from './database'
import { calculateNutritionTargets } from './fuelingEngine'

/**
 * Group workouts by date
 * @param {array} workouts - Array of workout objects
 * @returns {object} - Object with dates as keys, arrays of workouts as values
 */
function groupWorkoutsByDate(workouts) {
  const grouped = {}
  
  for (const workout of workouts) {
    // Extract date portion (YYYY-MM-DD) from start_date
    const date = workout.start_date.split('T')[0]
    
    if (!grouped[date]) {
      grouped[date] = []
    }
    
    grouped[date].push(workout)
  }
  
  return grouped
}

/**
 * Calculate sport mix for a day
 * @param {array} workouts - Array of workouts for a single day
 * @returns {object} - Object with sport names as keys, duration in minutes as values
 */
function calculateSportMix(workouts) {
  const sportMix = {}
  
  for (const workout of workouts) {
    const sport = workout.sport || 'other'
    const duration = workout.duration_min || 0
    
    if (!sportMix[sport]) {
      sportMix[sport] = 0
    }
    
    sportMix[sport] += duration
  }
  
  return sportMix
}

/**
 * Compute summary for a single day
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {array} workouts - Array of workouts for that day
 * @returns {object} - Day summary object
 */
function computeDaySummary(date, workouts) {
  let totalDuration = 0
  let totalTss = 0
  let totalCalories = 0
  
  for (const workout of workouts) {
    totalDuration += workout.duration_min || 0
    totalTss += workout.tss || 0
    totalCalories += workout.calories || 0
  }
  
  const sportMix = calculateSportMix(workouts)
  
  return {
    date,
    total_duration_min: totalDuration,
    total_tss: totalTss,
    total_calories: totalCalories,
    sport_mix_json: sportMix
  }
}

/**
 * Summarize days for a user
 * @param {string} userId - User ID
 * @param {object} options - Options
 * @param {number} options.days - Number of days to summarize (default: 40)
 * @param {function} options.onProgress - Progress callback
 * @returns {object} - Summary results
 */
export async function summarizeDays(userId, options = {}) {
  const { days = 40, onProgress = null } = options

  try {
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    if (onProgress) {
      onProgress(0, 100, 'Fetching user settings and workouts...')
    }

    // Fetch user settings for nutrition calculations
    const { data: userSettings } = await getUserSettings(userId)

    // Fetch workouts for the date range
    const { data: workouts, error } = await getWorkouts(userId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    })

    if (error) {
      throw new Error(`Failed to fetch workouts: ${error.message}`)
    }
    
    if (!workouts || workouts.length === 0) {
      return {
        success: true,
        daysProcessed: 0,
        workoutsProcessed: 0,
        message: 'No workouts found in date range'
      }
    }
    
    if (onProgress) {
      onProgress(25, 100, `Found ${workouts.length} workouts, grouping by date...`)
    }
    
    // Group workouts by date
    const groupedWorkouts = groupWorkoutsByDate(workouts)
    const dates = Object.keys(groupedWorkouts).sort()
    
    if (onProgress) {
      onProgress(50, 100, `Processing ${dates.length} days...`)
    }
    
    // Compute and upsert summaries for each day
    let processedDays = 0
    const errors = []
    
    for (const date of dates) {
      const dayWorkouts = groupedWorkouts[date]
      const summary = computeDaySummary(date, dayWorkouts)

      // Calculate nutrition targets
      const nutritionTargets = calculateNutritionTargets(summary, userSettings)

      // Merge summary with nutrition targets
      const completeSummary = {
        ...summary,
        ...nutritionTargets
      }

      // Upsert the day summary
      const { error: upsertError } = await upsertDaySummary(userId, date, completeSummary)

      if (upsertError) {
        errors.push({ date, error: upsertError.message })
      } else {
        processedDays++
      }

      if (onProgress && processedDays % 5 === 0) {
        const progress = 50 + Math.round((processedDays / dates.length) * 50)
        onProgress(progress, 100, `Processed ${processedDays}/${dates.length} days...`)
      }
    }
    
    if (onProgress) {
      onProgress(100, 100, 'Summarization complete!')
    }
    
    return {
      success: true,
      daysProcessed: processedDays,
      workoutsProcessed: workouts.length,
      dateRange: {
        start: dates[0],
        end: dates[dates.length - 1]
      },
      errors: errors.length > 0 ? errors : null
    }
    
  } catch (error) {
    console.error('Day summarization error:', error)
    return {
      success: false,
      error: error.message,
      daysProcessed: 0,
      workoutsProcessed: 0
    }
  }
}

