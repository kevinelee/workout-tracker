import { useState } from 'react'
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
      />
    )
  }
  return (
    <span className="ssr-value ssr-value--tap" onClick={startEdit}>
      {value}
    </span>
  )
}

export default function SessionSetRow({ set, index, onChange, onComplete, controllerSide, isCardio }) {
  const leftHand = controllerSide === 'left'

  function update(field, value) {
    if (set.completed) return
    onChange({ ...set, [field]: Math.max(0, value) })
  }

  const completeBtn = (
    <button
      className="ssr-complete-btn"
      onClick={() => onComplete(set)}
      aria-label={set.completed ? 'Completed' : 'Mark complete'}
    >
      {set.completed ? <span className="ssr-check">✓</span> : <span className="ssr-circle" />}
    </button>
  )

  return (
    <div className={`ssr ${set.completed ? 'ssr--done' : ''} ${set.isPR ? 'ssr--pr' : ''}`}>
      {leftHand && completeBtn}
      <span className="ssr-index">{index + 1}</span>

      {isCardio ? (
        /* Cardio: single duration stepper (minutes stored in reps) */
        <div className="ssr-stepper">
          <span className="ssr-stepper-label">min</span>
          <div className="ssr-stepper-controls">
            <button className="ssr-step-btn" onClick={() => update('reps', set.reps - 1)} disabled={set.completed}>−</button>
            <EditableValue value={set.reps} onSet={v => update('reps', v)} disabled={set.completed} />
            <button className="ssr-step-btn" onClick={() => update('reps', set.reps + 1)} disabled={set.completed}>+</button>
          </div>
        </div>
      ) : (
        <>
          {/* Reps */}
          <div className="ssr-stepper">
            <span className="ssr-stepper-label">reps</span>
            <div className="ssr-stepper-controls">
              <button className="ssr-step-btn" onClick={() => update('reps', set.reps - 1)} disabled={set.completed}>−</button>
              <EditableValue value={set.reps} onSet={v => update('reps', v)} disabled={set.completed} />
              <button className="ssr-step-btn" onClick={() => update('reps', set.reps + 1)} disabled={set.completed}>+</button>
            </div>
          </div>

          {/* Weight */}
          <div className="ssr-stepper">
            <span className="ssr-stepper-label">lbs</span>
            <div className="ssr-stepper-controls">
              <HoldButton className="ssr-step-btn" onTap={() => update('weight', set.weight - 1)} disabled={set.completed}>−</HoldButton>
              <EditableValue value={set.weight} onSet={v => update('weight', v)} disabled={set.completed} />
              <HoldButton className="ssr-step-btn" onTap={() => update('weight', set.weight + 1)} disabled={set.completed}>+</HoldButton>
            </div>
          </div>
        </>
      )}

      {!leftHand && completeBtn}
      {set.isPR && <span className="ssr-pr-badge">PR 🏆</span>}
    </div>
  )
}
