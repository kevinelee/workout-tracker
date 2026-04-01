import { useState } from 'react'
import { defaultExercises, CATEGORIES } from '../data/exerciseLibrary'
import { getCachedCustomExercises } from '../storage'
import { createTemplateExercise, createSet } from '../data/models'
import './NewWorkoutWizard.css'

const DEFAULT_SETS   = 3
const DEFAULT_REPS   = 10
const DEFAULT_WEIGHT = 0

function WizardField({ label, value, onDecrement, onIncrement, onChange, min = 0, step = 1 }) {
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
  const [configIndex,    setConfigIndex]    = useState(0)
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
    setConfigIndex(0)
    setStep(2)
  }

  function updateConfig(field, delta) {
    const id = selectedIds[configIndex]
    setConfigs(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: Math.max(0, +(prev[id][field] ?? 0) + delta),
      },
    }))
  }

  function setConfigValue(field, value) {
    const id = selectedIds[configIndex]
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

  const currentId      = selectedIds[configIndex]
  const currentEx      = allExercises.find(e => e.id === currentId)
  const currentConfig  = configs[currentId] ?? { sets: DEFAULT_SETS, reps: DEFAULT_REPS, weight: DEFAULT_WEIGHT }
  const isLast         = configIndex === selectedIds.length - 1
  const isCardio       = currentEx?.category === 'Cardio'
  const isStretch      = currentEx?.category === 'Stretch'

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

        {/* Category filter */}
        <div className="wiz-categories">
          {['All', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              className={`wiz-cat-pill ${activeCategory === cat ? 'wiz-cat-pill--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Exercise pills */}
        <div className="wiz-exercise-area">
          <div className="wiz-exercise-grid">
            {filtered.map(e => {
              const selected = selectedIds.includes(e.id)
              return (
                <button
                  key={e.id}
                  className={`wiz-ex-pill ${selected ? 'wiz-ex-pill--active' : ''}`}
                  onClick={() => toggleExercise(e.id)}
                >
                  {selected && <span className="wiz-check">✓</span>}
                  {e.name}
                </button>
              )
            })}
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

  /* ── Step 2: Configure each exercise ────────────────────────────────── */
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
      <p className="wiz-step-label">
        Step 2 of 2 — Exercise {configIndex + 1} of {selectedIds.length}
      </p>

      <div className="wiz-config-area">
        {/* Progress dots */}
        <div className="wiz-progress-dots">
          {selectedIds.map((_, i) => (
            <button
              key={i}
              className={`wiz-dot ${
                i === configIndex ? 'wiz-dot--active' : i < configIndex ? 'wiz-dot--done' : ''
              }`}
              onClick={() => setConfigIndex(i)}
              aria-label={`Go to exercise ${i + 1}`}
            />
          ))}
        </div>

        {/* Config card */}
        <div className="wiz-config-card">
          <p className="wiz-ex-category">{currentEx?.category}</p>
          <h3 className="wiz-ex-name">{currentEx?.name}</h3>

          <div className="wiz-fields">
            <WizardField
              label="Sets"
              value={currentConfig.sets}
              min={1}
              step={1}
              onDecrement={() => updateConfig('sets', -1)}
              onIncrement={() => updateConfig('sets', 1)}
              onChange={v => setConfigValue('sets', v)}
            />
            {isCardio ? (
              <WizardField
                label="Min"
                value={currentConfig.reps}
                min={0}
                step={1}
                onDecrement={() => updateConfig('reps', -1)}
                onIncrement={() => updateConfig('reps', 1)}
                onChange={v => setConfigValue('reps', v)}
              />
            ) : isStretch ? (
              <WizardField
                label="Sec"
                value={currentConfig.reps}
                min={0}
                step={5}
                onDecrement={() => updateConfig('reps', -5)}
                onIncrement={() => updateConfig('reps', 5)}
                onChange={v => setConfigValue('reps', v)}
              />
            ) : (
              <>
                <WizardField
                  label="Reps"
                  value={currentConfig.reps}
                  min={0}
                  step={1}
                  onDecrement={() => updateConfig('reps', -1)}
                  onIncrement={() => updateConfig('reps', 1)}
                  onChange={v => setConfigValue('reps', v)}
                />
                <WizardField
                  label={unit === 'kg' ? 'kg' : 'lbs'}
                  value={currentConfig.weight}
                  min={0}
                  step={weightStep}
                  onDecrement={() => updateConfig('weight', -weightStep)}
                  onIncrement={() => updateConfig('weight', weightStep)}
                  onChange={v => setConfigValue('weight', v)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="wiz-nav">
        <button
          className="wiz-ghost-btn"
          onClick={() => setConfigIndex(i => i - 1)}
          disabled={configIndex === 0}
        >
          ← Back
        </button>
        {isLast ? (
          <button className="wiz-primary-btn" onClick={handleFinish}>
            Finish
          </button>
        ) : (
          <button className="wiz-primary-btn" onClick={() => setConfigIndex(i => i + 1)}>
            Next →
          </button>
        )}
      </div>
    </div>
  )
}
