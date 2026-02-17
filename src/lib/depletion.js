/**
 * Glycogen Depletion Calculation
 * Estimates glycogen depletion from workout data and determines intensity buckets
 */

import {
  DEPLETION,
  getIntensityBucketFromIF,
  getIntensityBucketFromHR,
  clamp
} from './thresholds'

/**
 * Calculate glycogen depletion for a workout
 * @param {object} workout - Workout data
 * @param {number} workout.tss - Training Stress Score
 * @param {number} workout.calories - Calories burned
 * @param {number} workout.if_score - Intensity Factor
 * @param {number} workout.avg_hr - Average heart rate
 * @returns {object} { depletionG, depletionMethod }
 */
export function calculateWorkoutDepletion(workout) {
  const { tss, calories } = workout
  
  // Calculate TSS-based depletion
  const depletionFromTSS = tss ? tss * DEPLETION.TSS_MULTIPLIER : 0
  
  // If calories are available, use them to clamp TSS estimate
  if (calories && calories > 0) {
    const depletionFromCal = calories * DEPLETION.CALORIES_MULTIPLIER
    const lowerBound = depletionFromCal * DEPLETION.CALORIES_CLAMP_LOW
    const upperBound = depletionFromCal * DEPLETION.CALORIES_CLAMP_HIGH
    
    const depletionG = clamp(depletionFromTSS, lowerBound, upperBound)
    
    return {
      depletionG: Math.round(depletionG),
      depletionMethod: 'tss_clamped_by_cal'
    }
  }
  
  // No calories available, use TSS only
  return {
    depletionG: Math.round(depletionFromTSS),
    depletionMethod: 'tss_only'
  }
}

/**
 * Determine intensity bucket for a workout
 * @param {object} workout - Workout data
 * @param {number} workout.if_score - Intensity Factor
 * @param {number} workout.avg_hr - Average heart rate
 * @param {number} hrMax - User's max heart rate (from settings)
 * @returns {object} { intensityBucket, intensitySource }
 */
export function determineIntensityBucket(workout, hrMax = 180) {
  const { if_score, avg_hr } = workout
  
  // Prefer IF if available
  if (if_score && if_score > 0) {
    return {
      intensityBucket: getIntensityBucketFromIF(if_score),
      intensitySource: 'if'
    }
  }
  
  // Fall back to HR if available
  if (avg_hr && avg_hr > 0 && hrMax) {
    return {
      intensityBucket: getIntensityBucketFromHR(avg_hr, hrMax),
      intensitySource: 'hr'
    }
  }
  
  // No intensity data available
  return {
    intensityBucket: 'unknown',
    intensitySource: 'unknown'
  }
}

/**
 * Process a workout to calculate depletion and intensity
 * @param {object} workout - Workout data
 * @param {number} hrMax - User's max heart rate
 * @returns {object} Workout with depletion and intensity fields added
 */
export function processWorkout(workout, hrMax = 180) {
  const { depletionG, depletionMethod } = calculateWorkoutDepletion(workout)
  const { intensityBucket, intensitySource } = determineIntensityBucket(workout, hrMax)
  
  return {
    ...workout,
    depletion_g: depletionG,
    depletion_method: depletionMethod,
    intensity_bucket: intensityBucket,
    intensity_source: intensitySource
  }
}

/**
 * Process multiple workouts
 * @param {Array} workouts - Array of workout objects
 * @param {number} hrMax - User's max heart rate
 * @returns {Array} Processed workouts with depletion and intensity
 */
export function processWorkouts(workouts, hrMax = 180) {
  return workouts.map(workout => processWorkout(workout, hrMax))
}

/**
 * Calculate total depletion for a day
 * @param {Array} workouts - Array of workouts for the day
 * @returns {number} Total depletion in grams
 */
export function calculateDayDepletion(workouts) {
  return workouts.reduce((total, workout) => {
    return total + (workout.depletion_g || 0)
  }, 0)
}

/**
 * Get intensity mix for a day
 * @param {Array} workouts - Array of workouts for the day
 * @returns {object} { easy, moderate, hard, unknown }
 */
export function getIntensityMix(workouts) {
  const mix = {
    easy: 0,
    moderate: 0,
    hard: 0,
    unknown: 0
  }
  
  workouts.forEach(workout => {
    const bucket = workout.intensity_bucket || 'unknown'
    mix[bucket] = (mix[bucket] || 0) + 1
  })
  
  return mix
}

/**
 * Check if any workout in a day is hard
 * @param {Array} workouts - Array of workouts for the day
 * @returns {boolean} True if any workout is hard
 */
export function hasHardWorkout(workouts) {
  return workouts.some(w => w.intensity_bucket === 'hard')
}

