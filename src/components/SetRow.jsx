import './SetRow.css'

function Stepper({ label, value, onDecrement, onIncrement, min = 0 }) {
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        <button
          className="stepper-btn"
          onClick={onDecrement}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >−</button>
        <span className="stepper-value">{value}</span>
        <button
          className="stepper-btn"
          onClick={onIncrement}
          aria-label={`Increase ${label}`}
        >+</button>
      </div>
    </div>
  )
}

export default function SetRow({ set, index, onChange, onRemove }) {
  function update(field, value) {
    onChange({ ...set, [field]: Math.max(0, value) })
  }

  return (
    <div className="set-row">
      <span className="set-index">{index + 1}</span>

      <Stepper
        label="reps"
        value={set.reps}
        onDecrement={() => update('reps', set.reps - 1)}
        onIncrement={() => update('reps', set.reps + 1)}
      />

      <Stepper
        label="lbs"
        value={set.weight}
        onDecrement={() => update('weight', set.weight - 5)}
        onIncrement={() => update('weight', set.weight + 5)}
      />

      <button className="set-remove-btn" onClick={onRemove} aria-label="Remove set">
        ✕
      </button>
    </div>
  )
}
