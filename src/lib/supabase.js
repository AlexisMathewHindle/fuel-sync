import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

const missingVars = []

if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url') {
  missingVars.push('VITE_SUPABASE_URL')
}

if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key') {
  missingVars.push('VITE_SUPABASE_ANON_KEY')
}

if (missingVars.length > 0) {
  throw new Error(
    `[FuelSync] Missing Supabase environment variable(s): ${missingVars.join(', ')}. ` +
    'For Netlify, add them in Site settings -> Environment variables, then run a new deploy.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to test connection
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('_test').select('*').limit(1)
    if (error && error.code !== 'PGRST204') {
      // PGRST204 means table doesn't exist, which is fine for testing connection
      console.log('Supabase connection test:', error.message)
      return false
    }
    console.log('Supabase connected successfully!')
    return true
  } catch (err) {
    console.error('Supabase connection error:', err)
    return false
  }
}
