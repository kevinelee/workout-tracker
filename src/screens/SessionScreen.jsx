import { useState, useEffect, useRef, useCallback } from 'react'
import { createSet } from '../data/models'
import { defaultExercises } from '../data/exerciseLibrary'
import { getCachedCustomExercises, getLastSessionForTemplate, saveSession } from '../storage'
import { initLogsFromSession } from '../App'
import MuscleIcon from '../components/MuscleIcon'
import SessionSetRow from '../components/SessionSetRow'
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
  const [restTimer, setRestTimer] = useState(null)
  const [copiedBanner, setCopiedBanner] = useState(false)
  const [showAbandon, setShowAbandon] = useState(false)
  const [openNotes, setOpenNotes] = useState(new Set())
  const noteRefs = useRef({})

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
      setRestTimer({ seconds: settings.restTimerDuration, total: settings.restTimerDuration })
    }
  }

  function updateNotes(logIndex, text) {
    const newLogs = logs.map((log, li) => li !== logIndex ? log : { ...log, notes: text })
    updateLogsAndSync(newLogs, null)
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

  function handleRestTick(seconds) {
    setRestTimer(prev => prev ? { ...prev, seconds } : null)
  }

  async function handleFinish() {
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
    onFinish(session, template)
  }

  const totalSets     = logs.reduce((sum, log) => sum + log.sets.length, 0)
  const completedSets = logs.reduce((sum, log) => sum + log.sets.filter(s => s.completed).length, 0)
  const allDone       = completedSets === totalSets && totalSets > 0

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
          >
            Finish
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
          const doneCount = log.sets.filter(s => s.completed).length
          const allSetsDone = doneCount === log.sets.length

          const isCardio = exercise.category === 'Cardio'

          return (
            <div key={log.exerciseId} className={`session-exercise ${allSetsDone ? 'session-exercise--done' : ''}`}>
              <div className="session-ex-header">
                <MuscleIcon muscleGroup={exercise.muscleGroup} className="session-ex-icon" />
                <div className="session-ex-info">
                  <p className="session-ex-name">{exercise.name}</p>
                  <p className="session-ex-meta">{doneCount}/{log.sets.length} sets</p>
                </div>
                <button
                  className={`session-notes-toggle ${openNotes.has(log.exerciseId) ? 'session-notes-toggle--open' : ''} ${log.notes ? 'session-notes-toggle--has-note' : ''}`}
                  onClick={() => toggleNotes(log.exerciseId)}
                  aria-label="Toggle notes"
                >
                  📝
                </button>
              </div>

              <div className="session-sets">
                {log.sets.map((set, si) => (
                  <SessionSetRow
                    key={si}
                    set={set}
                    index={si}
                    onChange={updated => updateSet(li, si, updated)}
                    onComplete={s => completeSet(li, si, s)}
                    controllerSide={settings.controllerSide}
                    isCardio={isCardio}
                  />
                ))}
              </div>

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
            </div>
          )
        })}

        {/* Finish nudge */}
        {allDone && (
          <div className="session-all-done">
            <p>💪 All sets done!</p>
            <button className="session-finish-big" onClick={handleFinish}>Finish Workout</button>
          </div>
        )}

        {/* Abandon */}
        <button className="session-abandon-btn" onClick={() => setShowAbandon(true)}>
          Abandon workout
        </button>
      </div>

      {/* Rest timer overlay */}
      {restTimer && (
        <RestTimer
          seconds={restTimer.seconds}
          total={restTimer.total}
          onSkip={() => setRestTimer(null)}
          onTick={handleRestTick}
        />
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
