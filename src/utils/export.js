import { defaultExercises } from '../data/exerciseLibrary'
import { getCachedCustomExercises } from '../storage'

function exerciseName(id) {
  const all = [...defaultExercises, ...getCachedCustomExercises()]
  return all.find(e => e.id === id)?.name ?? id
}

// --- JSON export ---
export function exportJSON(sessions, templates) {
  const payload = { exportedAt: new Date().toISOString(), sessions, templates }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  download(blob, `workout-tracker-${dateSuffix()}.json`)
}

// --- CSV export ---
export function exportCSV(sessions) {
  const rows = [['Date', 'Workout', 'Exercise', 'Set', 'Reps', 'Weight (lbs)', 'Completed', 'PR', 'Duration (s)']]

  for (const session of sessions) {
    const date = session.finishedAt ? new Date(session.finishedAt).toLocaleDateString() : ''
    const workout = session.templateName ?? session.templateId
    for (const log of session.logs ?? []) {
      const exName = exerciseName(log.exerciseId)
      log.sets.forEach((set, i) => {
        rows.push([
          date,
          workout,
          exName,
          i + 1,
          set.reps,
          set.weight,
          set.completed ? 'Yes' : 'No',
          set.isPR ? 'Yes' : 'No',
          i === 0 ? (session.duration ?? '') : '',
        ])
      })
    }
  }

  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  download(blob, `workout-tracker-${dateSuffix()}.csv`)
}

function dateSuffix() {
  return new Date().toISOString().slice(0, 10)
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
