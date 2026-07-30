import { Component } from 'react'
import * as Sentry from '@sentry/react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '32px 24px',
        background: 'var(--bg, #16171d)',
        color: 'var(--text, #9ca3af)',
        fontFamily: 'var(--sans, system-ui, sans-serif)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '32px', margin: 0 }}>⚠️</p>
        <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-h, #f3f4f6)', margin: 0 }}>
          Something went wrong
        </p>
        <p style={{ fontSize: '14px', lineHeight: 1.5, margin: 0, maxWidth: '280px' }}>
          An unexpected error occurred. Your data is safe — tap below to reload the app.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '8px',
            background: 'var(--accent, #c084fc)',
            color: 'var(--on-accent, #16171d)',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 32px',
            fontSize: '15px',
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    )
  }
}
