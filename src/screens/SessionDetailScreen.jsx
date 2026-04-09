import { useState, useEffect } from 'react'
import { defaultExercises } from '../data/exerciseLibrary'
import { getCachedCustomExercises, deleteSession, saveSession } from '../storage'
import { sessionVolume, fmtVolume, fmtDuration } from '../utils/volume'
import { estimateCalories } from '../utils/calories'
import MuscleIcon from '../components/MuscleIcon'
import './SessionDetailScreen.css'

function findExercise(id) {
  return defaultExercises.find(e => e.id === id) ?? getCachedCustomExercises().find(e => e.id === id) ?? null
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function secsToParts(secs) {
  return { h: Math.floor((secs ?? 0) / 3600), m: Math.floor(((secs ?? 0) % 3600) / 60) }
}

export default function SessionDetailScreen({ session, templateName, onBack, onDelete, onSave, profile }) {
  const [displaySession, setDisplaySession] = useState(session)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting,    setIsDeleting]    = useState(false)
  const [editing,       setEditing]       = useState(false)
  const [isSaving,      setIsSaving]      = useState(false)
  const [editedSession, setEditedSession] = useState(null)

  const volume   = sessionVolume(displaySession)
  const calories = estimateCalories(displaySession, profile?.weightKg)

  useEffect(() => {
    const main = document.querySelector('.app-main')
    if (main) main.scrollTop = 0
  }, [])

  function startEditing() {
    setEditedSession(JSON.parse(JSON.stringify(displaySession)))
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setEditedSession(null)
  }

  async function handleSave() {
    if (isSaving) return
    setIsSaving(true)
    try {
      await saveSession(editedSession)
      setDisplaySession(editedSession)
      setEditing(false)
      setEditedSession(null)
      onSave?.()
    } catch (err) {
      console.error('Failed to save session edits:', err)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    await deleteSession(displaySession.id)
    onDelete?.()
    onBack()
  }

  function setEditDuration(h, m) {
    setEditedSession(prev => ({ ...prev, duration: h * 3600 + m * 60 }))
  }

  function setEditSet(logIndex, setIndex, field, value) {
    setEditedSession(prev => ({
      ...prev,
      logs: prev.logs.map((log, li) =>
        li !== logIndex ? log : {
          ...log,
          sets: log.sets.map((s, si) =>
            si !== setIndex ? s : { ...s, [field]: Number(value) || 0 }
          ),
        }
      ),
    }))
  }

  const active = editing ? editedSession : displaySession
  const activeParts = secsToParts(active.duration)

  return (
    <div className="detail">
      <div className="detail-header">
        {editing
          ? <button className="detail-back" onClick={cancelEditing}>Cancel</button>
          : <button className="detail-back" onClick={onBack}>‹</button>
        }
        <h2 className="detail-title">{templateName}</h2>
        {editing
          ? (
            <button className="detail-save-btn" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <span className="detail-confirm-spinner" /> : 'Save'}
            </button>
          )
          : (
            <div className="detail-header-actions">
              <button className="detail-edit-btn" onClick={startEditing} aria-label="Edit session">✎</button>
              <button className="detail-delete-btn" onClick={() => setConfirmDelete(true)} aria-label="Delete session">🗑</button>
            </div>
          )
        }
      </div>

      {confirmDelete && (
        <div className="detail-confirm-overlay" onClick={() => { if (!isDeleting) setConfirmDelete(false) }}>
          <div className="detail-confirm" onClick={e => e.stopPropagation()}>
            <p className="detail-confirm-title">Delete this session?</p>
            <p className="detail-confirm-body">This can't be undone.</p>
            <div className="detail-confirm-actions">
              <button className="detail-confirm-cancel" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>Keep</button>
              <button className="detail-confirm-ok" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <span className="detail-confirm-spinner" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="detail-body">
        <div className="detail-meta-row">
          <span>{fmtDate(active.finishedAt)}</span>
          {editing
            ? (
              <div className="detail-duration-edit">
                <input
                  className="detail-duration-input"
                  type="number"
                  min="0"
                  max="23"
                  value={activeParts.h}
                  onChange={e => setEditDuration(parseInt(e.target.value) || 0, activeParts.m)}
                />
                <span>h</span>
                <input
                  className="detail-duration-input"
                  type="number"
                  min="0"
                  max="59"
                  value={activeParts.m}
                  onChange={e => setEditDuration(activeParts.h, Math.min(59, parseInt(e.target.value) || 0))}
                />
                <span>m</span>
              </div>
            )
            : <span>{fmtDuration(active.duration)}</span>
          }
          <span>{fmtVolume(volume)} lbs total</span>
          {calories != null && <span>~{calories} kcal</span>}
        </div>

        {(active.logs ?? []).map((log, logIndex) => {
          const exercise = findExercise(log.exerciseId)
          if (!exercise) return null
          const completed = log.sets.filter(s => s.completed)
          const isCardio    = exercise.category === 'Cardio'
          const isStretch   = exercise.category === 'Stretch'
          const cardioUnit  = exercise.cardioUnit ?? 'time'
          const isDistance  = isCardio && cardioUnit === 'distance'
          const isBoth      = isCardio && cardioUnit === 'both'
          const isTimeBased = isCardio && !isDistance
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
                    {isStretch ? (
                      <th>Sec</th>
                    ) : isDistance ? (
                      <th>Dist</th>
                    ) : isBoth ? (
                      <><th>Dist</th><th>Min</th><th>Sec</th></>
                    ) : isTimeBased ? (
                      <><th>Min</th><th>Sec</th></>
                    ) : (
                      <><th>Reps</th><th>Weight</th></>
                    )}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {log.sets.map((set, i) => (
                    <tr key={i} className={set.completed ? '' : 'detail-set--skipped'}>
                      <td>{i + 1}</td>
                      {isStretch ? (
                        <td>
                          {editing
                            ? <input className="detail-set-input" type="number" min="0" value={set.reps} onChange={e => setEditSet(logIndex, i, 'reps', e.target.value)} />
                            : `${set.reps}s`
                          }
                        </td>
                      ) : isDistance ? (
                        <td>
                          {editing
                            ? <input className="detail-set-input" type="number" min="0" step="0.1" value={set.weight} onChange={e => setEditSet(logIndex, i, 'weight', e.target.value)} />
                            : set.weight
                          }
                        </td>
                      ) : isBoth ? (
                        <>
                          <td>
                            {editing
                              ? <input className="detail-set-input" type="number" min="0" step="0.1" value={set.weight} onChange={e => setEditSet(logIndex, i, 'weight', e.target.value)} />
                              : set.weight
                            }
                          </td>
                          <td>
                            {editing
                              ? <input className="detail-set-input" type="number" min="0" value={set.reps} onChange={e => setEditSet(logIndex, i, 'reps', e.target.value)} />
                              : set.reps
                            }
                          </td>
                          <td>
                            {editing
                              ? <input className="detail-set-input" type="number" min="0" max="59" value={set.secs ?? 0} onChange={e => setEditSet(logIndex, i, 'secs', e.target.value)} />
                              : set.secs ?? 0
                            }
                          </td>
                        </>
                      ) : isTimeBased ? (
                        <>
                          <td>
                            {editing
                              ? <input className="detail-set-input" type="number" min="0" value={set.reps} onChange={e => setEditSet(logIndex, i, 'reps', e.target.value)} />
                              : set.reps
                            }
                          </td>
                          <td>
                            {editing
                              ? <input className="detail-set-input" type="number" min="0" max="59" value={set.secs ?? 0} onChange={e => setEditSet(logIndex, i, 'secs', e.target.value)} />
                              : set.secs ?? 0
                            }
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            {editing
                              ? <input className="detail-set-input" type="number" min="0" value={set.reps} onChange={e => setEditSet(logIndex, i, 'reps', e.target.value)} />
                              : set.reps
                            }
                          </td>
                          <td>
                            {editing
                              ? <input className="detail-set-input" type="number" min="0" value={set.weight} onChange={e => setEditSet(logIndex, i, 'weight', e.target.value)} />
                              : `${set.weight} lbs`
                            }
                          </td>
                        </>
                      )}
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
