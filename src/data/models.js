// Data model factory functions
// Keep these cloud-sync-ready: all objects have an id and timestamps

import { nanoid } from 'nanoid'

// Shared between SettingsScreen (the main editor) and RestTimer (tap the
// countdown digits to change it in place, mid-workout).
export const REST_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '1m',  value: 60 },
  { label: '90s', value: 90 },
  { label: '2m',  value: 120 },
  { label: '3m',  value: 180 },
]

/**
 * Exercise — a single movement in the library
 * { id, name, category, muscleGroup, isCustom }
 */
export function createExercise({ name, category, muscleGroup, prType, isTimed, cardioUnit, isCustom = true }) {
  const ex = {
    id: nanoid(),
    name,
    category,   // 'Push' | 'Pull' | 'Legs' | 'Core' | 'Cardio' | 'Stretch'
    muscleGroup,
    isCustom,
  }
  if (prType) ex.prType = prType
  if (isTimed) ex.isTimed = true
  if (cardioUnit) ex.cardioUnit = cardioUnit
  return ex
}

/**
 * Set — one set within a SessionLog row
 * { reps, weight, completed, isPR }
 */
export function createSet({ reps = 0, weight = 0 } = {}) {
  return {
    reps,
    weight,
    completed: false,
    isPR: false,
  }
}

/**
 * TemplateExercise — an exercise row inside a WorkoutTemplate
 * { exerciseId, sets: [{ reps, weight }] }
 */
export function createTemplateExercise({ exerciseId, sets = [] }) {
  return {
    exerciseId,
    sets: sets.length ? sets : [createSet()],
  }
}

/**
 * WorkoutTemplate — a saved workout plan
 * { id, name, exercises: [TemplateExercise], createdAt }
 */
export function createWorkoutTemplate({ name, exercises = [] }) {
  return {
    id: nanoid(),
    name,
    exercises,
    createdAt: new Date().toISOString(),
  }
}

/**
 * SessionLog — logged data for one exercise during an active session
 * { exerciseId, sets: [Set], notes }
 */
export function createSessionLog({ exerciseId }) {
  return {
    exerciseId,
    sets: [createSet()],
    notes: '',
  }
}

/**
 * Session — a completed (or in-progress) workout
 * { id, templateId, startedAt, finishedAt, duration, logs: [SessionLog] }
 */
export function createSession({ templateId, logs = [] }) {
  return {
    id: nanoid(),
    templateId,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    duration: null, // seconds
    logs,
  }
}
