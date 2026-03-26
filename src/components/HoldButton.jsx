import { useRef } from 'react'

/**
 * A button that fires onTap once on click,
 * then fires rapidly on sustained hold (long-press acceleration).
 */
export default function HoldButton({ onTap, children, disabled, className, 'aria-label': ariaLabel }) {
  const intervalRef = useRef(null)
  const phase1Ref  = useRef(null)
  const phase2Ref  = useRef(null)

  function startHold() {
    if (disabled) return
    onTap()
    // Phase 1: start rapid fire after 400ms hold
    phase1Ref.current = setTimeout(() => {
      intervalRef.current = setInterval(onTap, 80)
      // Phase 2: accelerate after another 1s of holding
      phase2Ref.current = setTimeout(() => {
        clearInterval(intervalRef.current)
        intervalRef.current = setInterval(onTap, 40)
      }, 1000)
    }, 400)
  }

  function stopHold() {
    clearTimeout(phase1Ref.current)
    clearTimeout(phase2Ref.current)
    clearInterval(intervalRef.current)
    phase1Ref.current = null
    phase2Ref.current = null
    intervalRef.current = null
  }

  return (
    <button
      className={className}
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={startHold}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
    >
      {children}
    </button>
  )
}
