import { useState } from 'react'
import { signIn, signUp, resetPassword } from '../lib/supabase'
import './AuthScreen.css'

const ACCESS_CODE_KEY = 'wt:access'
const REQUIRED_CODE   = import.meta.env.VITE_ACCESS_CODE

function isAccessGranted() {
  if (!REQUIRED_CODE) return true
  return localStorage.getItem(ACCESS_CODE_KEY) === REQUIRED_CODE
}

export default function AuthScreen({ onAuth, initialMode = 'signin' }) {
  const [mode, setMode]         = useState(isAccessGranted() ? initialMode : 'access')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  function switchMode(next) {
    setMode(next)
    setError(null)
    setConfirmPassword('')
  }

  function handleAccessSubmit(e) {
    e.preventDefault()
    if (accessCode.trim() === REQUIRED_CODE) {
      localStorage.setItem(ACCESS_CODE_KEY, REQUIRED_CODE)
      setError(null)
      setMode('signin')
    } else {
      setError('Invalid access code')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (mode === 'forgot') {
      const { error: err } = await resetPassword(email)
      setLoading(false)
      if (err) { setError(err.message); return }
      setMode('resetSent')
      return
    }

    const { data, error: err } = mode === 'signup'
      ? await signUp(email, password)
      : await signIn(email, password)

    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    if (data?.session) {
      onAuth(data.session.user)
    } else if (mode === 'signup') {
      if (data?.user && data.user.identities?.length === 0) {
        setError('An account with this email already exists. Try signing in instead.')
      } else {
        setMode('confirm')
      }
    }
  }

  if (mode === 'access') {
    return (
      <div className="auth">
        <div className="auth-card">
          <img src="/session.png" alt="session" className="auth-logo" />
          <p className="auth-sub">Enter your access code to continue</p>
          <form className="auth-form" onSubmit={handleAccessSubmit}>
            <label className="auth-label">
              Access code
              <input
                className="auth-input"
                type="password"
                autoComplete="off"
                required
                value={accessCode}
                onChange={e => setAccessCode(e.target.value)}
                placeholder="••••••••"
                autoFocus
              />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-submit" type="submit">Continue</button>
          </form>
        </div>
      </div>
    )
  }

  if (mode === 'confirm') {
    return (
      <div className="auth">
        <div className="auth-card">
          <img src="/session.png" alt="session" className="auth-logo" />
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-sub">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to sign in.</p>
          <button className="auth-link" onClick={() => switchMode('signin')}>Back to sign in</button>
        </div>
      </div>
    )
  }

  if (mode === 'resetSent') {
    return (
      <div className="auth">
        <div className="auth-card">
          <img src="/session.png" alt="session" className="auth-logo" />
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-sub">We sent a password reset link to <strong>{email}</strong>. Follow the link to choose a new password.</p>
          <button className="auth-link" onClick={() => switchMode('signin')}>Back to sign in</button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <img src="/session.png" alt="session" className="auth-logo" />
        <h1 className="auth-title">session</h1>
        <p className="auth-sub">
          {mode === 'signin'  ? 'Sign in to your account'  :
           mode === 'signup'  ? 'Create a free account'    :
           'Reset your password'}
        </p>

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

          {mode !== 'forgot' && (
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
          )}

          {mode === 'signup' && (
            <label className="auth-label">
              Confirm password
              <input
                className="auth-input"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait…' :
             mode === 'signin'  ? 'Sign in' :
             mode === 'signup'  ? 'Create account' :
             'Send reset link'}
          </button>
        </form>

        {mode === 'signin' && (
          <p className="auth-switch">
            <button className="auth-link" onClick={() => switchMode('forgot')}>
              Forgot password?
            </button>
          </p>
        )}

        {mode === 'forgot' ? (
          <p className="auth-switch">
            <button className="auth-link" onClick={() => switchMode('signin')}>Back to sign in</button>
          </p>
        ) : (
          <p className="auth-switch">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button className="auth-link" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        )}

        <p className="auth-legal">
          By continuing you agree to our{' '}
          <a className="auth-legal-link" href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
          {' '}and{' '}
          <a className="auth-legal-link" href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
