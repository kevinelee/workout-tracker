import { defaultExercises } from '../data/exerciseLibrary'

export function muscleGroupsForTemplate(template) {
  const groups = new Set()
  for (const ex of template.exercises) {
    const found = defaultExercises.find(e => e.id === ex.exerciseId)
    if (found) groups.add(found.muscleGroup)
  }
  return [...groups].slice(0, 3).join(', ')
}
