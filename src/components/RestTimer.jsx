import { useState, useEffect, useRef } from 'react'
import { playTick } from '../utils/sound'
import { REST_OPTIONS } from '../data/models'
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
// showFinish/onFinish surface a "Finish Workout" action instead of just
// Skip, for when this rest period follows the last set of the workout.
// minimized/onExpand/onMinimize drive one persistent element that morphs
// between a centered modal and a top-docked ribbon (see .rest-timer /
// .rest-timer--minimized in the CSS) rather than swapping between two
// different elements — the countdown state below is unaffected either way.
// restTimerDuration/onChangeRestTimerDuration let the countdown digits open
// an inline picker for the *default* rest length going forward — this never
// retroactively changes the rest period already in progress.
export default function RestTimer({ duration, onDone, onSkip, showFinish, onFinish, minimized, onExpand, onMinimize, restTimerDuration, onChangeRestTimerDuration }) {
  const endAtRef = useRef(Date.now() + duration * 1000)
  const [remaining, setRemaining] = useState(duration)
  const tickedRef = useRef(new Set())
  const rootRef = useRef(null)
  const [editingDuration, setEditingDuration] = useState(false)

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

  // While expanded, a tap or a scroll anywhere outside the modal minimizes it
  // instead of requiring a dedicated backdrop tap — the backdrop is now
  // purely a visual dim (pointer-events: none in the CSS) so the page
  // underneath stays genuinely scrollable/tappable while the timer is up.
  //
  // The outside tap that dismisses the modal must not ALSO reach whatever
  // was underneath it (a set's checkmark, a button, ...) — that first tap
  // is spent just leaving the modal, nothing else. Listening on 'click' in
  // the capture phase (rather than 'pointerdown') and calling
  // stopPropagation lets us consume that exact click before it ever
  // dispatches to the element the backdrop's pointer-events: none exposed
  // underneath — a subsequent tap then reaches the app normally.
  useEffect(() => {
    if (minimized || !onMinimize) return
    function handleOutsideClick(e) {
      if (!rootRef.current?.contains(e.target)) {
        e.preventDefault()
        e.stopPropagation()
        onMinimize()
      }
    }
    function handleScroll(e) {
      if (!rootRef.current?.contains(e.target)) onMinimize()
    }
    document.addEventListener('click', handleOutsideClick, true)
    // capture: true so this also catches scrolls on nested scroll containers
    // (like .app-main), which don't bubble as regular 'scroll' events.
    document.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('click', handleOutsideClick, true)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [minimized, onMinimize])

  // The picker only makes sense in the full modal — collapsing to the
  // ribbon (or the countdown finishing) closes it.
  useEffect(() => {
    if (minimized) setEditingDuration(false)
  }, [minimized])

  const progress = duration > 0 ? remaining / duration : 0
  const circumference = 2 * Math.PI * 52
  const dashOffset = circumference * progress

  return (
    <div
      ref={rootRef}
      className={`rest-timer ${minimized ? 'rest-timer--minimized' : ''}`}
      onClick={minimized ? onExpand : undefined}
      role={minimized ? 'button' : undefined}
      tabIndex={minimized ? 0 : undefined}
    >
      {minimized ? (
        <div className="rest-ribbon-inner">
          <div className="rest-ribbon-fill" style={{ width: `${(1 - progress) * 100}%` }} />
          <span className="rest-ribbon-time">{fmt(remaining)}</span>
          <span className="rest-ribbon-label">{showFinish ? 'All sets complete — tap to finish' : 'Resting — tap to expand'}</span>
          <button
            className="rest-ribbon-skip"
            onClick={e => { e.stopPropagation(); onSkip() }}
            aria-label={showFinish ? 'Dismiss' : 'Skip rest'}
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="rest-timer-inner">
          <p className="rest-label">Rest</p>
          {editingDuration ? (
            <div className="rest-duration-picker">
              <p className="rest-duration-picker-label">Default rest length</p>
              <div className="rest-duration-options">
                {REST_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`rest-duration-opt ${restTimerDuration === opt.value ? 'rest-duration-opt--active' : ''}`}
                    onClick={() => {
                      onChangeRestTimerDuration?.(opt.value)
                      setEditingDuration(false)
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button className="rest-skip-btn rest-skip-btn--secondary" onClick={() => setEditingDuration(false)}>Cancel</button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="rest-ring-wrap"
                onClick={() => onChangeRestTimerDuration && setEditingDuration(true)}
                disabled={!onChangeRestTimerDuration}
                aria-label="Change default rest length"
              >
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
              </button>
              {showFinish ? (
                <>
                  <p className="rest-all-done">All sets complete!</p>
                  <button className="rest-finish-btn" onClick={onFinish}>Finish Workout</button>
                  <button className="rest-skip-btn rest-skip-btn--secondary" onClick={onSkip}>Not yet</button>
                </>
              ) : (
                <button className="rest-skip-btn" onClick={onSkip}>Skip</button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
