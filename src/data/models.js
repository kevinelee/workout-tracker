// Data model factory functions
// Keep these cloud-sync-ready: all objects have an id and timestamps

import { nanoid } from 'nanoid'

/**
 * Exercise — a single movement in the library
 * { id, name, category, muscleGroup, isCustom }
 */
export function createExercise({ name, category, muscleGroup, isCustom = true }) {
  return {
    id: nanoid(),
    name,
    category,   // 'Push' | 'Pull' | 'Legs' | 'Core' | 'Cardio'
    muscleGroup,
    isCustom,
  }
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
