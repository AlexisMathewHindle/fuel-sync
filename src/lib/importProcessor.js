/**
 * Import processing pipeline
 * Handles CSV row transformation, normalization, and batch insertion
 */

import { supabase } from './supabase'
import { createImport, updateImportStatus } from './database'
import {
  parseDate,
  parseDuration,
  parseNumber,
  parseInteger,
  normalizeSport,
  validateWorkout
} from './parsers'

/**
 * Transform a CSV row into a normalized workout object
 * @param {object} row - CSV row object
 * @param {object} columnMapping - Column mapping configuration
 * @param {string} timezone - User's timezone
 * @returns {object} - { workout: object|null, errors: string[] }
 */
export function transformRow(row, columnMapping, timezone = 'UTC') {
  const errors = []
  
  try {
    // Extract values based on column mapping
    const dateStr = row[columnMapping.date]
    const sportStr = row[columnMapping.sport]
    const nameStr = row[columnMapping.name]
    const durationStr = row[columnMapping.duration]
    const distanceStr = row[columnMapping.distance]
    const tssStr = row[columnMapping.tss]
    const ifStr = row[columnMapping.if]
    const avgHrStr = row[columnMapping.avgHr]
    const avgPowerStr = row[columnMapping.avgPower]
    const caloriesStr = row[columnMapping.calories]
    
    // Parse required fields
    const start_date = parseDate(dateStr, timezone)
    if (!start_date) {
      errors.push(`Invalid date: ${dateStr}`)
    }

    // Detect if duration column is in hours based on column name
    const durationColumnName = columnMapping.duration?.toLowerCase() || ''
    const isHoursColumn = durationColumnName.includes('hour')
    const durationUnit = isHoursColumn ? 'hours' : 'auto'

    const duration_min = parseDuration(durationStr, durationUnit)
    if (duration_min === null) {
      errors.push(`Invalid duration: ${durationStr}`)
    }
    
    const sport = normalizeSport(sportStr)
    if (!sport) {
      errors.push(`Invalid sport: ${sportStr}`)
    }
    
    // If required fields are missing, return null
    if (errors.length > 0) {
      return { workout: null, errors }
    }
    
    // Parse optional fields
    const workout = {
      start_date,
      sport,
      name: nameStr || null,
      duration_min: Math.round(duration_min), // Store as integer
      distance_km: parseNumber(distanceStr, 2),
      tss: parseInteger(tssStr),
      if_score: parseNumber(ifStr, 2),
      avg_hr: parseInteger(avgHrStr),
      avg_power: parseInteger(avgPowerStr),
      calories: parseInteger(caloriesStr),
      raw_json: row // Store original row for reference
    }
    
    // Validate the workout
    const validation = validateWorkout(workout)
    if (!validation.valid) {
      return { workout: null, errors: validation.errors }
    }
    
    return { workout, errors: [] }
    
  } catch (error) {
    errors.push(`Unexpected error: ${error.message}`)
    return { workout: null, errors }
  }
}

/**
 * Process and import CSV data
 * @param {object} params - Import parameters
 * @param {string} params.userId - User ID
 * @param {array} params.csvData - Array of CSV row objects
 * @param {object} params.columnMapping - Column mapping configuration
 * @param {string} params.fileName - Original file name
 * @param {string} params.timezone - User's timezone
 * @param {function} params.onProgress - Progress callback (current, total, status)
 * @returns {object} - Import result with stats
 */
export async function processImport({
  userId,
  csvData,
  columnMapping,
  fileName,
  timezone = 'UTC',
  onProgress = null
}) {
  const stats = {
    total: csvData.length,
    successful: 0,
    failed: 0,
    duplicates: 0,
    errors: []
  }
  
  try {
    // Step 1: Create import record
    if (onProgress) onProgress(0, stats.total, 'Creating import record...')
    
    const { data: importRecord, error: importError } = await createImport(userId, {
      source: 'trainingpeaks',
      filename: fileName,
      status: 'processing',
      row_count: csvData.length
    })
    
    if (importError) {
      throw new Error(`Failed to create import record: ${importError.message}`)
    }
    
    // Step 2: Transform all rows
    if (onProgress) onProgress(0, stats.total, 'Transforming data...')
    
    const transformedWorkouts = []
    const rowErrors = []
    
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i]
      const { workout, errors } = transformRow(row, columnMapping, timezone)
      
      if (workout) {
        // Add user_id and import_id
        workout.user_id = userId
        workout.import_id = importRecord.id
        transformedWorkouts.push(workout)
      } else {
        stats.failed++
        rowErrors.push({
          row: i + 1,
          errors: errors
        })
      }
      
      if (onProgress && i % 10 === 0) {
        onProgress(i, stats.total, `Transformed ${i}/${stats.total} rows...`)
      }
    }
    
    // Step 3: Insert workouts in batches
    if (onProgress) onProgress(0, transformedWorkouts.length, 'Inserting workouts...')
    
    const BATCH_SIZE = 50
    const batches = []
    
    for (let i = 0; i < transformedWorkouts.length; i += BATCH_SIZE) {
      batches.push(transformedWorkouts.slice(i, i + BATCH_SIZE))
    }
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      const { data, error } = await supabase
        .from('workouts')
        .insert(batch)
        .select()
      
      if (error) {
        // Check if it's a duplicate error
        if (error.code === '23505') { // Unique violation
          stats.duplicates += batch.length
        } else {
          stats.failed += batch.length
          rowErrors.push({
            batch: batchIndex + 1,
            errors: [error.message]
          })
        }
      } else {
        stats.successful += data.length
      }
      
      if (onProgress) {
        const processed = Math.min((batchIndex + 1) * BATCH_SIZE, transformedWorkouts.length)
        onProgress(processed, transformedWorkouts.length, `Inserted ${processed}/${transformedWorkouts.length} workouts...`)
      }
    }
    
    // Step 4: Update import record with results
    stats.errors = rowErrors
    
    await updateImportStatus(importRecord.id, 'completed', {
      row_count: stats.total,
      errors_json: rowErrors
    })
    
    if (onProgress) onProgress(stats.total, stats.total, 'Import complete!')
    
    return {
      success: true,
      importId: importRecord.id,
      stats
    }
    
  } catch (error) {
    console.error('Import processing error:', error)
    
    return {
      success: false,
      error: error.message,
      stats
    }
  }
}

