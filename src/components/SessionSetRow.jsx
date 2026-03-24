import './SessionSetRow.css'

export default function SessionSetRow({ set, index, onChange, onComplete }) {
  function update(field, delta) {
    if (set.completed) return
    const step = field === 'weight' ? 5 : 1
    onChange({ ...set, [field]: Math.max(0, set[field] + delta * step) })
  }

  return (
    <div className={`ssr ${set.completed ? 'ssr--done' : ''} ${set.isPR ? 'ssr--pr' : ''}`}>
      <span className="ssr-index">{index + 1}</span>

      {/* Reps */}
      <div className="ssr-stepper">
        <span className="ssr-stepper-label">reps</span>
        <div className="ssr-stepper-controls">
          <button className="ssr-step-btn" onClick={() => update('reps', -1)} disabled={set.completed}>−</button>
          <span className="ssr-value">{set.reps}</span>
          <button className="ssr-step-btn" onClick={() => update('reps', +1)} disabled={set.completed}>+</button>
        </div>
      </div>

      {/* Weight */}
      <div className="ssr-stepper">
        <span className="ssr-stepper-label">lbs</span>
        <div className="ssr-stepper-controls">
          <button className="ssr-step-btn" onClick={() => update('weight', -1)} disabled={set.completed}>−</button>
          <span className="ssr-value">{set.weight}</span>
          <button className="ssr-step-btn" onClick={() => update('weight', +1)} disabled={set.completed}>+</button>
        </div>
      </div>

      {/* Complete button */}
      <button
        className="ssr-complete-btn"
        onClick={() => onComplete(set)}
        aria-label={set.completed ? 'Completed' : 'Mark complete'}
      >
        {set.completed ? (
          <span className="ssr-check">✓</span>
        ) : (
          <span className="ssr-circle" />
        )}
      </button>

      {/* PR badge */}
      {set.isPR && <span className="ssr-pr-badge">PR 🏆</span>}
    </div>
  )
}
