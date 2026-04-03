import { useState, useRef } from 'react'
import HoldButton from './HoldButton'
import './SessionSetRow.css'

function EditableValue({ value, onSet, disabled }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (disabled) {
    return <span className="ssr-value">{value}</span>
  }

  function startEdit() {
    setDraft(String(value))
    setEditing(true)
  }

  function commit() {
    const n = parseInt(draft, 10)
    if (!isNaN(n) && n >= 0) onSet(n)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        type="number"
        inputMode="numeric"
        className="ssr-input"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        autoFocus
        onFocus={e => e.target.select()}
      />
    )
  }
  return (
    <span className="ssr-value ssr-value--tap" onClick={startEdit}>
      {value}
    </span>
  )
}

export default function SessionSetRow({ set, index, onChange, onComplete, onRescind, controllerSide, isCardio, cardioUnit, isStretch, unit, editMode, isActive, currentPR, prType = 'weight' }) {
  const [burst, setBurst] = useState(false)
  const rowRef = useRef(null)
  const leftHand  = controllerSide === 'left'
  const distUnit  = unit === 'kg' ? 'km' : 'mi'
  const isDistance = isCardio && cardioUnit === 'distance'
  const isBoth    = isCardio && cardioUnit === 'both'

  const dispWeight = unit === 'kg' ? Math.round(set.weight / 2.2046) : set.weight
  const dispDist   = unit === 'kg' ? Math.round(set.weight * 1.60934) : set.weight
  function storeWeight(v) { update('weight', unit === 'kg' ? Math.round(v * 2.2046) : v) }
  function storeDist(v)   { update('weight', unit === 'kg' ? Math.round(v / 1.60934) : v) }

  function update(field, value) {
    if (set.completed) return
    onChange({ ...set, [field]: Math.max(0, value) })
  }

  function handleComplete() {
    if (set.completed) {
      onRescind?.()
      return
    }
    navigator.vibrate?.([10, 30, 20])
    setBurst(true)
    setTimeout(() => setBurst(false), 600)
    onComplete(set)
  }

  const locked = !editMode
  const isPRPending = !set.completed && (
    prType === 'reps'
      ? set.reps > 0 && set.reps > currentPR
      : set.weight > 0 && set.weight > currentPR
  )

  const circleContent = set.completed
    ? <span className={`ssr-check${set.isPR ? ' ssr-check--pr' : ''}`}>✓</span>
    : <span className={`ssr-circle${isPRPending ? ' ssr-circle--pr-pending' : ''}`} />

  // In locked mode: whole row is the tap target; indicator is non-interactive
  // In edit mode: dedicated circle button with its own click handler
  const completeIndicator = locked ? (
    <div className={`ssr-complete-btn${set.completed ? ' ssr-complete-btn--undo' : ''}${isPRPending ? ' ssr-complete-btn--pr-pending' : ''}`}>
      {circleContent}
    </div>
  ) : (
    <button
      className={`ssr-complete-btn${set.completed ? ' ssr-complete-btn--undo' : ''}${isPRPending ? ' ssr-complete-btn--pr-pending' : ''}`}
      onClick={handleComplete}
      aria-label={set.completed ? 'Undo complete' : 'Mark complete'}
    >
      {circleContent}
    </button>
  )

  return (
    <div
      ref={rowRef}
      className={`ssr ${set.completed ? 'ssr--done' : ''} ${set.isPR ? 'ssr--pr' : ''} ${set.isBonus ? 'ssr--bonus' : ''} ${burst ? 'ssr--burst' : ''} ${locked ? 'ssr--locked' : ''} ${isActive && !set.completed ? 'ssr--active' : ''}`}
      onClick={locked ? handleComplete : undefined}
    >
      {leftHand && completeIndicator}
      <span className="ssr-index">{set.isBonus ? '+' : index + 1}</span>

      {isStretch ? (
        <div className="ssr-stepper">
          <span className="ssr-stepper-label">sec</span>
          <div className="ssr-stepper-controls">
            <button className="ssr-step-btn" onClick={() => update('reps', Math.max(5, set.reps - 5))} disabled={set.completed}>−</button>
            <EditableValue value={set.reps} onSet={v => update('reps', v)} disabled={set.completed || locked} />
            <button className="ssr-step-btn" onClick={() => update('reps', set.reps + 5)} disabled={set.completed}>+</button>
          </div>
        </div>
      ) : isBoth ? (
        <>
          <div className="ssr-stepper">
            <span className="ssr-stepper-label">{distUnit}</span>
            <div className="ssr-stepper-controls">
              <button className="ssr-step-btn" onClick={() => storeDist(dispDist - 1)} disabled={set.completed}>−</button>
              <EditableValue value={dispDist} onSet={v => storeDist(v)} disabled={set.completed || locked} />
              <button className="ssr-step-btn" onClick={() => storeDist(dispDist + 1)} disabled={set.completed}>+</button>
            </div>
          </div>
          <div className="ssr-stepper">
            <span className="ssr-stepper-label">min</span>
            <div className="ssr-stepper-controls">
              <button className="ssr-step-btn" onClick={() => update('reps', set.reps - 1)} disabled={set.completed}>−</button>
              <EditableValue value={set.reps} onSet={v => update('reps', v)} disabled={set.completed || locked} />
              <button className="ssr-step-btn" onClick={() => update('reps', set.reps + 1)} disabled={set.completed}>+</button>
            </div>
          </div>
        </>
      ) : isCardio ? (
        <div className="ssr-stepper">
          <span className="ssr-stepper-label">{isDistance ? distUnit : 'min'}</span>
          <div className="ssr-stepper-controls">
            <button className="ssr-step-btn" onClick={() => isDistance ? storeDist(dispDist - 1) : update('reps', set.reps - 1)} disabled={set.completed}>−</button>
            <EditableValue value={isDistance ? dispDist : set.reps} onSet={v => isDistance ? storeDist(v) : update('reps', v)} disabled={set.completed || locked} />
            <button className="ssr-step-btn" onClick={() => isDistance ? storeDist(dispDist + 1) : update('reps', set.reps + 1)} disabled={set.completed}>+</button>
          </div>
        </div>
      ) : (
        <>
          <div className={`ssr-stepper${isPRPending && prType === 'reps' ? ' ssr-stepper--pr' : ''}`}>
            <span className="ssr-stepper-label">reps</span>
            <div className="ssr-stepper-controls">
              <button className="ssr-step-btn" onClick={() => update('reps', set.reps - 1)} disabled={set.completed}>−</button>
              <EditableValue value={set.reps} onSet={v => update('reps', v)} disabled={set.completed || locked} />
              <button className="ssr-step-btn" onClick={() => update('reps', set.reps + 1)} disabled={set.completed}>+</button>
            </div>
          </div>
          <div className={`ssr-stepper${isPRPending && prType === 'weight' ? ' ssr-stepper--pr' : ''}`}>
            <span className="ssr-stepper-label">{unit === 'kg' ? 'kg' : 'lbs'}</span>
            <div className="ssr-stepper-controls">
              <HoldButton className="ssr-step-btn" onTap={() => storeWeight(dispWeight - 1)} disabled={set.completed}>−</HoldButton>
              <EditableValue value={dispWeight} onSet={v => storeWeight(v)} disabled={set.completed || locked} />
              <HoldButton className="ssr-step-btn" onTap={() => storeWeight(dispWeight + 1)} disabled={set.completed}>+</HoldButton>
            </div>
          </div>
        </>
      )}

      {!leftHand && completeIndicator}
      {set.isPR && <span className="ssr-pr-badge">PR 🏆</span>}
    </div>
  )
}
