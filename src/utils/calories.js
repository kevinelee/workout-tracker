import { defaultExercises } from '../data/exerciseLibrary'
import { getCachedCustomExercises } from '../storage'

// MET values by exercise category (strength)
const CATEGORY_MET = {
  Push:    5.0,
  Pull:    5.0,
  Legs:    5.0,
  Core:    5.0,
  Stretch: 2.5,
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

// Estimate per strength/core set: ~30s effort + ~90s rest = 2 min
const SECS_PER_STRENGTH_SET = 120

/**
 * Infer active workout duration from logged set data rather than elapsed clock time.
 * This prevents inflated estimates when the user forgets to close the session.
 *
 * - Cardio (time-based): uses logged minutes + seconds directly
 * - Stretch: uses logged seconds directly
 * - Strength/Core: estimates ~2 min per completed set (effort + rest)
 *
 * Result is capped at session.duration so it can't exceed actual elapsed time.
 */
function inferActiveDuration(session, exerciseMap) {
  const logs = session.logs ?? []
  let totalSeconds = 0

  for (const log of logs) {
    const exercise = exerciseMap.get(log.exerciseId)
    const done = log.sets.filter(s => s.completed)
    if (!done.length) continue

    const cat = exercise?.category

    if (cat === 'Stretch') {
      // reps stores seconds for stretch
      totalSeconds += done.reduce((sum, s) => sum + (s.reps ?? 0), 0)
    } else if (cat === 'Cardio') {
      const cardioUnit = exercise?.cardioUnit ?? 'time'
      if (cardioUnit === 'time' || cardioUnit === 'both') {
        // reps = minutes, secs = seconds (may be missing on older sets)
        const logged = done.reduce((sum, s) => sum + (s.reps ?? 0) * 60 + (s.secs ?? 0), 0)
        // Fall back to set-count estimate if nothing was logged
        totalSeconds += logged > 0 ? logged : done.length * SECS_PER_STRENGTH_SET
      } else {
        // Distance-only cardio: no time data, use set-count estimate
        totalSeconds += done.length * SECS_PER_STRENGTH_SET
      }
    } else {
      // Strength / Core
      totalSeconds += done.length * SECS_PER_STRENGTH_SET
    }
  }

  // Cap at actual session duration — can't have been more active than total elapsed
  const cap = session.duration ?? totalSeconds
  return totalSeconds > 0 ? Math.min(totalSeconds, cap) : cap
}

/**
 * Estimate calories burned using MET formula:
 *   calories = MET × weight_kg × duration_hours
 *
 * Uses inferred active duration instead of raw session.duration to avoid
 * inflated counts when the session timer ran long (e.g. forgot to close app).
 *
 * Returns null if weight or duration is missing.
 */
export function estimateCalories(session, weightKg) {
  if (!weightKg || !session?.duration) return null
  const logs = session.logs ?? []
  if (logs.length === 0) return null

  const all = [...defaultExercises, ...getCachedCustomExercises()]
  const exerciseMap = new Map(all.map(e => [e.id, e]))

  const mets   = logs.map(log => getMET(exerciseMap.get(log.exerciseId)))
  const avgMet = mets.reduce((s, m) => s + m, 0) / mets.length

  const activeSecs = inferActiveDuration(session, exerciseMap)
  const hours      = activeSecs / 3600

  return Math.round(avgMet * weightKg * hours)
}
