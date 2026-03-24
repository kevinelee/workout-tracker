import { useState, useEffect, useRef } from 'react'
import { createSession, createSet } from '../data/models'
import { defaultExercises } from '../data/exerciseLibrary'
import { getCustomExercises, getLastSessionForTemplate, getPRMap, getSettings, saveSession } from '../storage'
import MuscleIcon from '../components/MuscleIcon'
import SessionSetRow from '../components/SessionSetRow'
import RestTimer from '../components/RestTimer'
import './SessionScreen.css'

function findExercise(id) {
  return defaultExercises.find(e => e.id === id) ?? getCustomExercises().find(e => e.id === id) ?? null
}

function fmtElapsed(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function initLogsFromTemplate(template) {
  return template.exercises.map(te => ({
    exerciseId: te.exerciseId,
    sets: te.sets.map(s => ({ reps: s.reps, weight: s.weight, completed: false, isPR: false })),
    notes: te.notes ?? '',
  }))
}

function initLogsFromSession(template, lastSession) {
  return template.exercises.map(te => {
    const lastLog = lastSession.logs?.find(l => l.exerciseId === te.exerciseId)
    if (!lastLog) {
      return { exerciseId: te.exerciseId, sets: te.sets.map(s => ({ ...s, completed: false, isPR: false })), notes: '' }
    }
    return {
      exerciseId: te.exerciseId,
      sets: lastLog.sets.map(s => ({ reps: s.reps, weight: s.weight, completed: false, isPR: false })),
      notes: lastLog.notes ?? '',
    }
  })
}

export default function SessionScreen({ template, onFinish, onBack }) {
  const lastSession = getLastSessionForTemplate(template.id)
  const settings = getSettings()
  const exerciseIds = template.exercises.map(e => e.exerciseId)

  const sessionRef = useRef(createSession({ templateId: template.id, logs: [] }))
  const [logs, setLogs] = useState(() => initLogsFromTemplate(template))
  const [elapsed, setElapsed] = useState(0)
  const [restTimer, setRestTimer] = useState(null) // { seconds, total }
  const [prMap, setPRMap] = useState(() => getPRMap(exerciseIds))
  const [copiedBanner, setCopiedBanner] = useState(false)

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  function copyLastSession() {
    if (!lastSession) return
    setLogs(initLogsFromSession(template, lastSession))
    setCopiedBanner(true)
    setTimeout(() => setCopiedBanner(false), 2000)
  }

  function updateSet(logIndex, setIndex, updatedSet) {
    setLogs(prev =>
      prev.map((log, li) =>
        li !== logIndex ? log : {
          ...log,
          sets: log.sets.map((s, si) => si === setIndex ? updatedSet : s),
        }
      )
    )
  }

  function completeSet(logIndex, setIndex, set) {
    if (set.completed) return

    // PR check: is this weight higher than historical best?
    const exerciseId = logs[logIndex].exerciseId
    const currentPR = prMap[exerciseId] ?? 0
    const isPR = set.weight > 0 && set.weight > currentPR

    // Update in-session PR map so subsequent sets can beat this too
    if (isPR) {
      setPRMap(prev => ({ ...prev, [exerciseId]: set.weight }))
    }

    const completed = { ...set, completed: true, isPR }
    updateSet(logIndex, setIndex, completed)

    // Start rest timer
    setRestTimer({ seconds: settings.restTimerDuration, total: settings.restTimerDuration })
  }

  function handleRestTick(seconds) {
    setRestTimer(prev => prev ? { ...prev, seconds } : null)
  }

  function handleFinish() {
    const session = {
      ...sessionRef.current,
      logs,
      finishedAt: new Date().toISOString(),
      duration: elapsed,
    }
    saveSession(session)
    onFinish(session)
  }

  const totalSets = logs.reduce((sum, log) => sum + log.sets.length, 0)
  const completedSets = logs.reduce((sum, log) => sum + log.sets.filter(s => s.completed).length, 0)
  const allDone = completedSets === totalSets && totalSets > 0

  return (
    <div className="session">
      {/* Header */}
      <div className="session-header">
        <button className="session-back" onClick={onBack} aria-label="Back">‹</button>
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

          return (
            <div key={log.exerciseId} className={`session-exercise ${allSetsDone ? 'session-exercise--done' : ''}`}>
              <div className="session-ex-header">
                <MuscleIcon muscleGroup={exercise.muscleGroup} className="session-ex-icon" />
                <div className="session-ex-info">
                  <p className="session-ex-name">{exercise.name}</p>
                  <p className="session-ex-meta">{doneCount}/{log.sets.length} sets</p>
                </div>
              </div>

              <div className="session-sets">
                {log.sets.map((set, si) => (
                  <SessionSetRow
                    key={si}
                    set={set}
                    index={si}
                    onChange={updated => updateSet(li, si, updated)}
                    onComplete={s => completeSet(li, si, s)}
                  />
                ))}
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
    </div>
  )
}
