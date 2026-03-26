import { useState } from 'react'
import { createWorkoutTemplate, createTemplateExercise, createSet } from '../data/models'
import { saveTemplate, deleteTemplate } from '../storage'
import ExerciseSearch from '../components/ExerciseSearch'
import ExerciseRow from '../components/ExerciseRow'
import './WorkoutBuilderScreen.css'

export default function WorkoutBuilderScreen({ template: initial, onSave, onBack, onDelete }) {
  const isNew = !initial

  const [name, setName] = useState(initial?.name ?? '')
  const [exercises, setExercises] = useState(
    initial?.exercises ?? []
  )
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleSelectExercise(exercise) {
    // Don't add duplicates
    if (exercises.some(e => e.exerciseId === exercise.id)) return
    setExercises(prev => [
      ...prev,
      { ...createTemplateExercise({ exerciseId: exercise.id }), notes: '' },
    ])
  }

  function updateExercise(index, updated) {
    setExercises(prev => prev.map((e, i) => (i === index ? updated : e)))
  }

  function removeExercise(index) {
    setExercises(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!name.trim() || exercises.length === 0) return
    const template = isNew
      ? createWorkoutTemplate({ name: name.trim(), exercises })
      : { ...initial, name: name.trim(), exercises }
    await saveTemplate(template)
    onSave(template)
  }

  async function handleDelete() {
    if (!initial) return
    await deleteTemplate(initial.id)
    onDelete()
  }

  const canSave = name.trim().length > 0 && exercises.length > 0

  return (
    <div className="builder">
      {/* Header */}
      <div className="builder-header">
        <button className="builder-back" onClick={onBack} aria-label="Back">‹</button>
        <h2 className="builder-title">{isNew ? 'New Workout' : 'Edit Workout'}</h2>
        <button
          className="builder-save-btn"
          onClick={handleSave}
          disabled={!canSave}
        >
          Save
        </button>
      </div>

      <div className="builder-body">
        {/* Workout name */}
        <input
          className="builder-name-input"
          placeholder="Workout name…"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus={isNew}
        />

        {/* Exercise search */}
        <ExerciseSearch
          onSelect={handleSelectExercise}
          placeholder="Add exercise…"
        />

        {/* Exercise list */}
        {exercises.length > 0 && (
          <div className="builder-exercises">
            {exercises.map((ex, i) => (
              <ExerciseRow
                key={`${ex.exerciseId}-${i}`}
                templateExercise={ex}
                onChange={updated => updateExercise(i, updated)}
                onRemove={() => removeExercise(i)}
              />
            ))}
          </div>
        )}

        {exercises.length === 0 && name.trim() && (
          <p className="builder-hint">Search above to add your first exercise.</p>
        )}

        {/* Delete */}
        {!isNew && (
          <button className="builder-delete-btn" onClick={() => setConfirmDelete(true)}>
            Delete workout
          </button>
        )}
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="builder-modal-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="builder-modal" onClick={e => e.stopPropagation()}>
            <p className="builder-modal-title">Delete "{name}"?</p>
            <p className="builder-modal-body">This will permanently remove the workout. This can't be undone.</p>
            <div className="builder-modal-actions">
              <button className="builder-modal-cancel" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="builder-modal-confirm" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
