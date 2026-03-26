import { useState, useEffect, useRef, useCallback } from 'react'
import { createSet } from '../data/models'
import { defaultExercises } from '../data/exerciseLibrary'
import { getCachedCustomExercises, getLastSessionForTemplate, saveSession, saveTemplate } from '../storage'
import { initLogsFromSession } from '../App'
import { createTemplateExercise } from '../data/models'
import MuscleIcon from '../components/MuscleIcon'
import SessionSetRow from '../components/SessionSetRow'
import ExerciseSearch from '../components/ExerciseSearch'
import RestTimer from '../components/RestTimer'
import './SessionScreen.css'

function findExercise(id) {
  return defaultExercises.find(e => e.id === id) ?? getCachedCustomExercises().find(e => e.id === id) ?? null
}

function fmtElapsed(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function elapsedFromStart(startedAt) {
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
}

export default function SessionScreen({ activeSession, settings, onUpdate, onFinish, onMinimize, onAbandon }) {
  const { template, sessionId, startedAt, logs: initialLogs, prMap: initialPrMap } = activeSession

  const [logs, setLogs]       = useState(initialLogs)
  const [prMap, setPRMap]     = useState(initialPrMap)
  const [elapsed, setElapsed] = useState(() => elapsedFromStart(startedAt))
  const [restDuration, setRestDuration] = useState(null)
  const [timerFlash, setTimerFlash] = useState(false)
  const [copiedBanner, setCopiedBanner] = useState(false)
  const [showAbandon, setShowAbandon] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [openNotes, setOpenNotes] = useState(new Set())
  const [collapsedExercises, setCollapsedExercises] = useState(new Set())
  const noteRefs = useRef({})

  const [showAddExercise, setShowAddExercise] = useState(false)
  const [confirmRemoveIndex, setConfirmRemoveIndex] = useState(null)
  const [pendingFinish, setPendingFinish] = useState(null) // { session } — waiting on template update decision
  const [pendingQuickStart, setPendingQuickStart] = useState(null) // { session } — quick start save prompt
  const [newWorkoutName, setNewWorkoutName] = useState('')

  const [lastSession, setLastSession] = useState(null)
  useEffect(() => {
    getLastSessionForTemplate(template.id).then(setLastSession)
  }, [template.id])

  // Elapsed timer — recalculates from wall clock, survives sleep/background
  useEffect(() => {
    const id = setInterval(() => setElapsed(elapsedFromStart(startedAt)), 1000)

    function onVisible() {
      if (document.visibilityState === 'visible') {
        setElapsed(elapsedFromStart(startedAt))
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [startedAt])

  // Sync logs/prMap changes up to App (persists to localStorage)
  function updateLogsAndSync(newLogs, newPrMap) {
    setLogs(newLogs)
    if (newPrMap) setPRMap(newPrMap)
    onUpdate(newLogs, newPrMap ?? prMap)
  }

  function copyLastSession() {
    if (!lastSession) return
    const newLogs = initLogsFromSession(template, lastSession)
    updateLogsAndSync(newLogs, prMap)
    setCopiedBanner(true)
    setTimeout(() => setCopiedBanner(false), 2000)
  }

  function updateSet(logIndex, setIndex, updatedSet) {
    const newLogs = logs.map((log, li) =>
      li !== logIndex ? log : {
        ...log,
        sets: log.sets.map((s, si) => si === setIndex ? updatedSet : s),
      }
    )
    updateLogsAndSync(newLogs, null)
  }

  function completeSet(logIndex, setIndex, set) {
    if (set.completed) return

    const exerciseId = logs[logIndex].exerciseId
    const currentPR = prMap[exerciseId] ?? 0
    const isPR = set.weight > 0 && set.weight > currentPR

    const newPrMap = isPR ? { ...prMap, [exerciseId]: set.weight } : prMap
    const newLogs = logs.map((log, li) =>
      li !== logIndex ? log : {
        ...log,
        sets: log.sets.map((s, si) => si === setIndex ? { ...set, completed: true, isPR } : s),
      }
    )
    updateLogsAndSync(newLogs, newPrMap)
    if (settings.restTimerDuration > 0) {
      setRestDuration(settings.restTimerDuration)
    }
  }

  function updateNotes(logIndex, text) {
    const newLogs = logs.map((log, li) => li !== logIndex ? log : { ...log, notes: text })
    updateLogsAndSync(newLogs, null)
  }

  function toggleCollapse(exerciseId) {
    setCollapsedExercises(prev => {
      const next = new Set(prev)
      if (next.has(exerciseId)) next.delete(exerciseId)
      else next.add(exerciseId)
      return next
    })
  }

  function addSet(logIndex) {
    const log = logs[logIndex]
    const last = log.sets[log.sets.length - 1]
    const newSet = { reps: last?.reps ?? 0, weight: last?.weight ?? 0, completed: false, isPR: false, isBonus: true }
    const newLogs = logs.map((l, li) => li !== logIndex ? l : { ...l, sets: [...l.sets, newSet] })
    updateLogsAndSync(newLogs, null)
  }

  function rescindSet(logIndex, setIndex) {
    const newLogs = logs.map((log, li) =>
      li !== logIndex ? log : {
        ...log,
        sets: log.sets.map((s, si) => si === setIndex ? { ...s, completed: false, isPR: false } : s),
      }
    )
    updateLogsAndSync(newLogs, null)
  }

  function addExerciseToSession(exercise) {
    if (logs.some(l => l.exerciseId === exercise.id)) return
    const newLog = {
      exerciseId: exercise.id,
      targetCount: 3,
      sets: Array.from({ length: 3 }, () => ({ reps: 0, weight: 0, completed: false, isPR: false, isBonus: false })),
      notes: '',
    }
    updateLogsAndSync([...logs, newLog], null)
    setShowAddExercise(false)
  }

  function handleRemoveExercise(logIndex) {
    const hasCompleted = logs[logIndex].sets.some(s => s.completed)
    if (hasCompleted) {
      setConfirmRemoveIndex(logIndex)
    } else {
      doRemoveExercise(logIndex)
    }
  }

  function doRemoveExercise(logIndex) {
    updateLogsAndSync(logs.filter((_, i) => i !== logIndex), null)
    setConfirmRemoveIndex(null)
  }

  function toggleNotes(exerciseId) {
    setOpenNotes(prev => {
      const next = new Set(prev)
      if (next.has(exerciseId)) {
        next.delete(exerciseId)
      } else {
        next.add(exerciseId)
        // Scroll into view after the expand animation starts
        setTimeout(() => {
          noteRefs.current[exerciseId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 50)
      }
      return next
    })
  }

  async function handleFinish() {
    if (finishing) return
    setFinishing(true)
    try {
      const session = {
        id: sessionId,
        templateId: template.id,
        startedAt,
        finishedAt: new Date().toISOString(),
        duration: elapsed,
        logs,
        prMap,
      }
      await saveSession(session)

      // Quick start — ask if they want to save it as a named workout
      if (template.isQuickStart) {
        setNewWorkoutName(template.name)
        setPendingQuickStart({ session })
        setFinishing(false)
        return
      }

      // Detect if exercise list diverged from the template
      const templateIds = template.exercises.map(e => e.exerciseId).sort().join()
      const logIds = logs.map(l => l.exerciseId).sort().join()
      if (templateIds !== logIds) {
        setPendingFinish({ session })
        setFinishing(false)
      } else {
        onFinish(session, template)
      }
    } catch (err) {
      console.error('Failed to save session:', err)
      setFinishing(false)
    }
  }

  async function handleSaveAsNewWorkout(session, name) {
    const savedExercises = logs.map(log => {
      const existing = template.exercises.find(e => e.exerciseId === log.exerciseId)
      if (existing) return existing
      const targetSets = log.sets.slice(0, log.targetCount ?? log.sets.length)
      return createTemplateExercise({
        exerciseId: log.exerciseId,
        sets: targetSets.map(s => ({ reps: s.reps, weight: s.weight })),
      })
    })
    const savedTemplate = { ...template, name: name.trim(), isQuickStart: false, exercises: savedExercises }
    try {
      await saveTemplate(savedTemplate)
    } catch (err) {
      console.error('Failed to save template:', err)
    }
    onFinish(session, savedTemplate)
  }

  async function handleUpdateTemplate(session) {
    const updatedExercises = logs.map(log => {
      const existing = template.exercises.find(e => e.exerciseId === log.exerciseId)
      if (existing) return existing
      const targetSets = log.sets.slice(0, log.targetCount ?? log.sets.length)
      return createTemplateExercise({
        exerciseId: log.exerciseId,
        sets: targetSets.map(s => ({ reps: s.reps, weight: s.weight })),
      })
    })
    const updatedTemplate = { ...template, exercises: updatedExercises }
    try {
      await saveTemplate(updatedTemplate)
    } catch (err) {
      console.error('Failed to update template:', err)
    }
    onFinish(session, updatedTemplate)
  }

  // Progress counts only target sets (bonus sets are extra credit)
  const totalSets     = logs.reduce((sum, log) => sum + (log.targetCount ?? log.sets.length), 0)
  const completedSets = logs.reduce((sum, log) => {
    const target = log.targetCount ?? log.sets.length
    return sum + Math.min(log.sets.filter(s => s.completed).length, target)
  }, 0)
  const allDone = completedSets === totalSets && totalSets > 0

  return (
    <div className="session">
      {/* Sticky header + progress bar */}
      <div className="session-sticky">
        <div className="session-header">
          <button className="session-back" onClick={onMinimize} aria-label="Back">‹</button>
          <div className="session-title-wrap">
            <h2 className="session-name">{template.name}</h2>
            <span className="session-timer">{fmtElapsed(elapsed)}</span>
          </div>
          <button
            className={`session-finish-btn ${allDone ? 'session-finish-btn--ready' : ''}`}
            onClick={handleFinish}
            disabled={finishing}
          >
            {finishing ? <span className="session-spinner" /> : 'Finish'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="session-progress-bar">
          <div
            className="session-progress-fill"
            style={{ width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <div className="session-body">
        {/* Copy last session banner */}
        {lastSession && !copiedBanner && (
          <button className="session-copy-btn" onClick={copyLastSession}>
            <span>📋</span>
            <span>Copy last session</span>
            <span className="session-copy-date">
              {new Date(lastSession.finishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </button>
        )}
        {copiedBanner && (
          <div className="session-copied-banner">✓ Filled from last session</div>
        )}

        {/* Exercise blocks */}
        {logs.map((log, li) => {
          const exercise = findExercise(log.exerciseId)
          if (!exercise) return null
          const doneCount  = log.sets.filter(s => s.completed).length
          const target     = log.targetCount ?? log.sets.length
          const allSetsDone = doneCount >= target
          const isCardio   = exercise.category === 'Cardio'
          const isCollapsed = collapsedExercises.has(log.exerciseId)

          return (
            <div key={log.exerciseId} className={`session-exercise ${allSetsDone ? 'session-exercise--done' : ''}`}>
              <div className="session-ex-header">
                <MuscleIcon muscleGroup={exercise.muscleGroup} className="session-ex-icon" />
                <div className="session-ex-info">
                  <p className="session-ex-name">{exercise.name}</p>
                  <p className="session-ex-meta">{doneCount}/{target} sets{doneCount > target ? ` +${doneCount - target}` : ''}</p>
                </div>
                {!isCollapsed && (
                  <button
                    className={`session-notes-toggle ${openNotes.has(log.exerciseId) ? 'session-notes-toggle--open' : ''} ${log.notes ? 'session-notes-toggle--has-note' : ''}`}
                    onClick={e => { e.stopPropagation(); toggleNotes(log.exerciseId) }}
                    aria-label="Toggle notes"
                  >
                    📝
                  </button>
                )}
                <button
                  className="session-ex-remove"
                  onClick={e => { e.stopPropagation(); handleRemoveExercise(li) }}
                  aria-label="Remove exercise"
                >
                  ✕
                </button>
                <button
                  className={`session-collapse-btn ${isCollapsed ? '' : 'session-collapse-btn--open'}`}
                  onClick={() => toggleCollapse(log.exerciseId)}
                  aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  ›
                </button>
              </div>

              {!isCollapsed && (
                <>
                  <div className="session-sets">
                    {log.sets.map((set, si) => (
                      <SessionSetRow
                        key={si}
                        set={set}
                        index={si}
                        onChange={updated => updateSet(li, si, updated)}
                        onComplete={s => completeSet(li, si, s)}
                        onRescind={() => rescindSet(li, si)}
                        controllerSide={settings.controllerSide}
                        isCardio={isCardio}
                        unit={settings.unit}
                      />
                    ))}
                  </div>

                  <button className="session-add-set-btn" onClick={() => addSet(li)}>
                    + Add set
                  </button>

                  <div
                    className={`session-notes-wrap ${openNotes.has(log.exerciseId) ? 'session-notes-wrap--open' : ''}`}
                    ref={el => { noteRefs.current[log.exerciseId] = el }}
                  >
                    <textarea
                      className="session-notes-input"
                      placeholder="Add a note for this exercise…"
                      value={log.notes ?? ''}
                      onChange={e => updateNotes(li, e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>
          )
        })}

        {/* Add exercise */}
        <button className="session-add-ex-btn" onClick={() => setShowAddExercise(true)}>
          + Add exercise
        </button>

        {/* Finish nudge */}
        {allDone && (
          <div className="session-all-done">
            <p>💪 All sets done!</p>
            <button className="session-finish-big" onClick={handleFinish} disabled={finishing}>
              {finishing ? <span className="session-spinner session-spinner--dark" /> : 'Finish Workout'}
            </button>
          </div>
        )}

        {/* Abandon */}
        <button className="session-abandon-btn" onClick={() => setShowAbandon(true)}>
          Abandon workout
        </button>
      </div>

      {/* Rest timer overlay — backdrop blocks stray touch events on set rows */}
      {restDuration !== null && (
        <>
          <div className="rest-timer-backdrop" />
          <RestTimer
            key={restDuration}
            duration={restDuration}
            onDone={() => {
              setRestDuration(null)
              setTimerFlash(true)
              navigator.vibrate?.([200, 100, 200])
              setTimeout(() => setTimerFlash(false), 600)
            }}
            onSkip={() => setRestDuration(null)}
          />
        </>
      )}

      {/* Screen flash when rest timer ends */}
      {timerFlash && <div className="session-timer-flash" />}

      {/* Quick start save prompt */}
      {pendingQuickStart && (
        <div className="session-modal-overlay">
          <div className="session-modal session-modal--update">
            <p className="session-modal-title">Save this workout?</p>
            <p className="session-modal-body">Give it a name to add it to your workouts for next time.</p>
            <input
              className="session-modal-input"
              placeholder="Workout name…"
              value={newWorkoutName}
              onChange={e => setNewWorkoutName(e.target.value)}
              enterKeyHint="done"
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
              autoFocus
            />
            <div className="session-modal-actions">
              <button className="session-modal-secondary" onClick={() => onFinish(pendingQuickStart.session, template)}>
                Skip
              </button>
              <button
                className="session-modal-confirm session-modal-confirm--update"
                disabled={!newWorkoutName.trim()}
                onClick={() => handleSaveAsNewWorkout(pendingQuickStart.session, newWorkoutName)}
              >
                Save workout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update template prompt — shown after finish if exercise list diverged */}
      {pendingFinish && (() => {
        const templateExIds = new Set(template.exercises.map(e => e.exerciseId))
        const logExIds = new Set(logs.map(l => l.exerciseId))
        const added   = logs.filter(l => !templateExIds.has(l.exerciseId)).map(l => findExercise(l.exerciseId)?.name).filter(Boolean)
        const removed = template.exercises.filter(e => !logExIds.has(e.exerciseId)).map(e => findExercise(e.exerciseId)?.name).filter(Boolean)
        return (
          <div className="session-modal-overlay">
            <div className="session-modal session-modal--update">
              <p className="session-modal-title">Update your workout?</p>
              <p className="session-modal-body">
                We noticed you made changes to <strong>{template.name}</strong>:
              </p>
              {added.length > 0 && (
                <p className="session-modal-diff session-modal-diff--added">
                  + {added.join(', ')}
                </p>
              )}
              {removed.length > 0 && (
                <p className="session-modal-diff session-modal-diff--removed">
                  − {removed.join(', ')}
                </p>
              )}
              <p className="session-modal-body">Save these changes to your workout template?</p>
              <div className="session-modal-actions">
                <button className="session-modal-cancel" onClick={() => onFinish(pendingFinish.session, template)}>
                  Keep original
                </button>
                <button className="session-modal-confirm session-modal-confirm--update" onClick={() => handleUpdateTemplate(pendingFinish.session)}>
                  Update workout
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Add exercise overlay */}
      {showAddExercise && (
        <div className="session-add-ex-overlay">
          <div className="session-add-ex-header">
            <button className="session-add-ex-close" onClick={() => setShowAddExercise(false)}>Cancel</button>
            <p className="session-add-ex-title">Add Exercise</p>
            <div style={{ width: 64 }} />
          </div>
          <div className="session-add-ex-body">
            <ExerciseSearch onSelect={addExerciseToSession} placeholder="Search exercises…" />
          </div>
        </div>
      )}

      {/* Remove exercise confirm */}
      {confirmRemoveIndex !== null && (
        <div className="session-modal-overlay" onClick={() => setConfirmRemoveIndex(null)}>
          <div className="session-modal" onClick={e => e.stopPropagation()}>
            <p className="session-modal-title">Remove exercise?</p>
            <p className="session-modal-body">This exercise has completed sets. Removing it will discard that data.</p>
            <div className="session-modal-actions">
              <button className="session-modal-cancel" onClick={() => setConfirmRemoveIndex(null)}>Keep it</button>
              <button className="session-modal-confirm" onClick={() => doRemoveExercise(confirmRemoveIndex)}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Abandon confirm */}
      {showAbandon && (
        <div className="session-modal-overlay" onClick={() => setShowAbandon(false)}>
          <div className="session-modal" onClick={e => e.stopPropagation()}>
            <p className="session-modal-title">Abandon workout?</p>
            <p className="session-modal-body">Your progress won't be saved.</p>
            <div className="session-modal-actions">
              <button className="session-modal-cancel" onClick={() => setShowAbandon(false)}>Keep going</button>
              <button className="session-modal-confirm" onClick={onAbandon}>Abandon</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
