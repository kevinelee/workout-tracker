// Pre-built starter workout templates for new users.
// These are used to populate the Quick Start section on the home screen.
// Each entry is a WorkoutTemplate shape (no id — those are assigned when user loads one).

import { nanoid } from 'nanoid'
import { createSet } from './models'

function ex(exerciseId, setsCount = 3, reps = 8, weight = 0) {
  return {
    exerciseId,
    sets: Array.from({ length: setsCount }, () => createSet({ reps, weight })),
    notes: '',
  }
}

export const starterTemplates = [
  {
    label: 'Push Day',
    emoji: '💪',
    description: 'Chest, shoulders & triceps',
    build: () => ({
      id: nanoid(),
      name: 'Push Day',
      createdAt: new Date().toISOString(),
      exercises: [
        ex('bench-press',     4, 8,  135),
        ex('overhead-press',  3, 8,  75),
        ex('incline-press',   3, 10, 95),
        ex('tricep-pushdown', 3, 12, 50),
      ],
    }),
  },
  {
    label: 'Pull Day',
    emoji: '🔙',
    description: 'Back & biceps',
    build: () => ({
      id: nanoid(),
      name: 'Pull Day',
      createdAt: new Date().toISOString(),
      exercises: [
        ex('barbell-row',  4, 8,  135),
        ex('lat-pulldown', 3, 10, 100),
        ex('pull-up',      3, 6,  0),
        ex('bicep-curl',   3, 12, 30),
      ],
    }),
  },
  {
    label: 'Leg Day',
    emoji: '🦵',
    description: 'Quads, hamstrings & calves',
    build: () => ({
      id: nanoid(),
      name: 'Leg Day',
      createdAt: new Date().toISOString(),
      exercises: [
        ex('squat',             4, 8,  135),
        ex('romanian-deadlift', 3, 10, 115),
        ex('leg-press',         3, 12, 180),
        ex('calf-raise',        3, 15, 0),
      ],
    }),
  },
  {
    label: 'Full Body',
    emoji: '🏋️',
    description: 'Classic 5-exercise compound session',
    build: () => ({
      id: nanoid(),
      name: 'Full Body',
      createdAt: new Date().toISOString(),
      exercises: [
        ex('squat',          3, 5, 135),
        ex('bench-press',    3, 5, 135),
        ex('barbell-row',    3, 5, 115),
        ex('overhead-press', 3, 5, 75),
        ex('deadlift',       1, 5, 185),
      ],
    }),
  },
  {
    label: 'Upper Body',
    emoji: '🤸',
    description: 'Chest, back, shoulders & arms',
    build: () => ({
      id: nanoid(),
      name: 'Upper Body',
      createdAt: new Date().toISOString(),
      exercises: [
        ex('bench-press',     3, 8,  135),
        ex('barbell-row',     3, 8,  115),
        ex('overhead-press',  3, 10, 65),
        ex('bicep-curl',      3, 12, 25),
        ex('tricep-pushdown', 3, 12, 40),
      ],
    }),
  },
  {
    label: 'Core & Cardio',
    emoji: '🔥',
    description: 'Abs and conditioning',
    build: () => ({
      id: nanoid(),
      name: 'Core & Cardio',
      createdAt: new Date().toISOString(),
      exercises: [
        ex('plank',         3, 60, 0),
        ex('crunch',        3, 20, 0),
        ex('russian-twist', 3, 20, 0),
        ex('treadmill',     1, 20, 0),
      ],
    }),
  },
]
