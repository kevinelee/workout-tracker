import { useState, useEffect, useRef } from 'react'
import './RestTimer.css'

function fmt(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// duration = total seconds for this rest period
export default function RestTimer({ duration, onDone, onSkip }) {
  const endAtRef = useRef(Date.now() + duration * 1000)
  const [remaining, setRemaining] = useState(duration)

  useEffect(() => {
    function tick() {
      const r = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000))
      setRemaining(r)
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
  const circumference = 2 * Math.PI * 38
  const dashOffset = circumference * progress

  return (
    <div className="rest-timer">
      <div className="rest-timer-inner">
        <div className="rest-ring-wrap">
          <svg className="rest-ring" viewBox="0 0 88 88">
            <circle className="rest-ring-track" cx="44" cy="44" r="38" />
            <circle
              className="rest-ring-fill"
              cx="44" cy="44" r="38"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <span className="rest-countdown">{fmt(remaining)}</span>
        </div>
        <p className="rest-label">Rest</p>
        <button className="rest-skip-btn" onClick={onSkip}>Skip →</button>
      </div>
    </div>
  )
}
