import { useState, useEffect, useRef } from 'react'
import { playTick } from '../utils/sound'
import './RestTimer.css'

// Seconds-remaining values that get an audible tick during the countdown,
// not just the final chime at 0.
const TICK_THRESHOLDS = new Set([3, 2, 1])

function fmt(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// duration = total seconds for this rest period
export default function RestTimer({ duration, onDone, onSkip }) {
  const endAtRef = useRef(Date.now() + duration * 1000)
  const [remaining, setRemaining] = useState(duration)
  const tickedRef = useRef(new Set())

  useEffect(() => {
    function tick() {
      const r = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000))
      setRemaining(r)
      if (TICK_THRESHOLDS.has(r) && !tickedRef.current.has(r)) {
        tickedRef.current.add(r)
        playTick()
      }
      if (r <= 0) onDone()
    }

    tick() // immediate snapshot on mount
    const id = setInterval(tick, 500) // poll every 500 ms so drift is at most 0.5 s

    function onVisible() {
      if (document.visibilityState === 'visible') tick() // snap immediately on resume
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const progress = duration > 0 ? remaining / duration : 0
  const circumference = 2 * Math.PI * 52
  const dashOffset = circumference * progress

  return (
    <div className="rest-timer">
      <div className="rest-timer-inner">
        <p className="rest-label">Rest</p>
        <div className="rest-ring-wrap">
          <svg className="rest-ring" viewBox="0 0 120 120">
            <circle className="rest-ring-track" cx="60" cy="60" r="52" />
            <circle
              className="rest-ring-fill"
              cx="60" cy="60" r="52"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <span className="rest-countdown">{fmt(remaining)}</span>
        </div>
        <button className="rest-skip-btn" onClick={onSkip}>Skip</button>
      </div>
    </div>
  )
}
