import { useState, useRef, useEffect, useCallback } from 'react'
import { defaultExercises, CATEGORIES } from '../data/exerciseLibrary'
import { getCustomExercises, saveCustomExercise } from '../storage'
import { createExercise } from '../data/models'
import MuscleIcon from './MuscleIcon'
import './ExerciseSearch.css'

function buildLibrary() {
  const custom = getCustomExercises()
  return [...defaultExercises, ...custom]
}

function filterExercises(library, query) {
  if (!query.trim()) return library
  const q = query.toLowerCase()
  return library.filter(
    ex =>
      ex.name.toLowerCase().includes(q) ||
      ex.category.toLowerCase().includes(q) ||
      ex.muscleGroup.toLowerCase().includes(q)
  )
}

function groupByCategory(exercises) {
  return CATEGORIES.reduce((acc, cat) => {
    const matches = exercises.filter(ex => ex.category === cat)
    if (matches.length) acc[cat] = matches
    return acc
  }, {})
}

// --- Create Custom Exercise Form ---
function CreateExerciseForm({ name: initialName, onSave, onCancel }) {
  const [name, setName] = useState(initialName)
  const [category, setCategory] = useState(CATEGORIES[0])
  const [muscleGroup, setMuscleGroup] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !muscleGroup.trim()) return
    const exercise = createExercise({ name: name.trim(), category, muscleGroup: muscleGroup.trim() })
    saveCustomExercise(exercise)
    onSave(exercise)
  }

  return (
    <form className="es-create-form" onSubmit={handleSubmit}>
      <p className="es-create-title">New exercise</p>
      <input
        className="es-create-input"
        placeholder="Exercise name"
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
      />
      <div className="es-create-row">
        <select
          className="es-create-select"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <input
          className="es-create-input"
          placeholder="Muscle group"
          value={muscleGroup}
          onChange={e => setMuscleGroup(e.target.value)}
        />
      </div>
      <div className="es-create-actions">
        <button type="button" className="es-create-btn es-create-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className="es-create-btn es-create-save"
          disabled={!name.trim() || !muscleGroup.trim()}
        >
          Add exercise
        </button>
      </div>
    </form>
  )
}

// --- Main Component ---
export default function ExerciseSearch({ onSelect, placeholder = 'Search exercises…' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [library, setLibrary] = useState(buildLibrary)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const filtered = filterExercises(library, query)
  const grouped = groupByCategory(filtered)
  const hasResults = filtered.length > 0
  const exactMatch = library.some(ex => ex.name.toLowerCase() === query.toLowerCase().trim())

  // Close dropdown on outside click
  useEffect(() => {
    function onPointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const handleSelect = useCallback((exercise) => {
    onSelect(exercise)
    setQuery('')
    setOpen(false)
    setCreating(false)
    inputRef.current?.focus()
  }, [onSelect])

  function handleSaveCustom(exercise) {
    setLibrary(buildLibrary())
    handleSelect(exercise)
  }

  function handleInputChange(e) {
    setQuery(e.target.value)
    setOpen(true)
    setCreating(false)
  }

  function handleInputFocus() {
    setOpen(true)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false)
      setCreating(false)
    }
  }

  return (
    <div className="es-container" ref={containerRef}>
      <div className="es-input-wrap">
        <span className="es-search-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M16.5 16.5 L21 21" />
          </svg>
        </span>
        <input
          ref={inputRef}
          className="es-input"
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            className="es-clear-btn"
            onClick={() => { setQuery(''); setOpen(false); setCreating(false) }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="es-dropdown">
          {creating ? (
            <CreateExerciseForm
              name={query}
              onSave={handleSaveCustom}
              onCancel={() => setCreating(false)}
            />
          ) : (
            <>
              {hasResults ? (
                Object.entries(grouped).map(([category, exercises]) => (
                  <div key={category} className="es-group">
                    <p className="es-group-label">{category}</p>
                    {exercises.map(exercise => (
                      <button
                        key={exercise.id}
                        className="es-result"
                        onPointerDown={e => e.preventDefault()} // prevent input blur
                        onClick={() => handleSelect(exercise)}
                      >
                        <MuscleIcon muscleGroup={exercise.muscleGroup} className="es-muscle-icon" />
                        <span className="es-result-name">{exercise.name}</span>
                        <span className="es-result-muscle">{exercise.muscleGroup}</span>
                        {exercise.isCustom && <span className="es-custom-badge">Custom</span>}
                      </button>
                    ))}
                  </div>
                ))
              ) : (
                <p className="es-no-results">No results for "{query}"</p>
              )}

              {/* Always show "create" option if query is typed and not an exact match */}
              {query.trim() && !exactMatch && (
                <button
                  className="es-create-trigger"
                  onPointerDown={e => e.preventDefault()}
                  onClick={() => setCreating(true)}
                >
                  <span className="es-create-plus">+</span>
                  Create "{query.trim()}"
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
