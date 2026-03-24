import { defaultExercises } from '../data/exerciseLibrary'
import { getCustomExercises } from '../storage'
import { sessionVolume, fmtVolume, fmtDuration } from '../utils/volume'
import MuscleIcon from '../components/MuscleIcon'
import './SessionDetailScreen.css'

function findExercise(id) {
  return defaultExercises.find(e => e.id === id) ?? getCustomExercises().find(e => e.id === id) ?? null
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export default function SessionDetailScreen({ session, templateName, onBack }) {
  const volume = sessionVolume(session)

  return (
    <div className="detail">
      <div className="detail-header">
        <button className="detail-back" onClick={onBack}>‹</button>
        <h2 className="detail-title">{templateName}</h2>
      </div>

      <div className="detail-body">
        <div className="detail-meta-row">
          <span>{fmtDate(session.finishedAt)}</span>
          <span>{fmtDuration(session.duration)}</span>
          <span>{fmtVolume(volume)} lbs total</span>
        </div>

        {(session.logs ?? []).map(log => {
          const exercise = findExercise(log.exerciseId)
          if (!exercise) return null
          const completed = log.sets.filter(s => s.completed)
          return (
            <div key={log.exerciseId} className="detail-exercise">
              <div className="detail-ex-header">
                <MuscleIcon muscleGroup={exercise.muscleGroup} className="detail-ex-icon" />
                <p className="detail-ex-name">{exercise.name}</p>
              </div>
              <table className="detail-sets-table">
                <thead>
                  <tr>
                    <th>Set</th>
                    <th>Reps</th>
                    <th>Weight</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {log.sets.map((set, i) => (
                    <tr key={i} className={set.completed ? '' : 'detail-set--skipped'}>
                      <td>{i + 1}</td>
                      <td>{set.reps}</td>
                      <td>{set.weight} lbs</td>
                      <td>{set.isPR ? '🏆' : set.completed ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {log.notes ? <p className="detail-notes">{log.notes}</p> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
