import { useState } from 'react'
import HoldButton from './HoldButton'
import './SetRow.css'

function EditableValue({ value, onSet }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

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
        className="stepper-input"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        autoFocus
      />
    )
  }
  return (
    <span className="stepper-value stepper-value--tap" onClick={startEdit}>
      {value}
    </span>
  )
}

function Stepper({ label, value, onDec, onInc, onSet, useHold = false, min = 0 }) {
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        {useHold ? (
          <HoldButton className="stepper-btn" onTap={onDec} disabled={value <= min} aria-label={`Decrease ${label}`}>−</HoldButton>
        ) : (
          <button className="stepper-btn" onClick={onDec} disabled={value <= min} aria-label={`Decrease ${label}`}>−</button>
        )}
        <EditableValue value={value} onSet={onSet} />
        {useHold ? (
          <HoldButton className="stepper-btn" onTap={onInc} aria-label={`Increase ${label}`}>+</HoldButton>
        ) : (
          <button className="stepper-btn" onClick={onInc} aria-label={`Increase ${label}`}>+</button>
        )}
      </div>
    </div>
  )
}

export default function SetRow({ set, index, onChange, onRemove, isCardio }) {
  function update(field, value) {
    onChange({ ...set, [field]: Math.max(0, value) })
  }

  return (
    <div className="set-row">
      <span className="set-index">{index + 1}</span>

      {isCardio ? (
        <Stepper
          label="min"
          value={set.reps}
          onDec={() => update('reps', set.reps - 1)}
          onInc={() => update('reps', set.reps + 1)}
          onSet={v => update('reps', v)}
        />
      ) : (
        <>
          <Stepper
            label="reps"
            value={set.reps}
            onDec={() => update('reps', set.reps - 1)}
            onInc={() => update('reps', set.reps + 1)}
            onSet={v => update('reps', v)}
          />
          <Stepper
            label="lbs"
            value={set.weight}
            useHold
            onDec={() => update('weight', set.weight - 1)}
            onInc={() => update('weight', set.weight + 1)}
            onSet={v => update('weight', v)}
          />
        </>
      )}

      <button className="set-remove-btn" onClick={onRemove} aria-label="Remove set">
        ✕
      </button>
    </div>
  )
}
