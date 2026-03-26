import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
    <App />
  </StrictMode>,
)
