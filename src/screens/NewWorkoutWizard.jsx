import { useState } from 'react'
import { defaultExercises, CATEGORIES } from '../data/exerciseLibrary'
import { getCachedCustomExercises } from '../storage'
import { createTemplateExercise, createSet } from '../data/models'
import './NewWorkoutWizard.css'

const DEFAULT_SETS   = 3
const DEFAULT_REPS   = 10
const DEFAULT_WEIGHT = 0

function WizardField({ label, value, onDecrement, onIncrement, onChange, min = 0 }) {
  return (
    <div className="wiz-field">
      <div className="wiz-field-label">{label}</div>
      <div className="wiz-stepper">
        <button
          className="wiz-stepper-btn"
          onClick={onDecrement}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >−</button>
        <input
          className="wiz-stepper-input"
          type="number"
          value={value}
          inputMode="numeric"
          onChange={e => {
            const n = parseFloat(e.target.value)
            if (!isNaN(n) && n >= min) onChange(n)
          }}
          onFocus={e => e.target.select()}
        />
        <button
          className="wiz-stepper-btn"
          onClick={onIncrement}
          aria-label={`Increase ${label}`}
        >+</button>
      </div>
    </div>
  )
}

export default function NewWorkoutWizard({ onComplete, onBack, unit }) {
  const [step,           setStep]           = useState(1)
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedIds,    setSelectedIds]    = useState([])
  // { exerciseId: { sets, reps, weight } }
  const [configs,        setConfigs]        = useState({})

  const weightStep = unit === 'kg' ? 2.5 : 5

  const allExercises = [...defaultExercises, ...getCachedCustomExercises()]
  const filtered = activeCategory === 'All'
    ? allExercises
    : allExercises.filter(e => e.category === activeCategory)

  function toggleExercise(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function goToConfig() {
    setConfigs(prev => {
      const next = { ...prev }
      for (const id of selectedIds) {
        if (!next[id]) {
          next[id] = { sets: DEFAULT_SETS, reps: DEFAULT_REPS, weight: DEFAULT_WEIGHT }
        }
      }
      return next
    })
    setStep(2)
  }

  function updateConfig(id, field, delta) {
    setConfigs(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: Math.max(0, +(prev[id]?.[field] ?? 0) + delta),
      },
    }))
  }

  function setConfigValue(id, field, value) {
    setConfigs(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  function handleFinish() {
    const exercises = selectedIds.map(id => {
      const cfg = configs[id] ?? { sets: DEFAULT_SETS, reps: DEFAULT_REPS, weight: DEFAULT_WEIGHT }
      const sets = Array.from({ length: Math.max(1, cfg.sets) }, () =>
        createSet({ reps: cfg.reps, weight: cfg.weight })
      )
      return { ...createTemplateExercise({ exerciseId: id, sets }), notes: '' }
    })
    onComplete(exercises)
  }

  /* ── Step 1: Pick exercises ─────────────────────────────────────────── */
  if (step === 1) {
    return (
      <div className="wiz">
        <div className="wiz-header">
          <button className="wiz-back" onClick={onBack} aria-label="Cancel">‹</button>
          <h2 className="wiz-title">New Workout</h2>
          <div className="wiz-header-spacer" />
        </div>

        <div className="wiz-step-bar">
          <div className="wiz-step-dot wiz-step-dot--active" />
          <div className="wiz-step-line" />
          <div className="wiz-step-dot" />
        </div>
        <p className="wiz-step-label">Step 1 of 2 — Select exercises</p>

        {/* Category filter tabs */}
        <div className="wiz-categories">
          {['All', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              className={`wiz-cat-tab ${activeCategory === cat ? 'wiz-cat-tab--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Exercise pills */}
        <div className="wiz-exercise-area">
          <div className="wiz-exercise-grid">
            {filtered.map(e => (
              <button
                key={e.id}
                className={`wiz-ex-pill ${selectedIds.includes(e.id) ? 'wiz-ex-pill--active' : ''}`}
                onClick={() => toggleExercise(e.id)}
              >
                {e.name}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="wiz-footer">
          <p className="wiz-count-label">
            {selectedIds.length === 0
              ? 'Select exercises to continue'
              : `${selectedIds.length} exercise${selectedIds.length === 1 ? '' : 's'} selected`}
          </p>
          <button
            className="wiz-primary-btn"
            onClick={goToConfig}
            disabled={selectedIds.length === 0}
          >
            Continue →
          </button>
        </div>
      </div>
    )
  }

  /* ── Step 2: Configure all exercises (scrollable list) ──────────────── */
  return (
    <div className="wiz">
      <div className="wiz-header">
        <button className="wiz-back" onClick={() => setStep(1)} aria-label="Back to selection">‹</button>
        <h2 className="wiz-title">Set defaults</h2>
        <div className="wiz-header-spacer" />
      </div>

      <div className="wiz-step-bar">
        <div className="wiz-step-dot wiz-step-dot--done" />
        <div className="wiz-step-line wiz-step-line--done" />
        <div className="wiz-step-dot wiz-step-dot--active" />
      </div>
      <p className="wiz-step-label">Step 2 of 2 — Set defaults for each exercise</p>

      <div className="wiz-config-list">
        {selectedIds.map(id => {
          const ex       = allExercises.find(e => e.id === id)
          const cfg      = configs[id] ?? { sets: DEFAULT_SETS, reps: DEFAULT_REPS, weight: DEFAULT_WEIGHT }
          const isCardio  = ex?.category === 'Cardio'
          const isStretch = ex?.category === 'Stretch' || ex?.isTimed

          return (
            <div className="wiz-config-row" key={id}>
              <div className="wiz-config-row-info">
                <span className="wiz-config-row-cat">{ex?.category}</span>
                <span className="wiz-config-row-name">{ex?.name}</span>
              </div>

              <div className="wiz-fields">
                <WizardField
                  label="Sets"
                  value={cfg.sets}
                  min={1}
                  onDecrement={() => updateConfig(id, 'sets', -1)}
                  onIncrement={() => updateConfig(id, 'sets', 1)}
                  onChange={v => setConfigValue(id, 'sets', v)}
                />
                {isCardio ? (
                  <WizardField
                    label="Min"
                    value={cfg.reps}
                    min={0}
                    onDecrement={() => updateConfig(id, 'reps', -1)}
                    onIncrement={() => updateConfig(id, 'reps', 1)}
                    onChange={v => setConfigValue(id, 'reps', v)}
                  />
                ) : isStretch ? (
                  <WizardField
                    label="Sec"
                    value={cfg.reps}
                    min={0}
                    onDecrement={() => updateConfig(id, 'reps', -5)}
                    onIncrement={() => updateConfig(id, 'reps', 5)}
                    onChange={v => setConfigValue(id, 'reps', v)}
                  />
                ) : (
                  <>
                    <WizardField
                      label="Reps"
                      value={cfg.reps}
                      min={0}
                      onDecrement={() => updateConfig(id, 'reps', -1)}
                      onIncrement={() => updateConfig(id, 'reps', 1)}
                      onChange={v => setConfigValue(id, 'reps', v)}
                    />
                    <WizardField
                      label={unit === 'kg' ? 'kg' : 'lbs'}
                      value={cfg.weight}
                      min={0}
                      onDecrement={() => updateConfig(id, 'weight', -weightStep)}
                      onIncrement={() => updateConfig(id, 'weight', weightStep)}
                      onChange={v => setConfigValue(id, 'weight', v)}
                    />
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="wiz-footer">
        <button className="wiz-primary-btn" onClick={handleFinish}>
          Finish
        </button>
      </div>
    </div>
  )
}
