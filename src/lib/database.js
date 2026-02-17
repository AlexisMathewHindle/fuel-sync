import { supabase } from './supabase'

// ============================================================================
// USER SETTINGS
// ============================================================================

export async function getUserSettings(userId) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle() // Use maybeSingle() to handle 0 or 1 rows gracefully

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching user settings:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

export async function upsertUserSettings(userId, settings) {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, ...settings })
    .select()
    .single()
  
  if (error) {
    console.error('Error upserting user settings:', error)
  }
  
  return { data, error }
}

// ============================================================================
// WORKOUTS
// ============================================================================

export async function getWorkouts(userId, options = {}) {
  let query = supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
  
  if (options.startDate) {
    query = query.gte('start_date', options.startDate)
  }
  
  if (options.endDate) {
    query = query.lte('start_date', options.endDate)
  }
  
  if (options.limit) {
    query = query.limit(options.limit)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching workouts:', error)
  }
  
  return { data, error }
}

export async function getWorkoutById(workoutId) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .single()
  
  if (error) {
    console.error('Error fetching workout:', error)
  }
  
  return { data, error }
}

export async function createWorkout(userId, workout) {
  const { data, error } = await supabase
    .from('workouts')
    .insert({ user_id: userId, ...workout })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating workout:', error)
  }
  
  return { data, error }
}

export async function updateWorkout(workoutId, updates) {
  const { data, error } = await supabase
    .from('workouts')
    .update(updates)
    .eq('id', workoutId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating workout:', error)
  }
  
  return { data, error }
}

export async function deleteWorkout(workoutId) {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId)
  
  if (error) {
    console.error('Error deleting workout:', error)
  }
  
  return { error }
}

// ============================================================================
// DAY SUMMARIES
// ============================================================================

export async function getDaySummaries(userId, options = {}) {
  let query = supabase
    .from('day_summaries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  
  if (options.startDate) {
    query = query.gte('date', options.startDate)
  }
  
  if (options.endDate) {
    query = query.lte('date', options.endDate)
  }
  
  if (options.limit) {
    query = query.limit(options.limit)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching day summaries:', error)
  }
  
  return { data, error }
}

export async function upsertDaySummary(userId, date, summary) {
  const { data, error } = await supabase
    .from('day_summaries')
    .upsert(
      { user_id: userId, date, ...summary },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error upserting day summary:', error)
  }

  return { data, error }
}

// ============================================================================
// DAY INTAKE
// ============================================================================

export async function getDayIntake(userId, date) {
  const { data, error } = await supabase
    .from('day_intake')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle() // Use maybeSingle() instead of single() to handle 0 or 1 rows gracefully

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching day intake:', error)
  }

  return { data, error }
}

export async function getDayIntakes(userId, options = {}) {
  let query = supabase
    .from('day_intake')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (options.startDate) {
    query = query.gte('date', options.startDate.split('T')[0])
  }

  if (options.endDate) {
    query = query.lte('date', options.endDate.split('T')[0])
  }

  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching day intakes:', error)
  }

  return { data, error }
}

export async function upsertDayIntake(userId, date, intake) {
  const { data, error } = await supabase
    .from('day_intake')
    .upsert(
      { user_id: userId, date, ...intake },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error upserting day intake:', error)
  }

  return { data, error }
}

export async function deleteDayIntake(userId, date) {
  const { error } = await supabase
    .from('day_intake')
    .delete()
    .eq('user_id', userId)
    .eq('date', date)

  if (error) {
    console.error('Error deleting day intake:', error)
  }

  return { error }
}

// ============================================================================
// IMPORTS
// ============================================================================

export async function getImports(userId, options = {}) {
  let query = supabase
    .from('imports')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })

  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching imports:', error)
  }

  return { data, error }
}

export async function createImport(userId, importData) {
  const { data, error } = await supabase
    .from('imports')
    .insert({ user_id: userId, ...importData })
    .select()
    .single()

  if (error) {
    console.error('Error creating import:', error)
  }

  return { data, error }
}

export async function updateImportStatus(importId, status, updates = {}) {
  const { data, error } = await supabase
    .from('imports')
    .update({ status, ...updates })
    .eq('id', importId)
    .select()
    .single()

  if (error) {
    console.error('Error updating import status:', error)
  }

  return { data, error }
}

