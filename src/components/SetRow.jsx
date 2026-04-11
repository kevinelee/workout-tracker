import { useState } from 'react'
import HoldButton from './HoldButton'
import './SetRow.css'

function EditableValue({ value, onSet, decimal = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function startEdit() {
    setDraft(value === 0 ? '' : String(value))
    setEditing(true)
  }

  function commit() {
    const n = decimal ? parseFloat(draft) : parseInt(draft, 10)
    onSet(!isNaN(n) && n >= 0 ? n : 0)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        type="number"
        inputMode={decimal ? 'decimal' : 'numeric'}
        className="stepper-input"
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
    <span className="stepper-value stepper-value--tap" onClick={startEdit}>
      {value}
    </span>
  )
}

function Stepper({ label, value, onDec, onInc, onSet, useHold = false, min = 0, max, decimal = false }) {
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        {useHold ? (
          <HoldButton className="stepper-btn" onTap={onDec} disabled={value <= min} aria-label={`Decrease ${label}`}>−</HoldButton>
        ) : (
          <button className="stepper-btn" onClick={onDec} disabled={value <= min} aria-label={`Decrease ${label}`}>−</button>
        )}
        <EditableValue value={value} onSet={onSet} decimal={decimal} />
        {useHold ? (
          <HoldButton className="stepper-btn" onTap={onInc} disabled={max !== undefined && value >= max} aria-label={`Increase ${label}`}>+</HoldButton>
        ) : (
          <button className="stepper-btn" onClick={onInc} disabled={max !== undefined && value >= max} aria-label={`Increase ${label}`}>+</button>
        )}
      </div>
    </div>
  )
}

export default function SetRow({ set, index, onChange, onRemove, isCardio, cardioUnit, isStretch, unit }) {
  const isDistance = isCardio && cardioUnit === 'distance'
  const isBoth     = isCardio && cardioUnit === 'both'
  const distLabel  = unit === 'kg' ? 'km' : 'mi'

  // Values are stored in canonical imperial units (lbs / miles).
  // Convert to/from display units at the component boundary.
  const dispWeight = unit === 'kg' ? Math.round(set.weight / 2.2046) : set.weight
  const dispDist   = unit === 'kg' ? Math.round(set.weight * 1.60934 * 10) / 10 : set.weight
  function storeWeight(v) { update('weight', unit === 'kg' ? Math.round(v * 2.2046) : v) }
  function storeDist(v)   { update('weight', unit === 'kg' ? parseFloat((v / 1.60934).toFixed(3)) : v) }
  function updateSecs(v)  { update('secs', Math.max(0, Math.min(59, Math.round(v)))) }

  function update(field, value) {
    onChange({ ...set, [field]: Math.max(0, value) })
  }

  return (
    <div className={`set-row${isBoth ? ' set-row--compact' : ''}`}>
      <span className="set-index">{index + 1}</span>

      {isStretch ? (
        <Stepper
          label="sec"
          value={set.reps}
          onDec={() => update('reps', set.reps - 5)}
          onInc={() => update('reps', set.reps + 5)}
          onSet={v => update('reps', v)}
          min={5}
        />
      ) : isBoth ? (
        <>
          <Stepper
            label={distLabel}
            value={dispDist}
            onDec={() => storeDist(Math.round((dispDist - 0.1) * 10) / 10)}
            onInc={() => storeDist(Math.round((dispDist + 0.1) * 10) / 10)}
            onSet={v => storeDist(v)}
            decimal
          />
          <Stepper
            label="min"
            value={set.reps}
            onDec={() => update('reps', set.reps - 1)}
            onInc={() => update('reps', set.reps + 1)}
            onSet={v => update('reps', v)}
          />
          <Stepper
            label="sec"
            value={set.secs ?? 0}
            onDec={() => updateSecs((set.secs ?? 0) - 5)}
            onInc={() => updateSecs((set.secs ?? 0) + 5)}
            onSet={updateSecs}
            max={59}
          />
        </>
      ) : isCardio ? (
        isDistance ? (
          <Stepper
            label={distLabel}
            value={dispDist}
            onDec={() => storeDist(Math.round((dispDist - 0.1) * 10) / 10)}
            onInc={() => storeDist(Math.round((dispDist + 0.1) * 10) / 10)}
            onSet={v => storeDist(v)}
            decimal
          />
        ) : (
          <>
            <Stepper
              label="min"
              value={set.reps}
              onDec={() => update('reps', set.reps - 1)}
              onInc={() => update('reps', set.reps + 1)}
              onSet={v => update('reps', v)}
            />
            <Stepper
              label="sec"
              value={set.secs ?? 0}
              onDec={() => updateSecs((set.secs ?? 0) - 5)}
              onInc={() => updateSecs((set.secs ?? 0) + 5)}
              onSet={updateSecs}
              max={59}
            />
          </>
        )
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
            label={unit === 'kg' ? 'kg' : 'lbs'}
            value={dispWeight}
            useHold
            onDec={() => storeWeight(dispWeight - 1)}
            onInc={() => storeWeight(dispWeight + 1)}
            onSet={v => storeWeight(v)}
          />
        </>
      )}

      <button className="set-remove-btn" onClick={onRemove} aria-label="Remove set">
        ✕
      </button>
    </div>
  )
}
