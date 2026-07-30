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

function NotesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <rect x="4" y="2" width="12" height="16" rx="2" />
      <line x1="7" y1="7" x2="13" y2="7" />
      <line x1="7" y1="10" x2="13" y2="10" />
      <line x1="7" y1="13" x2="11" y2="13" />
    </svg>
  )
}

function findExercise(id) {
  return defaultExercises.find(e => e.id === id) ?? getCachedCustomExercises().find(e => e.id === id) ?? null
}

// Best reps logged at this weight or heavier — a lighter weight you've never
// tried isn't a real rep PR if you've already out-repped it at more weight.
function bestRepsAtOrAboveWeight(weightBucket, weight) {
  let best = 0
  for (const w in weightBucket) {
    if (Number(w) >= weight) best = Math.max(best, weightBucket[w])
  }
  return best
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

export default function SessionScreen({ activeSession, settings, programId, onUpdate, onFinish, onMinimize, onAbandon }) {
  const { template, sessionId, startedAt, logs: initialLogs, prMap: initialPrMap, prRepsMap: initialPrRepsMap, repPRByWeightMap: initialRepPRByWeightMap, aiBreakdown } = activeSession
  const hasBreakdown = !!(aiBreakdown && (aiBreakdown.headline || aiBreakdown.suggestions?.length))
  const [showBreakdown, setShowBreakdown] = useState(false)

  const [logs, setLogs]           = useState(initialLogs)
  const [prMap, setPRMap]         = useState(initialPrMap)
  const [prRepsMap, setPRRepsMap] = useState(initialPrRepsMap ?? {})
  const [repPRByWeightMap, setRepPRByWeightMap] = useState(initialRepPRByWeightMap ?? {})
  const basePrMapRef              = useRef(initialPrMap)
  const basePrRepsMapRef          = useRef(initialPrRepsMap ?? {})
  const baseRepPRByWeightMapRef   = useRef(initialRepPRByWeightMap ?? {})
  const [elapsed, setElapsed] = useState(() => elapsedFromStart(startedAt))
  const [restDuration, setRestDuration] = useState(null)
  const [timerFlash, setTimerFlash] = useState(false)
  const [copiedBanner, setCopiedBanner] = useState(false)
  const [showAbandon, setShowAbandon]       = useState(false)
  const [showTimeLimit, setShowTimeLimit]   = useState(false)
  const timeLimitDismissedAt                = useRef(null)
  const lastActivityAt                      = useRef(Date.now())
  const [timerFrozen, setTimerFrozen]       = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [manualDuration, setManualDuration] = useState(null)
  const [showTimerEdit, setShowTimerEdit] = useState(false)
  const [timerEditH, setTimerEditH] = useState(0)
  const [timerEditM, setTimerEditM] = useState(0)
  const [timerEditS, setTimerEditS] = useState(0)
  const [openNotes, setOpenNotes] = useState(new Set())
  const [collapsedExercises, setCollapsedExercises] = useState(new Set())
  const [editMode, setEditMode] = useState(false)
  const [editVisible, setEditVisible] = useState(false)
  const editExitRef = useRef(null)
  const [warnPending, setWarnPending] = useState(false)
  const warnTimerRef = useRef(null)
  const noteRefs = useRef({})

  const [celebratingExercise, setCelebratingExercise] = useState(null)
  const celebrateTimerRef    = useRef(null)

  const [showAddExercise, setShowAddExercise] = useState(false)
  const [substituteIndex, setSubstituteIndex] = useState(null)
  const [confirmSubstituteIndex, setConfirmSubstituteIndex] = useState(null)
  const [confirmRemoveIndex, setConfirmRemoveIndex] = useState(null)
  const [confirmRemoveSet, setConfirmRemoveSet]     = useState(null) // { logIndex, setIndex }
  const [pendingFinish, setPendingFinish] = useState(null)
  const [pendingQuickStart, setPendingQuickStart] = useState(null)
  const [newWorkoutName, setNewWorkoutName] = useState('')
  const [modalSaving, setModalSaving] = useState(false)

  const [lastSession, setLastSession] = useState(null)
  useEffect(() => {
    if (template.isQuickStart) return
    getLastSessionForTemplate(template.id).then(setLastSession)
  }, [template.id])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      if (confirmRemoveSet !== null)      { setConfirmRemoveSet(null); return }
      if (confirmRemoveIndex !== null)    { setConfirmRemoveIndex(null); return }
      if (confirmSubstituteIndex !== null){ setConfirmSubstituteIndex(null); return }
      if (substituteIndex !== null)       { setSubstituteIndex(null); return }
      if (showAbandon)                    { setShowAbandon(false); return }
      if (showAddExercise)                { setShowAddExercise(false); return }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [confirmRemoveSet, confirmRemoveIndex, confirmSubstituteIndex, substituteIndex, showAbandon, showAddExercise])

  // Elapsed timer + stasis freeze + 3-hour time limit check
  useEffect(() => {
    const THREE_HOURS = 3 * 60 * 60
    const ONE_HOUR_MS = 60 * 60 * 1000
    function tick() {
      const idleMs = Date.now() - lastActivityAt.current
      if (idleMs >= ONE_HOUR_MS) {
        const frozenSecs = Math.floor((lastActivityAt.current - new Date(startedAt).getTime()) / 1000)
        setElapsed(frozenSecs)
        setTimerFrozen(true)
        return
      }
      setTimerFrozen(false)
      const secs = elapsedFromStart(startedAt)
      setElapsed(secs)
      if (secs >= THREE_HOURS && !showTimeLimit) {
        const lastDismissed = timeLimitDismissedAt.current
        if (!lastDismissed || (Date.now() - lastDismissed) >= ONE_HOUR_MS) {
          setShowTimeLimit(true)
        }
      }
    }
    const id = setInterval(tick, 1000)
    function onVisible() {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [startedAt, showTimeLimit])

  // Clear warn + celebrate timers when navigating away
  useEffect(() => () => {
    clearTimeout(warnTimerRef.current)
    clearTimeout(celebrateTimerRef.current)
    clearTimeout(editExitRef.current)
  }, [])


  function updateLogsAndSync(newLogs, newPrMap, newPrRepsMap, newRepPRByWeightMap) {
    setLogs(newLogs)
    if (newPrMap) setPRMap(newPrMap)
    if (newPrRepsMap) setPRRepsMap(newPrRepsMap)
    if (newRepPRByWeightMap) setRepPRByWeightMap(newRepPRByWeightMap)
    onUpdate(newLogs, newPrMap ?? prMap, newPrRepsMap ?? prRepsMap, newRepPRByWeightMap ?? repPRByWeightMap)
  }

  function recalcPrRepsMapForExercise(newPrMap, newLogs, exerciseId) {
    const baseline     = basePrMapRef.current[exerciseId] ?? 0
    const baselineReps = basePrRepsMapRef.current[exerciseId] ?? 0
    const newMaxWeight = newPrMap[exerciseId] ?? 0
    if (newMaxWeight <= baseline) return { ...prRepsMap, [exerciseId]: baselineReps }
    const bestSet = newLogs
      .filter(l => l.exerciseId === exerciseId)
      .flatMap(l => l.sets.filter(s => s.completed && s.weight === newMaxWeight))
      .reduce((best, s) => (!best || s.reps > best.reps) ? s : best, null)
    return { ...prRepsMap, [exerciseId]: bestSet?.reps ?? baselineReps }
  }

  function recalcRepPRByWeightMapForExercise(newLogs, exerciseId) {
    const bucket = { ...(baseRepPRByWeightMapRef.current[exerciseId] ?? {}) }
    newLogs
      .filter(l => l.exerciseId === exerciseId)
      .flatMap(l => l.sets.filter(s => s.completed && s.weight > 0))
      .forEach(s => { bucket[s.weight] = Math.max(bucket[s.weight] ?? 0, s.reps) })
    return { ...repPRByWeightMap, [exerciseId]: bucket }
  }

  function copyLastSession() {
    if (!lastSession) return
    const newLogs = initLogsFromSession(template, lastSession)
    updateLogsAndSync(newLogs, prMap)
    setCopiedBanner(true)
    setTimeout(() => setCopiedBanner(false), 2000)
  }

  function updateSet(logIndex, setIndex, updatedSet) {
    const oldSet = logs[logIndex].sets[setIndex]
    const weightChanged = updatedSet.weight !== oldSet.weight
    const repsChanged   = updatedSet.reps   !== oldSet.reps
    const newLogs = logs.map((log, li) =>
      li !== logIndex ? log : {
        ...log,
        sets: log.sets.map((s, si) => {
          if (si === setIndex) return updatedSet
          // Cascade changed values to uncompleted sets below with matching old values
          if (si > setIndex && !s.completed) {
            const cascaded = { ...s }
            if (weightChanged && s.weight === oldSet.weight) cascaded.weight = updatedSet.weight
            if (repsChanged   && s.reps   === oldSet.reps)   cascaded.reps   = updatedSet.reps
            return cascaded
          }
          return s
        }),
      }
    )
    updateLogsAndSync(newLogs, null)
  }

  function completeSet(logIndex, setIndex, set) {
    if (set.completed) return
    const log = logs[logIndex]
    const exerciseId = log.exerciseId
    const exercise = findExercise(exerciseId)
    const prType = exercise?.prType ?? 'weight'
    const currentPR = prMap[exerciseId] ?? 0

    let isPR, newPrMap, newPrRepsMap, newRepPRByWeightMap

    if (prType === 'reps') {
      isPR = set.reps > 0 && set.reps > currentPR
      newPrMap = isPR ? { ...prMap, [exerciseId]: set.reps } : prMap
      newPrRepsMap = null
      newRepPRByWeightMap = null
    } else {
      const isWeightPR = set.weight > 0 && set.weight > currentPR
      const weightBucket = repPRByWeightMap[exerciseId] ?? {}
      const bestRepsAtWeight = bestRepsAtOrAboveWeight(weightBucket, set.weight)
      const isRepPR = set.weight > 0 && set.reps > bestRepsAtWeight
      isPR = isWeightPR || isRepPR
      newPrMap = isWeightPR ? { ...prMap, [exerciseId]: set.weight } : prMap
      newPrRepsMap = isWeightPR ? { ...prRepsMap, [exerciseId]: set.reps } : null
      newRepPRByWeightMap = isPR
        ? { ...repPRByWeightMap, [exerciseId]: { ...weightBucket, [set.weight]: Math.max(bestRepsAtWeight, set.reps) } }
        : null
    }

    const newLogs = logs.map((l, li) =>
      li !== logIndex ? l : {
        ...l,
        sets: l.sets.map((s, si) => si === setIndex ? { ...set, completed: true, isPR } : s),
      }
    )
    lastActivityAt.current = Date.now()
    updateLogsAndSync(newLogs, newPrMap, newPrRepsMap, newRepPRByWeightMap)
    if (settings.restTimerDuration > 0) setRestDuration(settings.restTimerDuration)

    // Celebrate when all sets (including any added extras) are done
    const target = log.sets.length
    const nowDone = log.sets.filter(s => s.completed).length + 1
    if (nowDone >= target) {
      clearTimeout(celebrateTimerRef.current)
      setCelebratingExercise(exerciseId)
      celebrateTimerRef.current = setTimeout(() => setCelebratingExercise(null), 1200)
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

  function removeSet(logIndex, setIndex) {
    const log = logs[logIndex]
    if (log.sets.length <= 1) return
    const removedSet = log.sets[setIndex]
    const newSets = log.sets.filter((_, i) => i !== setIndex)
    const newTargetCount = removedSet.isBonus
      ? log.targetCount
      : Math.max(1, (log.targetCount ?? log.sets.length) - 1)
    const newLogs = logs.map((l, li) =>
      li !== logIndex ? l : { ...l, sets: newSets, targetCount: newTargetCount }
    )
    let newPrMap = prMap
    let newPrRepsMap = null
    let newRepPRByWeightMap = null
    if (removedSet.isPR) {
      const exerciseId = log.exerciseId
      const exercise = findExercise(exerciseId)
      const prType = exercise?.prType ?? 'weight'
      const baseline = basePrMapRef.current[exerciseId] ?? 0
      const sessionMax = newLogs
        .filter(l => l.exerciseId === exerciseId)
        .flatMap(l => l.sets.filter(s => s.completed && (prType === 'reps' ? s.reps > 0 : s.weight > 0)))
        .reduce((max, s) => Math.max(max, prType === 'reps' ? s.reps : s.weight), 0)
      newPrMap = { ...prMap, [exerciseId]: Math.max(baseline, sessionMax) }
      if (prType !== 'reps') {
        newPrRepsMap = recalcPrRepsMapForExercise(newPrMap, newLogs, exerciseId)
        newRepPRByWeightMap = recalcRepPRByWeightMapForExercise(newLogs, exerciseId)
      }
    }
    updateLogsAndSync(newLogs, newPrMap, newPrRepsMap, newRepPRByWeightMap)
  }

  function rescindSet(logIndex, setIndex) {
    const rescindedSet = logs[logIndex].sets[setIndex]
    const newLogs = logs.map((log, li) =>
      li !== logIndex ? log : {
        ...log,
        sets: log.sets.map((s, si) => si === setIndex ? { ...s, completed: false, isPR: false } : s),
      }
    )
    let newPrMap = prMap
    let newPrRepsMap = null
    let newRepPRByWeightMap = null
    if (rescindedSet.isPR) {
      const exerciseId = logs[logIndex].exerciseId
      const exercise = findExercise(exerciseId)
      const prType = exercise?.prType ?? 'weight'
      const baseline = basePrMapRef.current[exerciseId] ?? 0
      const sessionMax = newLogs
        .filter(l => l.exerciseId === exerciseId)
        .flatMap(l => l.sets.filter(s => s.completed && (prType === 'reps' ? s.reps > 0 : s.weight > 0)))
        .reduce((max, s) => Math.max(max, prType === 'reps' ? s.reps : s.weight), 0)
      newPrMap = { ...prMap, [exerciseId]: Math.max(baseline, sessionMax) }
      if (prType !== 'reps') {
        newPrRepsMap = recalcPrRepsMapForExercise(newPrMap, newLogs, exerciseId)
        newRepPRByWeightMap = recalcRepPRByWeightMapForExercise(newLogs, exerciseId)
      }
    }
    updateLogsAndSync(newLogs, newPrMap, newPrRepsMap, newRepPRByWeightMap)
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
    setConfirmRemoveIndex(logIndex)
  }

  function handleSubstituteExercise(logIndex) {
    const hasCompleted = logs[logIndex].sets.some(s => s.completed)
    if (hasCompleted) setConfirmSubstituteIndex(logIndex)
    else setSubstituteIndex(logIndex)
  }

  function doSubstituteExercise(newExercise) {
    const oldLog = logs[substituteIndex]
    const setCount = oldLog.targetCount ?? oldLog.sets.length
    const newLog = {
      exerciseId:  newExercise.id,
      targetCount: setCount,
      sets: Array.from({ length: setCount }, () => ({ reps: 0, weight: 0, completed: false, isPR: false })),
      notes: '',
    }
    updateLogsAndSync(logs.map((l, i) => i === substituteIndex ? newLog : l), null)
    setSubstituteIndex(null)
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
        templateId: template.isQuickStart ? null : template.id,
        startedAt,
        finishedAt: new Date().toISOString(),
        duration: manualDuration ?? elapsed,
        logs,
        prMap,
      }
      await saveSession(session)

      if (template.isQuickStart) {
        setNewWorkoutName(template.name)
        setPendingQuickStart({ session })
        setFinishing(false)
        return
      }

      const templateIds = template.exercises.map(e => e.exerciseId).sort().join()
      const logIds = logs.map(l => l.exerciseId).sort().join()
      const setCountChanged = logs.some(log => {
        const tmplEx = template.exercises.find(e => e.exerciseId === log.exerciseId)
        return tmplEx && log.sets.length !== tmplEx.sets.length
      })
      if (templateIds !== logIds || setCountChanged) {
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

  function handleFinishClick() {
    const underHalf = totalSets > 0 && completedSets < totalSets / 2
    if (underHalf && !warnPending) {
      setWarnPending(true)
      clearTimeout(warnTimerRef.current)
      warnTimerRef.current = setTimeout(() => setWarnPending(false), 3000)
      return
    }
    clearTimeout(warnTimerRef.current)
    setWarnPending(false)
    handleFinish()
  }

  async function handleSaveAsNewWorkout(session, name) {
    setModalSaving(true)
    const savedExercises = logs.map(log => {
      const existing = template.exercises.find(e => e.exerciseId === log.exerciseId)
      if (existing) return existing
      const targetSets = log.sets.slice(0, log.targetCount ?? log.sets.length)
      return createTemplateExercise({
        exerciseId: log.exerciseId,
        sets: targetSets.map(s => ({ reps: s.reps, weight: s.weight })),
      })
    })
    const savedTemplate = { ...template, name: name.trim(), isQuickStart: false, exercises: savedExercises, programId: programId ?? null }
    try { await saveTemplate(savedTemplate) } catch (err) { console.error(err); setModalSaving(false); return }
    onFinish(session, savedTemplate)
  }

  async function handleUpdateTemplate(session) {
    setModalSaving(true)
    const updatedExercises = logs.map(log => {
      const existing = template.exercises.find(e => e.exerciseId === log.exerciseId)
      if (existing) {
        if (log.sets.length === existing.sets.length) return existing
        const last = existing.sets[existing.sets.length - 1] ?? { reps: 0, weight: 0 }
        const newSets = Array.from({ length: log.sets.length }, (_, i) =>
          i < existing.sets.length ? existing.sets[i] : { reps: last.reps, weight: last.weight }
        )
        return { ...existing, sets: newSets }
      }
      const targetSets = log.sets.slice(0, log.targetCount ?? log.sets.length)
      return createTemplateExercise({
        exerciseId: log.exerciseId,
        sets: targetSets.map(s => ({ reps: s.reps, weight: s.weight })),
      })
    })
    const updatedTemplate = { ...template, exercises: updatedExercises }
    try { await saveTemplate(updatedTemplate) } catch (err) { console.error(err); setModalSaving(false); return }
    onFinish(session, updatedTemplate)
  }

  const editExiting = editVisible && !editMode

  function toggleEdit() {
    if (editMode) {
      setEditMode(false)
      clearTimeout(editExitRef.current)
      editExitRef.current = setTimeout(() => setEditVisible(false), 160)
    } else {
      clearTimeout(editExitRef.current)
      setEditVisible(true)
      setEditMode(true)
    }
  }

  const totalSets     = logs.reduce((sum, log) => sum + (log.targetCount ?? log.sets.length), 0)
  const completedSets = logs.reduce((sum, log) => {
    const target = log.targetCount ?? log.sets.length
    return sum + Math.min(log.sets.filter(s => s.completed).length, target)
  }, 0)
  const allDone   = completedSets === totalSets && totalSets > 0
  const underHalf = totalSets > 0 && completedSets < totalSets / 2

  return (
    <div className="session">
      {/* Sticky header + progress bar */}
      <div className="session-sticky">
        <div className="session-header">
          <button className="session-back" onClick={onMinimize} aria-label="Minimize">‹</button>
          <div className="session-title-wrap">
            <h2 className="session-name">{template.name}</h2>
            <button
              className="session-timer"
              onClick={() => {
                const secs = manualDuration ?? elapsed
                setTimerEditH(Math.floor(secs / 3600))
                setTimerEditM(Math.floor((secs % 3600) / 60))
                setTimerEditS(secs % 60)
                setShowTimerEdit(true)
              }}
              aria-label="Edit duration"
            >
              {fmtElapsed(manualDuration ?? elapsed)}
              {manualDuration != null && <span className="session-timer-edited">✎</span>}
              {timerFrozen && manualDuration == null && <span className="session-timer-frozen">❄</span>}
            </button>
          </div>
          <button
            className={`session-edit-btn ${editMode ? 'session-edit-btn--active' : ''}`}
            onClick={toggleEdit}
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>

        <div className="session-progress-bar">
          <div
            className={`session-progress-fill${allDone ? ' session-progress-fill--done' : ''}`}
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

        {/* AI breakdown recap */}
        {hasBreakdown && (
          <button className="session-breakdown-btn" onClick={() => setShowBreakdown(true)}>
            <span>✨</span>
            <span>View AI breakdown</span>
          </button>
        )}

        {/* Exercise blocks */}
        {logs.map((log, li) => {
          const exercise = findExercise(log.exerciseId)
          if (!exercise) return null
          const doneCount   = log.sets.filter(s => s.completed).length
          const target      = log.targetCount ?? log.sets.length
          const allSetsDone = doneCount >= target
          const isCardio    = exercise.category === 'Cardio'
          const cardioUnit  = exercise.cardioUnit ?? 'time'
          const isStretch   = exercise.category === 'Stretch' || exercise.isTimed
          const exPrType    = exercise?.prType ?? 'weight'
          const exPR        = prMap[log.exerciseId] ?? 0
          const exPRReps    = prRepsMap[log.exerciseId] ?? 0
          const prLabel     = exPR > 0 && !isCardio && !isStretch
            ? exPrType === 'reps'
              ? `${exPR} reps`
              : settings.unit === 'kg'
                ? `${Math.round(exPR / 2.2046)} kg${exPRReps > 0 ? ` × ${exPRReps}` : ''}`
                : `${exPR} lbs${exPRReps > 0 ? ` × ${exPRReps}` : ''}`
            : null
          const lastLog = lastSession?.logs?.find(l => l.exerciseId === log.exerciseId)
          const lastHint = (() => {
            if (!lastLog || isCardio || isStretch) return null
            const s = lastLog.sets?.[0]
            if (!s) return null
            if (s.weight > 0) {
              const w = settings.unit === 'kg' ? Math.round(s.weight / 2.2046) : s.weight
              return `${w} × ${s.reps}`
            }
            return s.reps > 0 ? `${s.reps} reps` : null
          })()
          const isCollapsed = collapsedExercises.has(log.exerciseId)
          const isNextActiveExercise = !editMode && logs.findIndex(l => l.sets.some(s => !s.completed)) === li
          const nextActiveIndex = isNextActiveExercise ? log.sets.findIndex(s => !s.completed) : -1
          const isCelebrating = celebratingExercise === log.exerciseId

          return (
            <div key={log.exerciseId} className={`session-exercise ${allSetsDone ? 'session-exercise--done' : ''} ${isCelebrating ? 'session-exercise--celebrating' : ''}`}>
              <div className="session-ex-header">
                <MuscleIcon muscleGroup={exercise.muscleGroup} className="session-ex-icon" />
                <div className="session-ex-info">
                  <p className="session-ex-name">{exercise.name}</p>
                  <p className={`session-ex-meta${allSetsDone ? ' session-ex-meta--done' : ''}`}>
                    {allSetsDone ? '✓ ' : ''}{doneCount}/{target} sets{doneCount > target ? ` +${doneCount - target}` : ''}
                    {lastHint && <span className="session-ex-pr-label"> · {lastHint}</span>}
                    {prLabel && <span className="session-ex-pr-label"> · {prLabel}</span>}
                  </p>
                </div>
                {editVisible && (
                  <button
                    className={`session-ex-swap${editExiting ? ' session-edit-exiting' : ''}`}
                    onClick={e => { e.stopPropagation(); handleSubstituteExercise(li) }}
                    aria-label="Substitute exercise"
                    disabled={editExiting}
                  >
                    ⇄
                  </button>
                )}
                {editVisible && (
                  <button
                    className={`session-notes-toggle ${openNotes.has(log.exerciseId) ? 'session-notes-toggle--open' : ''} ${log.notes ? 'session-notes-toggle--has-note' : ''}${editExiting ? ' session-edit-exiting' : ''}`}
                    onClick={e => { e.stopPropagation(); toggleNotes(log.exerciseId) }}
                    aria-label="Toggle notes"
                    disabled={editExiting}
                  >
                    <NotesIcon />
                  </button>
                )}
                {editVisible && (
                  <button
                    className={`session-ex-remove${editExiting ? ' session-edit-exiting' : ''}`}
                    onClick={e => { e.stopPropagation(); handleRemoveExercise(li) }}
                    aria-label="Remove exercise"
                    disabled={editExiting}
                  >
                    ✕
                  </button>
                )}
                <button
                  className={`session-collapse-btn ${isCollapsed ? '' : 'session-collapse-btn--open'}`}
                  onClick={() => toggleCollapse(log.exerciseId)}
                  aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  ›
                </button>
              </div>

              <div className={`session-ex-body ${isCollapsed ? 'session-ex-body--collapsed' : ''}`}>
              <div className="session-ex-body-inner">
                {editVisible && (
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
                )}

                <div className="session-sets">
                  {log.sets.map((set, si) => (
                    <SessionSetRow
                      key={si}
                      set={set}
                      index={si}
                      onChange={updated => updateSet(li, si, updated)}
                      onComplete={s => completeSet(li, si, s)}
                      onRescind={() => rescindSet(li, si)}
                      onRemove={log.sets.length > 1 ? () => setConfirmRemoveSet({ logIndex: li, setIndex: si }) : undefined}
                      controllerSide={settings.controllerSide}
                      isCardio={isCardio}
                      cardioUnit={cardioUnit}
                      isStretch={isStretch}
                      unit={settings.unit}
                      editMode={editMode}
                      editExiting={editExiting}
                      isActive={si === nextActiveIndex}
                      currentPR={prMap[log.exerciseId] ?? 0}
                      bestRepsAtWeight={bestRepsAtOrAboveWeight(repPRByWeightMap[log.exerciseId] ?? {}, set.weight)}
                      prType={exercise?.prType ?? 'weight'}
                      difficultyLabel={exercise.difficultyLabel}
                      difficultyDecimal={exercise.difficultyDecimal}
                    />
                  ))}
                </div>

                {editVisible && (
                  <button
                    className={`session-add-set-btn${editExiting ? ' session-edit-exiting' : ''}`}
                    onClick={() => addSet(li)}
                    disabled={editExiting}
                  >
                    + Add set
                  </button>
                )}
              </div>
              </div>
            </div>
          )
        })}

        {/* Add exercise — only in edit mode */}
        {editVisible && (
          <button
            className={`session-add-ex-btn${editExiting ? ' session-edit-exiting' : ''}`}
            onClick={() => setShowAddExercise(true)}
            disabled={editExiting}
          >
            + Add exercise
          </button>
        )}

        {/* Finish + Abandon */}
        <div className="session-finish-inline">
          {allDone && (
            <p className="session-finish-all-done">All sets complete!</p>
          )}
          {!allDone && warnPending && (
            <p className="session-finish-warning">
              Only {completedSets}/{totalSets} sets done — tap again to finish anyway
            </p>
          )}
          <button
            className={`session-finish-main ${allDone ? 'session-finish-main--done' : ''} ${warnPending ? 'session-finish-main--warn' : ''}`}
            onClick={handleFinishClick}
            disabled={finishing}
          >
            {finishing
              ? <span className="session-spinner" />
              : warnPending
                ? 'Tap again to confirm'
                : 'Finish Workout'}
          </button>
          <button className="session-abandon-btn" onClick={() => setShowAbandon(true)}>
            Abandon workout
          </button>
        </div>
      </div>

      {/* Rest timer overlay */}
      {restDuration !== null && (
        <>
          <div className="rest-timer-backdrop" onClick={() => setRestDuration(null)} />
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
              <button className="session-modal-secondary" disabled={modalSaving} onClick={() => onFinish(pendingQuickStart.session, template)}>
                Skip
              </button>
              <button
                className="session-modal-confirm session-modal-confirm--update"
                disabled={!newWorkoutName.trim() || modalSaving}
                onClick={() => handleSaveAsNewWorkout(pendingQuickStart.session, newWorkoutName)}
              >
                {modalSaving ? <span className="session-spinner session-spinner--dark" /> : 'Save workout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update template prompt */}
      {pendingFinish && (() => {
        const templateExIds = new Set(template.exercises.map(e => e.exerciseId))
        const logExIds = new Set(logs.map(l => l.exerciseId))
        const added   = logs.filter(l => !templateExIds.has(l.exerciseId)).map(l => findExercise(l.exerciseId)?.name).filter(Boolean)
        const removed = template.exercises.filter(e => !logExIds.has(e.exerciseId)).map(e => findExercise(e.exerciseId)?.name).filter(Boolean)
        const setChanges = logs.flatMap(log => {
          const tmplEx = template.exercises.find(e => e.exerciseId === log.exerciseId)
          if (!tmplEx || log.sets.length === tmplEx.sets.length) return []
          const name = findExercise(log.exerciseId)?.name ?? log.exerciseId
          return [`${name} (${tmplEx.sets.length} → ${log.sets.length} sets)`]
        })
        return (
          <div className="session-modal-overlay">
            <div className="session-modal session-modal--update">
              <p className="session-modal-title">Update your workout?</p>
              <p className="session-modal-body">We noticed you made changes to <strong>{template.name}</strong>:</p>
              {added.length > 0 && <p className="session-modal-diff session-modal-diff--added">+ {added.join(', ')}</p>}
              {removed.length > 0 && <p className="session-modal-diff session-modal-diff--removed">− {removed.join(', ')}</p>}
              {setChanges.length > 0 && <p className="session-modal-diff session-modal-diff--added">{setChanges.join(', ')}</p>}
              <p className="session-modal-body">Save these changes to your workout template?</p>
              <div className="session-modal-actions">
                <button className="session-modal-cancel" disabled={modalSaving} onClick={() => onFinish(pendingFinish.session, template)}>Keep original</button>
                <button
                  className="session-modal-confirm session-modal-confirm--update"
                  disabled={modalSaving}
                  onClick={() => handleUpdateTemplate(pendingFinish.session)}
                >
                  {modalSaving ? <span className="session-spinner session-spinner--dark" /> : 'Update workout'}
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

      {/* Substitute exercise overlay */}
      {substituteIndex !== null && (
        <div className="session-add-ex-overlay">
          <div className="session-add-ex-header">
            <button className="session-add-ex-close" onClick={() => setSubstituteIndex(null)}>Cancel</button>
            <p className="session-add-ex-title">Substitute Exercise</p>
            <div style={{ width: 64 }} />
          </div>
          <div className="session-add-ex-body">
            <ExerciseSearch
              onSelect={doSubstituteExercise}
              placeholder="Search exercises…"
              excludeIds={logs.filter((_, i) => i !== substituteIndex).map(l => l.exerciseId)}
            />
          </div>
        </div>
      )}

      {/* Substitute confirm (has completed sets) */}
      {confirmSubstituteIndex !== null && (
        <div className="session-modal-overlay" onClick={() => setConfirmSubstituteIndex(null)}>
          <div className="session-modal" onClick={e => e.stopPropagation()}>
            <p className="session-modal-title">Replace exercise?</p>
            <p className="session-modal-body">
              {findExercise(logs[confirmSubstituteIndex]?.exerciseId)?.name} has completed sets — they'll be discarded.
            </p>
            <div className="session-modal-actions">
              <button className="session-modal-cancel" onClick={() => setConfirmSubstituteIndex(null)}>Keep it</button>
              <button className="session-modal-confirm" onClick={() => {
                setSubstituteIndex(confirmSubstituteIndex)
                setConfirmSubstituteIndex(null)
              }}>Replace</button>
            </div>
          </div>
        </div>
      )}

      {/* Remove set confirm */}
      {confirmRemoveSet !== null && (
        <div className="session-modal-overlay" onClick={() => setConfirmRemoveSet(null)}>
          <div className="session-modal" onClick={e => e.stopPropagation()}>
            <p className="session-modal-title">Remove set?</p>
            <p className="session-modal-body">
              {logs[confirmRemoveSet.logIndex]?.sets[confirmRemoveSet.setIndex]?.completed
                ? 'This set has been logged. Removing it will discard that data.'
                : 'This set will be removed.'}
            </p>
            <div className="session-modal-actions">
              <button className="session-modal-cancel" onClick={() => setConfirmRemoveSet(null)}>Keep it</button>
              <button className="session-modal-confirm" onClick={() => {
                removeSet(confirmRemoveSet.logIndex, confirmRemoveSet.setIndex)
                setConfirmRemoveSet(null)
              }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Remove exercise confirm */}
      {confirmRemoveIndex !== null && (
        <div className="session-modal-overlay" onClick={() => setConfirmRemoveIndex(null)}>
          <div className="session-modal" onClick={e => e.stopPropagation()}>
            <p className="session-modal-title">Remove exercise?</p>
            <p className="session-modal-body">{logs[confirmRemoveIndex]?.sets.some(s => s.completed) ? 'This exercise has completed sets. Removing it will discard that data.' : 'This exercise will be removed from the session.'}</p>
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

      {/* Timer edit modal */}
      {showTimerEdit && (
        <div className="session-modal-overlay" onClick={() => setShowTimerEdit(false)}>
          <div className="session-modal" onClick={e => e.stopPropagation()}>
            <p className="session-modal-title">Set duration</p>
            <p className="session-modal-body">Enter the actual time you spent working out.</p>
            <div className="session-duration-inputs">
              <label className="session-duration-field">
                <input
                  className="session-duration-input"
                  type="number"
                  min="0"
                  max="23"
                  value={timerEditH}
                  onChange={e => setTimerEditH(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <span>h</span>
              </label>
              <label className="session-duration-field">
                <input
                  className="session-duration-input"
                  type="number"
                  min="0"
                  max="59"
                  value={timerEditM}
                  onChange={e => setTimerEditM(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                />
                <span>m</span>
              </label>
              <label className="session-duration-field">
                <input
                  className="session-duration-input"
                  type="number"
                  min="0"
                  max="59"
                  value={timerEditS}
                  onChange={e => setTimerEditS(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                />
                <span>s</span>
              </label>
            </div>
            <div className="session-modal-actions">
              <button className="session-modal-cancel" onClick={() => setShowTimerEdit(false)}>Cancel</button>
              <button
                className="session-modal-confirm"
                onClick={() => {
                  const secs = timerEditH * 3600 + timerEditM * 60 + timerEditS
                  setManualDuration(secs > 0 ? secs : null)
                  setShowTimerEdit(false)
                }}
              >
                Set
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-hour time limit */}
      {showTimeLimit && (
        <div className="session-modal-overlay">
          <div className="session-modal" onClick={e => e.stopPropagation()}>
            <p className="session-modal-title">Still there?</p>
            <p className="session-modal-body">Your workout has been running for over 3 hours. Still going?</p>
            <div className="session-modal-actions">
              <button className="session-modal-cancel" onClick={() => { timeLimitDismissedAt.current = Date.now(); setShowTimeLimit(false) }}>
                Keep going
              </button>
              <button className="session-modal-confirm" onClick={onAbandon}>Abandon</button>
            </div>
          </div>
        </div>
      )}

      {/* AI breakdown detail sheet */}
      {showBreakdown && (
        <div className="sheet-backdrop" onClick={() => setShowBreakdown(false)}>
          <div className="sheet overload-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="sheet-title">AI Breakdown</p>
            {aiBreakdown.headline && (
              <p className="overload-headline">{aiBreakdown.headline}</p>
            )}
            <div className="overload-list">
              {(aiBreakdown.suggestions ?? []).map((s, i) => {
                const ex = findExercise(s.exerciseId)
                return (
                  <div key={i} className="overload-row">
                    <p className="overload-ex-name">{ex?.name ?? s.exerciseId}</p>
                    <p className="overload-ex-note">{s.note}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
