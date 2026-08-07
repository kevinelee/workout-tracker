import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Only send errors in production unless DSN is explicitly set in dev
    enabled: import.meta.env.PROD || !!import.meta.env.VITE_SENTRY_DSN,
  })
}

// Mark the document when running as an installed home-screen app, so the
// safe-area insets in index.css can apply. iOS launches home-screen apps via
// the legacy apple-mobile-web-app-capable meta tag and reports that through
// navigator.standalone — it does not reliably match the display-mode media
// query, so a CSS-only check leaves the insets at 0 and the status bar
// overlaps the header (we use black-translucent, so content runs full-bleed).
if (window.navigator.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches) {
  document.documentElement.dataset.standalone = 'true'
}

// The app shell is sized from --app-height rather than any viewport unit.
// Every unit we tried misreports somewhere on iOS: svh under-reports in
// standalone and leaves the bottom strip unpainted, dvh disagreed with the
// svh on #root and left the document a sliver of scroll (so the app launched
// offset), and % resolves against the initial containing block — the small
// viewport — so it locks to the launch size and never grows when the browser
// chrome retracts. window.innerHeight is the one value that is always the
// true current viewport. Read it here and re-read it whenever it changes, so
// the shell tracks the window instead of predicting it.
//
// Deliberately window.innerHeight and not visualViewport.height: on iOS the
// former ignores the software keyboard, so focusing a weight field doesn't
// collapse the shell mid-set.
function syncAppHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
}
syncAppHeight()
window.addEventListener('resize', syncAppHeight)
window.addEventListener('orientationchange', syncAppHeight)
// iOS settles the standalone viewport a beat after launch; re-measure once
// painted so the first frame's value can't be the one that sticks.
window.addEventListener('load', syncAppHeight)

// In dev, nuke any stale service worker so it never serves cached files
// over Vite's live dev server. In production the SW registers normally.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister())
  })
  // Also clear the workbox precache so stale assets don't linger
  caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
