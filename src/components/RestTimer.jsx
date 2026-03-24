import { useEffect } from 'react'
import './RestTimer.css'

function fmt(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function RestTimer({ seconds, total, onSkip, onTick }) {
  useEffect(() => {
    if (seconds <= 0) { onSkip(); return }
    const id = setTimeout(() => onTick(seconds - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])

  const progress = total > 0 ? seconds / total : 0
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
          <span className="rest-countdown">{fmt(seconds)}</span>
        </div>
        <p className="rest-label">Rest</p>
        <button className="rest-skip-btn" onClick={onSkip}>Skip →</button>
      </div>
    </div>
  )
}
