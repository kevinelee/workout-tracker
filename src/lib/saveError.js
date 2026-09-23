import * as Sentry from '@sentry/react'

// Supabase resolves write calls with { error } instead of rejecting, so an
// unchecked `await supabase.from(...).update(...)` swallows every failure.
// storage.js turns those into SaveErrors; anything a screen doesn't catch
// itself is surfaced by the unhandledrejection listener in main.jsx.
export class SaveError extends Error {
  constructor(what, cause) {
    super(`Could not save ${what}: ${cause?.message ?? cause ?? 'no rows were updated'}`)
    this.name = 'SaveError'
    this.what = what
    this.cause = cause
  }
}

export function alertSaveError(err) {
  console.error(err)
  Sentry.captureException(err)
  const what = err instanceof SaveError ? err.what : 'your changes'
  alert(`Couldn't save ${what}. Check your connection and try again.`)
}
