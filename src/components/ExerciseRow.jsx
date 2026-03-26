import { useState, useRef } from 'react'
import { defaultExercises } from '../data/exerciseLibrary'
import { getCachedCustomExercises } from '../storage'
import { createSet } from '../data/models'
import MuscleIcon from './MuscleIcon'
import SetRow from './SetRow'
import './ExerciseRow.css'

function findExercise(id) {
  return defaultExercises.find(e => e.id === id) ?? getCachedCustomExercises().find(e => e.id === id) ?? null
}

export default function ExerciseRow({ templateExercise, onChange, onRemove }) {
  const [notesOpen, setNotesOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const notesRef = useRef(null)
  const exercise = findExercise(templateExercise.exerciseId)
  const { sets } = templateExercise
  const isCardio = exercise?.category === 'Cardio'

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
        <MuscleIcon muscleGroup={exercise.muscleGroup} className="ex-row-icon" />
        <div className="ex-row-info">
          <p className="ex-row-name">{exercise.name}</p>
          <p className="ex-row-meta">{exercise.muscleGroup} · {exercise.category} · {sets.length} set{sets.length !== 1 ? 's' : ''}</p>
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
            📝
          </button>
          <button className="ex-remove-btn" onClick={onRemove} aria-label="Remove exercise">
            ✕
          </button>
          <span className={`ex-chevron ${collapsed ? 'ex-chevron--collapsed' : ''}`}>›</span>
        </div>
      </div>

      <div className={`ex-body ${collapsed ? 'ex-body--collapsed' : ''}`}>
        <div className="ex-sets">
          {sets.map((set, i) => (
            <SetRow
              key={i}
              set={set}
              index={i}
              onChange={updated => updateSet(i, updated)}
              onRemove={() => removeSet(i)}
              isCardio={isCardio}
            />
          ))}
          <button className="ex-add-set-btn" onClick={addSet}>
            + Add set
          </button>
        </div>

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
