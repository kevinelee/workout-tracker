import { useState, useEffect } from 'react'
import './RestBadge.css'

function fmt(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Compact, icon-sized stand-in for the full rest timer, shown in the app
// header whenever a rest period is running but the user has navigated away
// from the session screen (which owns the full modal/ribbon timer). Ticks
// its own countdown from the persisted endAt rather than App re-rendering
// every second.
export default function RestBadge({ endAt, onClick }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((endAt - Date.now()) / 1000)))

  useEffect(() => {
    function tick() {
      setRemaining(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endAt])

  return (
    <button type="button" className="app-rest-badge" onClick={onClick} aria-label={`Resting, ${fmt(remaining)} left — tap to return to workout`}>
      <svg className="app-rest-badge-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7.5" />
        <path d="M10 6.5v3.5l2.5 1.5" />
      </svg>
      <span className="app-rest-badge-time">{fmt(remaining)}</span>
    </button>
  )
}
