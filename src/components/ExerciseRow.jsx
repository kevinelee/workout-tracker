import { useState, useRef } from 'react'
import { defaultExercises } from '../data/exerciseLibrary'
import { getCachedCustomExercises } from '../storage'
import { createSet } from '../data/models'
import MuscleIcon from './MuscleIcon'
import SetRow from './SetRow'
import { GUIDED_LIMITS, GUIDED_TYPES, TYPE_LABELS, fmtGuidedExercise, fmtSecs, isTimedType, targetLimits } from '../utils/guided'
import './ExerciseRow.css'

function NotesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <rect x="4" y="2" width="12" height="16" rx="2" />
      <line x1="7" y1="7" x2="13" y2="7" />
      <line x1="7" y1="10" x2="13" y2="10" />
      <line x1="7" y1="13" x2="11" y2="13" />
    </svg>
  )
}

function findExercise(id) {
  return defaultExercises.find(e => e.id === id) ?? getCachedCustomExercises().find(e => e.id === id) ?? null
}

function Stepper({ label, value, display, limits, onChange }) {
  const set = v => onChange(Math.min(limits.max, Math.max(limits.min, v)))
  return (
    <div className="ex-guided-field">
      <span className="ex-guided-label">{label}</span>
      <div className="ex-guided-stepper">
        <button type="button" onClick={() => set(value - limits.step)} disabled={value <= limits.min} aria-label={`Decrease ${label}`}>−</button>
        <span className="ex-guided-value">{display ?? value}</span>
        <button type="button" onClick={() => set(value + limits.step)} disabled={value >= limits.max} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  )
}

// A guided exercise's whole config: every set shares it, so it's edited once.
function GuidedConfig({ config, onChange }) {
  const put = patch => onChange({ ...config, ...patch })
  function setType(type) {
    if (type === config.type) return
    // Reps and seconds don't translate — switching kind resets the target.
    const target = isTimedType(type) === isTimedType(config.type) ? config.target : isTimedType(type) ? 30 : 10
    put({ type, target })
  }
  const timed = isTimedType(config.type)
  return (
    <div className="ex-guided">
      <div className="ex-guided-types" role="radiogroup" aria-label="Exercise type">
        {GUIDED_TYPES.map(t => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={config.type === t}
            className={`ex-guided-type${config.type === t ? ' ex-guided-type--on' : ''}`}
            onClick={() => setType(t)}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="ex-guided-grid">
        <Stepper label="Sets" value={config.sets} limits={GUIDED_LIMITS.sets} onChange={sets => put({ sets })} />
        <Stepper
          label={timed ? 'Seconds' : 'Reps'}
          value={config.target}
          display={timed ? fmtSecs(config.target) : config.target}
          limits={targetLimits(config.type)}
          onChange={target => put({ target })}
        />
        <Stepper
          label="Rest"
          value={config.rest}
          display={config.rest > 0 ? fmtSecs(config.rest) : 'None'}
          limits={GUIDED_LIMITS.rest}
          onChange={rest => put({ rest })}
        />
      </div>
    </div>
  )
}

// guidedConfig marks a guided workout: sets, type, target and rest are set
// once for the exercise (GuidedConfig) instead of set by set.
export default function ExerciseRow({ templateExercise, onChange, onRemove, dragHandleListeners, dragHandleAttributes, unit, guidedConfig, onGuidedChange }) {
  const [notesOpen, setNotesOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const notesRef = useRef(null)
  const exercise = findExercise(templateExercise.exerciseId)
  const { sets } = templateExercise
  const isCardio  = exercise?.category === 'Cardio'
  const isStretch = exercise?.category === 'Stretch' || exercise?.isTimed

  function updateSet(index, updatedSet) {
    const newSets = sets.map((s, i) => (i === index ? updatedSet : s))
    onChange({ ...templateExercise, sets: newSets })
  }

  function addSet() {
    const last = sets[sets.length - 1]
    const newSet = last ? { ...createSet(), reps: last.reps, weight: last.weight } : createSet()
    onChange({ ...templateExercise, sets: [...sets, newSet] })
  }

  function removeSet(index) {
    if (sets.length === 1) return // keep at least one set
    onChange({ ...templateExercise, sets: sets.filter((_, i) => i !== index) })
  }

  function updateNotes(notes) {
    onChange({ ...templateExercise, notes })
  }

  if (!exercise) return null

  return (
    <div className="ex-row">
      <div className="ex-row-header" onClick={() => setCollapsed(c => !c)} style={{ cursor: 'pointer' }}>
        {dragHandleListeners && (
          <button
            className="ex-drag-handle"
            {...dragHandleListeners}
            {...dragHandleAttributes}
            onClick={e => e.stopPropagation()}
            aria-label="Drag to reorder"
          >
            ⠿
          </button>
        )}
        <MuscleIcon muscleGroup={exercise.muscleGroup} className="ex-row-icon" />
        <div className="ex-row-info">
          <p className="ex-row-name">{exercise.name}</p>
          <p className="ex-row-meta">
            {guidedConfig
              ? fmtGuidedExercise(guidedConfig)
              : `${exercise.muscleGroup} · ${exercise.category} · ${sets.length} set${sets.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="ex-row-actions" onClick={e => e.stopPropagation()}>
          <button
            className={`ex-notes-btn ${notesOpen ? 'active' : ''}`}
            onClick={() => {
              if (collapsed) setCollapsed(false)
              const opening = !notesOpen
              setNotesOpen(opening)
              if (opening) {
                setTimeout(() => {
                  notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }, 80)
              }
            }}
            aria-label="Toggle notes"
          >
            <NotesIcon />
          </button>
          <button className="ex-remove-btn" onClick={onRemove} aria-label="Remove exercise">
            ✕
          </button>
          <span className={`ex-chevron ${collapsed ? 'ex-chevron--collapsed' : ''}`}>›</span>
        </div>
      </div>

      <div className={`ex-body ${collapsed ? 'ex-body--collapsed' : ''}`}>
        {guidedConfig && <GuidedConfig config={guidedConfig} onChange={onGuidedChange} />}
        {!guidedConfig && <div className="ex-sets">
          {sets.map((set, i) => (
            <SetRow
              key={i}
              set={set}
              index={i}
              onChange={updated => updateSet(i, updated)}
              onRemove={() => removeSet(i)}
              isCardio={isCardio}
              cardioUnit={exercise.cardioUnit ?? 'time'}
              isStretch={isStretch}
              unit={unit}
              difficultyLabel={exercise.difficultyLabel}
              difficultyDecimal={exercise.difficultyDecimal}
            />
          ))}
          <button className="ex-add-set-btn" onClick={addSet}>
            + Add set
          </button>
        </div>}

        <div className={`ex-notes-wrap ${notesOpen ? 'ex-notes-wrap--open' : ''}`} ref={notesRef}>
          <textarea
            className="ex-notes"
            placeholder="Notes (optional)…"
            value={templateExercise.notes ?? ''}
            onChange={e => updateNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>
    </div>
  )
}
