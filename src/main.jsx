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
//
// On iOS, relaunching a standalone PWA can go through several transitional
// window.innerHeight readings before settling on the true one — no single
// event reliably marks "this is the final value", and firing more
// re-measurements to try to catch it made the launch height worse, not
// better, because a later trigger can catch a still-settling, too-small
// reading with nothing left to correct it afterward. So this only ever
// grows the tracked height, never shrinks it — a smaller reading is treated
// as unsettled, not as truth. orientationchange is the one legitimate case
// where the height should get smaller (rotating to landscape), so it resets
// the floor instead of just taking the max.
let knownHeight = 0
function syncAppHeight() {
  knownHeight = Math.max(knownHeight, window.innerHeight)
  document.documentElement.style.setProperty('--app-height', `${knownHeight}px`)
}
function resyncAppHeight() {
  knownHeight = 0
  syncAppHeight()
}
syncAppHeight()
window.addEventListener('resize', syncAppHeight)
window.addEventListener('orientationchange', resyncAppHeight)
// 'load' alone isn't enough: relaunching a standalone PWA from the app
// switcher is often a bfcache-style restore, not a fresh navigation, so load
// never fires there at all.
window.addEventListener('pageshow', syncAppHeight)
window.visualViewport?.addEventListener('resize', syncAppHeight)
setTimeout(syncAppHeight, 100)
setTimeout(syncAppHeight, 500)
setTimeout(syncAppHeight, 1500)

// TEMPORARY viewport-sizing diagnostics — remove once the standalone-PWA
// bottom-nav-gap bug is confirmed fixed on device. Renders the raw numbers
// iOS is actually reporting so the next report is real data instead of
// another guess at timing.
//
// Opt-in via localStorage, not just navigator.standalone, so this doesn't
// show for every standalone user — only whoever has actually turned it on.
// Visit the site once in regular Safari with ?debugViewport=1 to set the
// flag (localStorage is shared across the whole origin, including the
// home-screen-launched app), then relaunch the home-screen icon.
if (new URLSearchParams(location.search).get('debugViewport') === '1') {
  localStorage.setItem('debugViewport', '1')
} else if (new URLSearchParams(location.search).get('debugViewport') === '0') {
  localStorage.removeItem('debugViewport')
}
if (window.navigator.standalone === true && localStorage.getItem('debugViewport') === '1') {
  const debugEl = document.createElement('div')
  debugEl.style.cssText = 'position:fixed;left:4px;top:4px;z-index:99999;background:rgba(255,0,0,0.85);color:#fff;font:10px/1.4 monospace;padding:4px 6px;border-radius:4px;pointer-events:none;white-space:pre;'
  document.body.appendChild(debugEl)
  function renderDebug() {
    const navEl = document.querySelector('.app-nav')
    const navRect = navEl?.getBoundingClientRect()
    debugEl.textContent =
      `innerH:${window.innerHeight} known:${knownHeight}\n` +
      `vvH:${window.visualViewport?.height ?? 'n/a'} scrH:${window.screen.height}\n` +
      `navBottom:${navRect ? Math.round(navRect.bottom) : 'n/a'} gap:${navRect ? Math.round(window.innerHeight - navRect.bottom) : 'n/a'}\n` +
      `safeBottom:${getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')}`
  }
  // Polls rather than hooking into syncAppHeight itself: it reads knownHeight
  // and the live DOM/window state directly, so it reflects every update
  // regardless of which listener triggered it.
  setInterval(renderDebug, 500)
  renderDebug()
}

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
