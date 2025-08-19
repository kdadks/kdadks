import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Check if Supabase is properly configured
export const isSupabaseConfigured = Boolean(
  (import.meta as any).env?.VITE_SUPABASE_URL && 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY
)

if (!isSupabaseConfigured) {
  console.warn('Supabase is not configured. Admin features will be disabled.')
}

// Always create a client, but with placeholder values if not configured
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Disabled - not using OAuth
    debug: false, // Set to true for auth debugging
  },
  global: {
    headers: {
      'x-application-name': 'kdadks-website'
    }
  }
})

// Handle auth state changes and errors
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state change:', event, session ? 'Session exists' : 'No session')
  
  if (event === 'TOKEN_REFRESHED') {
    console.log('✅ Token refreshed successfully')
  } else if (event === 'SIGNED_OUT') {
    console.log('🚪 User signed out')
    // Clear any cached data
    localStorage.removeItem('supabase.auth.token')
    sessionStorage.removeItem('supabase.auth.token')
  }
})

export default supabase
