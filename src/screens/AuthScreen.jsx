import { useState } from 'react'
import { signIn, signUp } from '../lib/supabase'
import './AuthScreen.css'

export default function AuthScreen({ onAuth }) {
  const [mode, setMode]       = useState('signin') // 'signin' | 'signup'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: err } = mode === 'signup'
      ? await signUp(email, password)
      : await signIn(email, password)

    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    // signUp returns a session immediately if email confirmation is off
    if (data?.session) {
      onAuth(data.session.user)
    } else if (mode === 'signup') {
      // Email confirmation is on — ask user to check inbox
      setError(null)
      setMode('confirm')
    }
  }

  if (mode === 'confirm') {
    return (
      <div className="auth">
        <div className="auth-card">
          <span className="auth-logo">💪</span>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-sub">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to sign in.</p>
          <button className="auth-link" onClick={() => setMode('signin')}>Back to sign in</button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <span className="auth-logo">💪</span>
        <h1 className="auth-title">Workout Tracker</h1>
        <p className="auth-sub">{mode === 'signin' ? 'Sign in to your account' : 'Create a free account'}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button className="auth-link" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
