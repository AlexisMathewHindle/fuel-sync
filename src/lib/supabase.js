import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

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

