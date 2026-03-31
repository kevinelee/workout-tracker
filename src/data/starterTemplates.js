// Pre-built starter workout templates for new users.
// These are used to populate the Quick Start section on the home screen.
// Each entry is a WorkoutTemplate shape (no id — those are assigned when user loads one).

import { nanoid } from 'nanoid'
import { createSet } from './models'

// Convert a lbs weight to kg, rounded to nearest 2.5
function toKg(lbs) {
  return Math.round(lbs * 0.453592 / 2.5) * 2.5
}

function ex(exerciseId, setsCount = 3, reps = 8, weight = 0, unit = 'lbs') {
  const w = weight === 0 ? 0 : (unit === 'kg' ? toKg(weight) : weight)
  return {
    exerciseId,
    sets: Array.from({ length: setsCount }, () => createSet({ reps, weight: w })),
    notes: '',
  }
}

export const starterTemplates = [
  {
    label: 'Push Day',
    emoji: '💪',
    description: 'Chest, shoulders & triceps',
    build: (unit = 'lbs') => ({
      id: nanoid(),
      name: 'Push Day',
      createdAt: new Date().toISOString(),
      exercises: [
        ex('bench-press',     4, 8,  135, unit),
        ex('overhead-press',  3, 8,  75,  unit),
        ex('incline-press',   3, 10, 95,  unit),
        ex('tricep-pushdown', 3, 12, 50,  unit),
      ],
    }),
  },
  {
    label: 'Pull Day',
    emoji: '🔙',
    description: 'Back & biceps',
    build: (unit = 'lbs') => ({
      id: nanoid(),
      name: 'Pull Day',
      createdAt: new Date().toISOString(),
      exercises: [
        ex('barbell-row',  4, 8,  135, unit),
        ex('lat-pulldown', 3, 10, 100, unit),
        ex('pull-up',      3, 6,  0,   unit),
        ex('bicep-curl',   3, 12, 30,  unit),
      ],
    }),
  },
  {
    label: 'Leg Day',
    emoji: '🦵',
    description: 'Quads, hamstrings & calves',
    build: (unit = 'lbs') => ({
      id: nanoid(),
      name: 'Leg Day',
      createdAt: new Date().toISOString(),
      exercises: [
        ex('squat',             4, 8,  135, unit),
        ex('romanian-deadlift', 3, 10, 115, unit),
        ex('leg-press',         3, 12, 180, unit),
        ex('calf-raise',        3, 15, 0,   unit),
      ],
    }),
  },
  {
    label: 'Full Body',
    emoji: '🏋️',
    description: 'Classic 5-exercise compound session',
    build: (unit = 'lbs') => ({
      id: nanoid(),
      name: 'Full Body',
      createdAt: new Date().toISOString(),
      exercises: [
        ex('squat',          3, 5, 135, unit),
        ex('bench-press',    3, 5, 135, unit),
        ex('barbell-row',    3, 5, 115, unit),
        ex('overhead-press', 3, 5, 75,  unit),
        ex('deadlift',       1, 5, 185, unit),
      ],
    }),
  },
  {
    label: 'Upper Body',
    emoji: '🤸',
    description: 'Chest, back, shoulders & arms',
    build: (unit = 'lbs') => ({
      id: nanoid(),
      name: 'Upper Body',
      createdAt: new Date().toISOString(),
      exercises: [
        ex('bench-press',     3, 8,  135, unit),
        ex('barbell-row',     3, 8,  115, unit),
        ex('overhead-press',  3, 10, 65,  unit),
        ex('bicep-curl',      3, 12, 25,  unit),
        ex('tricep-pushdown', 3, 12, 40,  unit),
      ],
    }),
  },
  {
    label: 'Core & Cardio',
    emoji: '🔥',
    description: 'Abs and conditioning',
    build: (unit = 'lbs') => ({
      id: nanoid(),
      name: 'Core & Cardio',
      createdAt: new Date().toISOString(),
      exercises: [
        ex('plank',         3, 60, 0, unit),
        ex('crunch',        3, 20, 0, unit),
        ex('russian-twist', 3, 20, 0, unit),
        ex('treadmill',     1, 20, 0, unit),
      ],
    }),
  },
]
