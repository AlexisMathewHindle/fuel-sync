import { supabase } from './supabase'
import { ref } from 'vue'

export const user = ref(null)
export const loading = ref(true)

function getMagicLinkRedirectUrl() {
  const configuredUrl = (import.meta.env.VITE_MAGIC_LINK_REDIRECT_URL || '').trim()
  if (configuredUrl) {
    return configuredUrl
  }
  return window.location.origin
}

// Initialize auth state
export async function initAuth() {
  loading.value = true
  try {
    const { data: { session } } = await supabase.auth.getSession()
    user.value = session?.user ?? null
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
    })
  } catch (error) {
    console.error('Error initializing auth:', error)
  } finally {
    loading.value = false
  }
}

// Sign in with magic link
export async function signInWithMagicLink(email) {
  try {
    const emailRedirectTo = getMagicLinkRedirectUrl()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo
      }
    })
    
    if (error) throw error
    return { success: true, message: 'Check your email for the login link!' }
  } catch (error) {
    console.error('Error signing in:', error)
    return { success: false, message: error.message }
  }
}

// Sign out
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
    return { success: true }
  } catch (error) {
    console.error('Error signing out:', error)
    return { success: false, message: error.message }
  }
}

// Get current user
export function getCurrentUser() {
  return user.value
}

// Check if user is authenticated
export function isAuthenticated() {
  return !!user.value
}
