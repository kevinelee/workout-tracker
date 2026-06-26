import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

export async function signUp(email, password) {
  return supabase.auth.signUp({ email, password })
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/?reset=1`,
  })
}

export async function updatePassword(newPassword) {
  return supabase.auth.updateUser({ password: newPassword })
}

// Wrapper around supabase.functions.invoke that:
// - Explicitly fetches and attaches the session token (fetchWithAuth can
//   silently fall back to the anon key if getSession() races with a refresh)
// - Logs actionable errors to the console
export async function callFunction(name, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    console.error(`[AI/${name}] No active session — user may need to sign in again`)
    return { data: null, error: new Error('No session') }
  }
  const result = await supabase.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  if (result.error) {
    console.error(`[AI/${name}] Error:`, result.error?.message ?? result.error, '| status:', result.error?.context?.status)
  }
  return result
}
