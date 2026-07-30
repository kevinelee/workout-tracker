import { useState } from 'react'
import { defaultExercises } from '../data/exerciseLibrary'
import './GeneratePlanWizard.css'

const FOCUS_OPTIONS = [
  { label: 'Push', value: 'Push (chest, shoulders, triceps)' },
  { label: 'Pull', value: 'Pull (back, biceps)' },
  { label: 'Legs', value: 'Legs (quads, hamstrings, glutes)' },
  { label: 'Upper body', value: 'Upper body' },
  { label: 'Core', value: 'Core' },
  { label: 'Full body', value: 'Full body' },
  { label: 'Arms', value: 'Arms (biceps, triceps)' },
  { label: 'Cardio', value: 'Cardio' },
]

export default function GenerateWorkoutWizard({ onComplete, onBack, onGenerate }) {
  const [focus,              setFocus]              = useState([])
  const [loading,            setLoading]            = useState(false)
  const [error,              setError]              = useState(null)
  const [workout,            setWorkout]            = useState(null)
  const [name,               setName]               = useState('')
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  function toggleFocus(val) {
    setFocus(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const template = await onGenerate({ focus })
      if (!template) throw new Error('empty')
      setWorkout(template)
      setName(template.name ?? 'My Workout')
    } catch {
      setError('Could not generate your workout. Try again.')
      setLoading(false)
      return
    }
    setLoading(false)
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="gpw">
        <div className="gpw-generating">
          <div className="gpw-spinner" />
          <p className="gpw-generating-text">Building your workout…</p>
        </div>
      </div>
    )
  }

  // ── Preview ──────────────────────────────────────────────────────────────
  if (workout) {
    return (
      <div className="gpw">
        <div className="gpw-header">
          <button className="gpw-back" onClick={() => setShowDiscardConfirm(true)}>‹</button>
          <h2 className="gpw-title">Your Workout</h2>
          <div className="gpw-header-spacer" />
        </div>

        <div className="gpw-plan-hero">
          <div className="gpw-plan-check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 12 9 17 20 6" />
            </svg>
          </div>
          <p className="gpw-plan-sub">{workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''} ready</p>
        </div>

        <div className="gpw-workout-name-wrap">
          <label className="gpw-workout-name-label">Workout name</label>
          <input
            className="gpw-workout-name-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Workout name"
            maxLength={60}
          />
        </div>

        <div className="gpw-plan-list">
          {workout.exercises.map((ex, i) => {
            const def  = defaultExercises.find(e => e.id === ex.exerciseId)
            const sets = ex.sets?.length ?? 0
            const first = ex.sets?.[0]
            const meta = first?.reps > 0
              ? `${sets} × ${first.reps} reps`
              : `${sets} set${sets !== 1 ? 's' : ''}`
            return (
              <div key={i} className="gpw-plan-card">
                <div className="gpw-plan-card-num">{i + 1}</div>
                <div className="gpw-plan-card-body">
                  <p className="gpw-plan-card-name">{def?.name ?? ex.exerciseId}</p>
                  <p className="gpw-plan-card-meta">{meta}</p>
                </div>
              </div>
            )
          })}
        </div>

        {error && <p className="gpw-error" style={{ padding: '0 24px' }}>{error}</p>}

        <div className="gpw-footer">
          <button
            className="gpw-primary"
            disabled={!name.trim()}
            onClick={() => onComplete({ ...workout, name: name.trim() })}
          >
            Add to my workouts
          </button>
          <button className="gpw-ghost" onClick={() => setShowDiscardConfirm(true)}>
            Start over
          </button>
        </div>

        {showDiscardConfirm && (
          <div className="gpw-modal-overlay" onClick={() => setShowDiscardConfirm(false)}>
            <div className="gpw-modal" onClick={e => e.stopPropagation()}>
              <p className="gpw-modal-title">Discard this workout?</p>
              <p className="gpw-modal-body">Your generated workout will be lost.</p>
              <div className="gpw-modal-actions">
                <button className="gpw-modal-cancel" onClick={() => setShowDiscardConfirm(false)}>Keep it</button>
                <button className="gpw-modal-confirm" onClick={() => { setShowDiscardConfirm(false); setWorkout(null); setFocus([]) }}>Discard</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Focus selection ──────────────────────────────────────────────────────
  return (
    <div className="gpw">
      <div className="gpw-header">
        <button className="gpw-back" onClick={onBack}>‹</button>
        <h2 className="gpw-title">Generate Workout</h2>
        <div className="gpw-header-spacer" />
      </div>

      <div className="gpw-body">
        <p className="gpw-question">What do you want to focus on?</p>
        <p className="gpw-hint">Select all that apply</p>
        <div className="gpw-focus-grid">
          {FOCUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`gpw-focus-btn${focus.includes(opt.value) ? ' gpw-focus-btn--active' : ''}`}
              onClick={() => toggleFocus(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {error && <p className="gpw-error">{error}</p>}
      </div>

      <div className="gpw-footer">
        <button className="gpw-primary" disabled={focus.length === 0} onClick={generate}>
          Generate workout
        </button>
      </div>
    </div>
  )
}
