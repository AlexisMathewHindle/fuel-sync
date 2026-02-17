/**
 * Data parsing utilities for CSV import
 * Handles safe parsing of dates, durations, numbers with error handling
 */

/**
 * Parse a date string into ISO format
 * Supports various date formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, etc.
 * @param {string} dateStr - Date string to parse
 * @param {string} timezone - User's timezone (default: UTC)
 * @returns {string|null} - ISO date string or null if invalid
 */
export function parseDate(dateStr, timezone = 'UTC') {
  if (!dateStr || dateStr.trim() === '') return null
  
  try {
    // Try parsing as ISO date first
    const date = new Date(dateStr)
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      // Try common formats
      const formats = [
        // MM/DD/YYYY
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        // DD-MM-YYYY
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
        // YYYY.MM.DD
        /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/
      ]
      
      for (const format of formats) {
        const match = dateStr.match(format)
        if (match) {
          // Assume MM/DD/YYYY for slash format
          if (dateStr.includes('/')) {
            const [, month, day, year] = match
            return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString()
          }
        }
      }
      
      return null
    }
    
    return date.toISOString()
  } catch (error) {
    console.error('Error parsing date:', dateStr, error)
    return null
  }
}

/**
 * Parse duration string into minutes
 * Supports formats: HH:MM:SS, HH:MM, MM:SS, plain minutes, or hours (decimal)
 * @param {string|number} durationStr - Duration string or number
 * @param {string} unit - Unit of plain numbers: 'minutes' (default), 'hours', or 'auto'
 * @returns {number|null} - Duration in minutes or null if invalid
 */
export function parseDuration(durationStr, unit = 'auto') {
  if (durationStr === null || durationStr === undefined || durationStr === '') return 0

  // If already a number, convert based on unit
  if (typeof durationStr === 'number') {
    if (unit === 'hours') {
      return durationStr * 60
    }
    return durationStr // assume minutes by default
  }

  const str = String(durationStr).trim()

  // Handle empty or whitespace-only strings
  if (str === '' || str === '0' || str === '00:00:00' || str === '00:00') {
    return 0
  }

  // Parse HH:MM:SS or MM:SS format (has colons)
  if (str.includes(':')) {
    const parts = str.split(':')

    // Filter out empty parts and parse
    const numericParts = parts.map(p => {
      const trimmed = p.trim()
      return trimmed === '' ? 0 : parseInt(trimmed, 10)
    })

    if (parts.length === 3) {
      // HH:MM:SS
      const [hours, minutes, seconds] = numericParts
      if (numericParts.every(p => !isNaN(p) && p >= 0)) {
        return hours * 60 + minutes + seconds / 60
      }
    } else if (parts.length === 2) {
      // Could be HH:MM or MM:SS
      const [first, second] = numericParts
      if (!isNaN(first) && !isNaN(second) && first >= 0 && second >= 0) {
        // Assume HH:MM for most cases
        return first * 60 + second
      }
    }
  }

  // Try parsing as plain number
  const asNumber = parseFloat(str)
  if (!isNaN(asNumber)) {
    // Auto-detect: if number is very small (< 24), likely hours; if large (> 24), likely minutes
    if (unit === 'auto') {
      // If the number has a decimal point and is less than 24, assume hours
      if (str.includes('.') && asNumber < 24) {
        return asNumber * 60 // Convert hours to minutes
      }
      // Otherwise assume minutes
      return asNumber
    } else if (unit === 'hours') {
      return asNumber * 60 // Convert hours to minutes
    } else {
      return asNumber // Already in minutes
    }
  }

  // If we get here, we couldn't parse it
  console.warn('Could not parse duration:', durationStr)
  return null
}

/**
 * Parse a numeric value safely
 * @param {string|number} value - Value to parse
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number|null} - Parsed number or null if invalid
 */
export function parseNumber(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return null
  
  const num = parseFloat(value)
  if (isNaN(num)) return null
  
  return decimals > 0 ? parseFloat(num.toFixed(decimals)) : Math.round(num)
}

/**
 * Parse integer value safely
 * @param {string|number} value - Value to parse
 * @returns {number|null} - Parsed integer or null if invalid
 */
export function parseInteger(value) {
  if (value === null || value === undefined || value === '') return null
  
  const num = parseInt(value, 10)
  if (isNaN(num)) return null
  
  return num
}

/**
 * Normalize sport/activity type
 * @param {string} sport - Sport/activity type
 * @returns {string} - Normalized sport name
 */
export function normalizeSport(sport) {
  if (!sport) return 'other'
  
  const normalized = sport.toLowerCase().trim()
  
  // Map common variations to standard names
  const sportMap = {
    'running': 'run',
    'jogging': 'run',
    'cycling': 'bike',
    'biking': 'bike',
    'ride': 'bike',
    'swimming': 'swim',
    'strength training': 'strength',
    'weights': 'strength',
    'gym': 'strength',
    'rest': 'rest',
    'recovery': 'rest'
  }
  
  return sportMap[normalized] || normalized
}

/**
 * Validate a workout object has required fields
 * @param {object} workout - Workout object to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateWorkout(workout) {
  const errors = []

  if (!workout.start_date) {
    errors.push('Missing start_date')
  }

  if (workout.duration_min === null || workout.duration_min === undefined) {
    errors.push('Missing duration_min')
  }

  if (!workout.sport) {
    errors.push('Missing sport')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

