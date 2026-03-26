import { useState } from 'react'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createWorkoutTemplate, createTemplateExercise, createSet } from '../data/models'
import { saveTemplate, deleteTemplate } from '../storage'
import ExerciseSearch from '../components/ExerciseSearch'
import ExerciseRow from '../components/ExerciseRow'
import './WorkoutBuilderScreen.css'

function SortableExerciseRow({ id, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative',
  }
  return (
    <div ref={setNodeRef} style={style}>
      <ExerciseRow {...props} dragHandleListeners={listeners} dragHandleAttributes={attributes} />
    </div>
  )
}

export default function WorkoutBuilderScreen({ template: initial, onSave, onBack, onDelete }) {
  const isNew = !initial

  const [name, setName] = useState(initial?.name ?? '')
  const [exercises, setExercises] = useState(
    initial?.exercises ?? []
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

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
    if (!name.trim() || exercises.length === 0 || saving) return
    setSaving(true)
    try {
      const template = isNew
        ? createWorkoutTemplate({ name: name.trim(), exercises })
        : { ...initial, name: name.trim(), exercises }
      await saveTemplate(template)
      onSave(template)
    } catch (err) {
      console.error('Failed to save template:', err)
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!initial) return
    await deleteTemplate(initial.id)
    onDelete()
  }

  const canSave = name.trim().length > 0 && exercises.length > 0 && !saving

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = exercises.findIndex(e => e.exerciseId === active.id)
      const newIndex = exercises.findIndex(e => e.exerciseId === over.id)
      setExercises(prev => arrayMove(prev, oldIndex, newIndex))
    }
  }

  function handleBuilderClick(e) {
    const interactive = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']
    if (!interactive.includes(e.target.tagName)) {
      document.activeElement?.blur()
    }
  }

  return (
    <div className="builder" onClick={handleBuilderClick}>
      {/* Header */}
      <div className="builder-header">
        <button className="builder-back" onClick={onBack} aria-label="Back">‹</button>
        <h2 className="builder-title">{isNew ? 'New Workout' : 'Edit Workout'}</h2>
        <button
          className="builder-save-btn"
          onClick={handleSave}
          disabled={!canSave}
        >
          {saving ? 'Saving…' : 'Save'}
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
          enterKeyHint="done"
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
        />

        {/* Exercise search */}
        <ExerciseSearch
          onSelect={handleSelectExercise}
          placeholder="Add exercise…"
        />

        {/* Exercise list */}
        {exercises.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={exercises.map(e => e.exerciseId)} strategy={verticalListSortingStrategy}>
              <div className="builder-exercises">
                {exercises.map((ex, i) => (
                  <SortableExerciseRow
                    key={ex.exerciseId}
                    id={ex.exerciseId}
                    templateExercise={ex}
                    onChange={updated => updateExercise(i, updated)}
                    onRemove={() => removeExercise(i)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
