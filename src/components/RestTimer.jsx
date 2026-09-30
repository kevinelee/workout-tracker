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
// endAt (epoch ms) pins the countdown to the wall clock, so a remount — the
// session screen coming back from another tab — resumes it rather than
// starting the rest over.
// variant="express" expands to a full-screen takeover instead of the centered
// modal, with `preview` (what's coming next) under the ring and an explicit
// "Back to exercise" that minimizes — there's no "outside" to tap there.
// Express: how long the takeover takes to slide up and away (matches
// .rest-timer--leaving) before the bar takes its place.
const EXPRESS_EXIT_MS = 260

export default function RestTimer({ duration, endAt, onDone, onSkip, showFinish, onFinish, minimized, docked, onExpand, onMinimize, restTimerDuration, onChangeRestTimerDuration, variant = 'modal', preview }) {
  const express = variant === 'express'
  const endAtRef = useRef(endAt ?? Date.now() + duration * 1000)
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)))
  const tickedRef = useRef(new Set())
  const rootRef = useRef(null)
  const [editingDuration, setEditingDuration] = useState(false)
  // Express only: swiping up sends the full-screen timer back to the ribbon,
  // the same as "Back to exercise". dragY follows the finger while it moves.
  const swipeRef = useRef(null)
  const [dragY, setDragY] = useState(0)
  const swipeable = express && !minimized && !!onMinimize
  // Express: minimizing slides the takeover up and off the screen (the way
  // you swiped it), then the bar settles into its slot above Up next;
  // expanding again brings the takeover back down over it.
  const [leaving, setLeaving] = useState(false)
  const [fromBar, setFromBar] = useState(false)
  const [prevMinimized, setPrevMinimized] = useState(minimized)
  if (prevMinimized !== minimized) {
    setPrevMinimized(minimized)
    setLeaving(false)
    setDragY(0)
    setFromBar(!minimized)
  }

  const leaveTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(leaveTimerRef.current), [])

  function minimize() {
    if (!express) { onMinimize(); return }
    if (leaving) return
    setLeaving(true)
    leaveTimerRef.current = setTimeout(onMinimize, EXPRESS_EXIT_MS)
  }

  function handleTouchStart(e) {
    if (!swipeable || e.touches.length !== 1) return
    swipeRef.current = { y: e.touches[0].clientY, t: Date.now() }
  }

  function handleTouchMove(e) {
    if (!swipeRef.current) return
    const dy = e.touches[0].clientY - swipeRef.current.y
    // Follows the finger upward; pulling down just resists a little.
    setDragY(dy < 0 ? dy : dy / 4)
  }

  function handleTouchEnd(e) {
    if (!swipeRef.current) return
    const dy = e.changedTouches[0].clientY - swipeRef.current.y
    const velocity = dy / Math.max(1, Date.now() - swipeRef.current.t)
    swipeRef.current = null
    // A long drag or a quick flick both count — the content stays where the
    // finger left it and the whole screen carries on upward from there.
    if (dy < -80 || (dy < -30 && velocity < -0.5)) minimize()
    else setDragY(0)
  }

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
    // Express fills the screen, so there is no "outside" — and the one thing
    // floating above it is the Undo toast, which must get its tap.
    if (minimized || !onMinimize || express) return
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
  }, [minimized, onMinimize, express])

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
      className={[
        'rest-timer',
        minimized && 'rest-timer--minimized',
        express && 'rest-timer--xs',
        express && !minimized && 'rest-timer--express',
        express && !minimized && fromBar && 'rest-timer--from-bar',
        leaving && 'rest-timer--leaving',
        docked && 'rest-timer--docked',
      ].filter(Boolean).join(' ')}
      onClick={minimized ? onExpand : undefined}
      role={minimized ? 'button' : undefined}
      tabIndex={minimized ? 0 : undefined}
      onTouchStart={swipeable ? handleTouchStart : undefined}
      onTouchMove={swipeable ? handleTouchMove : undefined}
      onTouchEnd={swipeable ? handleTouchEnd : undefined}
      onTouchCancel={swipeable ? () => { swipeRef.current = null; setDragY(0) } : undefined}
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
        <div
          className={`rest-timer-inner${dragY ? ' rest-timer-inner--dragging' : ''}`}
          style={dragY ? { transform: `translateY(${dragY}px)`, opacity: Math.max(0.3, 1 + dragY / 300) } : undefined}
        >
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
              {express && preview && <div className="rest-preview">{preview}</div>}
              {showFinish ? (
                <>
                  <p className="rest-all-done">All sets complete!</p>
                  <button className="rest-finish-btn" onClick={onFinish}>Finish Workout</button>
                  <button className="rest-skip-btn rest-skip-btn--secondary" onClick={onSkip}>Not yet</button>
                </>
              ) : (
                <button className="rest-skip-btn" onClick={onSkip}>{express ? 'Skip rest' : 'Skip'}</button>
              )}
              {express && onMinimize && (
                <button className="rest-back-btn" onClick={minimize}>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="5 12 10 7 15 12" />
                  </svg>
                  Back to exercise
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
