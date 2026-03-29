import { defaultExercises } from '../data/exerciseLibrary'
import { getCachedCustomExercises } from '../storage'

// MET values by exercise category (strength)
const CATEGORY_MET = {
  Push: 5.0,
  Pull: 5.0,
  Legs: 5.0,
  Core: 5.0,
}

// MET values for specific cardio exercises
const CARDIO_MET = {
  'Treadmill':       9.0,
  'Jump Rope':       9.0,
  'Stair Climber':   8.0,
  'Stationary Bike': 7.5,
  'Rowing Machine':  7.0,
}

function getMET(exercise) {
  if (!exercise) return 5.0
  if (exercise.category === 'Cardio') return CARDIO_MET[exercise.name] ?? 8.0
  return CATEGORY_MET[exercise.category] ?? 5.0
}

/**
 * Estimate calories burned using MET formula:
 *   calories = MET × weight_kg × duration_hours
 *
 * Returns null if weight or duration is missing.
 */
export function estimateCalories(session, weightKg) {
  if (!weightKg || !session?.duration) return null
  const logs = session.logs ?? []
  if (logs.length === 0) return null

  const all = [...defaultExercises, ...getCachedCustomExercises()]
  const mets = logs.map(log => getMET(all.find(e => e.id === log.exerciseId)))
  const avgMet = mets.reduce((s, m) => s + m, 0) / mets.length
  const hours  = session.duration / 3600

  return Math.round(avgMet * weightKg * hours)
}
