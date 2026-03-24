import { useState } from 'react'
import { defaultExercises } from '../data/exerciseLibrary'
import { getCustomExercises } from '../storage'
import { createSet } from '../data/models'
import MuscleIcon from './MuscleIcon'
import SetRow from './SetRow'
import './ExerciseRow.css'

function findExercise(id) {
  return (
    defaultExercises.find(e => e.id === id) ??
    getCustomExercises().find(e => e.id === id) ??
    null
  )
}

export default function ExerciseRow({ templateExercise, onChange, onRemove }) {
  const [notesOpen, setNotesOpen] = useState(false)
  const exercise = findExercise(templateExercise.exerciseId)
  const { sets } = templateExercise

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
      <div className="ex-row-header">
        <MuscleIcon muscleGroup={exercise.muscleGroup} className="ex-row-icon" />
        <div className="ex-row-info">
          <p className="ex-row-name">{exercise.name}</p>
          <p className="ex-row-meta">{exercise.muscleGroup} · {exercise.category}</p>
        </div>
        <div className="ex-row-actions">
          <button
            className={`ex-notes-btn ${notesOpen ? 'active' : ''}`}
            onClick={() => setNotesOpen(o => !o)}
            aria-label="Toggle notes"
          >
            📝
          </button>
          <button className="ex-remove-btn" onClick={onRemove} aria-label="Remove exercise">
            ✕
          </button>
        </div>
      </div>

      <div className="ex-sets">
        {sets.map((set, i) => (
          <SetRow
            key={i}
            set={set}
            index={i}
            onChange={updated => updateSet(i, updated)}
            onRemove={() => removeSet(i)}
          />
        ))}
        <button className="ex-add-set-btn" onClick={addSet}>
          + Add set
        </button>
      </div>

      {notesOpen && (
        <textarea
          className="ex-notes"
          placeholder="Notes (optional)…"
          value={templateExercise.notes ?? ''}
          onChange={e => updateNotes(e.target.value)}
          rows={2}
        />
      )}
    </div>
  )
}
