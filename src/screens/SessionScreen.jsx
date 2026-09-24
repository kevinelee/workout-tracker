import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { createSet } from '../data/models'
import { defaultExercises } from '../data/exerciseLibrary'
import { getCachedCustomExercises, getCollapsedExercises, getExpressPosition, getLastLogForExercise, getLastSessionForTemplate, getSessionView, saveCollapsedExercises, saveExpressPosition, saveSession, saveSessionView, saveTemplate } from '../storage'
import { initLogsFromSession } from '../App'
import { createTemplateExercise } from '../data/models'
import MuscleIcon from '../components/MuscleIcon'
import SessionSetRow from '../components/SessionSetRow'
import ExerciseSearch from '../components/ExerciseSearch'
import RestTimer from '../components/RestTimer'
import ExpressSession from '../components/ExpressSession'
import GuidedSession from '../components/GuidedSession'
import { useProGate } from '../lib/proGate'
import { fmtSet, upNextIndex } from '../utils/express'
import { guidedPlanFor, guidedSetReps, normalizeGuidedExercise } from '../utils/guided'
import { unlockChime, playChime } from '../utils/sound'
import { alertSaveError } from '../lib/saveError'
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

// Fresh sets pre-filled from a previous log of the exercise, padding with its
// last set when today calls for more sets than were done then.
function inheritSets(lastLog, count) {
  const prev = lastLog?.sets ?? []
  const fallback = prev[prev.length - 1] ?? { reps: 0, weight: 0 }
  return Array.from({ length: count }, (_, i) => {
    const s = prev[i] ?? fallback
    return { reps: s.reps, weight: s.weight, completed: false, isPR: false, prKind: null }
  })
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

export default function SessionScreen({ activeSession, settings, programId, onUpdate, onFinish, onMinimize, onAbandon, onUpdateSettings }) {
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
  // Forces RestTimer to remount on every new rest period, even when the
  // duration is identical to the previous one (the common case — most
  // workouts use one fixed rest length). Keying on restDuration itself
  // doesn't work then: React sees the same key/value, skips the remount,
  // and the countdown just keeps ticking from the last set's rest instead
  // of restarting — completing a set while the ribbon was still counting
  // down from the set before silently did nothing.
  const restKeyRef = useRef(0)
  const [timerMinimized, setTimerMinimized] = useState(false)
  const [timerFlash, setTimerFlash] = useState(false)
  const [copiedBanner, setCopiedBanner] = useState(false)
  const [hasCopiedLastSession, setHasCopiedLastSession] = useState(false)
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
  const [collapsedExercises, setCollapsedExercises] = useState(() => new Set(getCollapsedExercises(sessionId)))
  const [editMode, setEditMode] = useState(false)
  const [editVisible, setEditVisible] = useState(false)
  const editExitRef = useRef(null)
  // Measured so the minimized rest timer ribbon can dock below the sticky
  // header instead of overlapping it (and its Skip/expand taps stealing
  // clicks meant for the header) — a fixed pixel guess would drift whenever
  // the title wraps to two lines or platform font sizing changes its height.
  const stickyRef = useRef(null)
  const [stickyHeight, setStickyHeight] = useState(0)
  const [warnPending, setWarnPending] = useState(false)
  const warnTimerRef = useRef(null)
  const noteRefs = useRef({})
  const finishInlineRef = useRef(null)
  const [finishInlineVisible, setFinishInlineVisible] = useState(true)

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

  // Express view: one exercise at a time. The stored preference only counts
  // while the user can actually use it — revoking Pro drops them back to List.
  const { canUse } = useProGate()
  const [viewPref, setViewPref]     = useState(getSessionView)
  // A guided workout has its own player and ignores the List/Express pick.
  const [guidedPlan]                = useState(() => guidedPlanFor(template, findExercise))
  const guided                      = !!guidedPlan
  const express                     = !guided && viewPref === 'express' && canUse('expressMode')
  const [showProLock, setShowProLock] = useState(false)
  const [savedExpressPos]           = useState(() => getExpressPosition(sessionId))
  const [expressIndex, setExpressIndex] = useState(() => {
    const saved = initialLogs.findIndex(l => l.exerciseId === savedExpressPos.currentId)
    if (saved >= 0 && initialLogs[saved].sets.some(s => !s.completed)) return saved
    return Math.max(0, initialLogs.findIndex(l => l.sets.some(s => !s.completed)))
  })
  const [deferredId, setDeferredId] = useState(savedExpressPos.deferredId ?? null)
  const [expressMenuOpen, setExpressMenuOpen] = useState(false)
  const currentExpressIndex         = Math.min(expressIndex, Math.max(0, logs.length - 1))
  const currentExpressId            = logs[currentExpressIndex]?.exerciseId

  useEffect(() => {
    saveExpressPosition(sessionId, { currentId: currentExpressId, deferredId })
  }, [sessionId, currentExpressId, deferredId])

  const [lastSession, setLastSession] = useState(null)
  useEffect(() => {
    if (template.isQuickStart) return
    getLastSessionForTemplate(template.id).then(setLastSession)
  }, [template.id])

  // History for exercises added or swapped in mid-session, which this
  // template's last session may never have included. Keyed by exerciseId.
  const [exerciseHistory, setExerciseHistory] = useState({})
  const lastLogFor = id => lastSession?.logs?.find(l => l.exerciseId === id) ?? exerciseHistory[id] ?? null
  const addingExerciseRef = useRef(false)

  async function fetchLastLog(exerciseId) {
    const cached = lastLogFor(exerciseId)
    if (cached) return cached
    // Never let a slow or offline lookup block adding the exercise.
    const timeout = new Promise(resolve => setTimeout(() => resolve(null), 2500))
    const found = await Promise.race([getLastLogForExercise(exerciseId).catch(() => null), timeout])
    if (found) setExerciseHistory(prev => ({ ...prev, [exerciseId]: found }))
    return found
  }

  useLayoutEffect(() => {
    const el = stickyRef.current
    if (!el) return
    const update = () => setStickyHeight(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  // Track whether the in-flow Finish button is on-screen, so the sticky
  // bottom copy only shows up when it isn't — avoids a duplicate button.
  useEffect(() => {
    const el = finishInlineRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setFinishInlineVisible(entry.isIntersecting),
      { rootMargin: '0px 0px -1px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [express]) // the in-flow button only exists in List view


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
    if (!lastSession || hasCopiedLastSession) return
    const newLogs = initLogsFromSession(template, lastSession)
    updateLogsAndSync(newLogs, prMap)
    setHasCopiedLastSession(true)
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

    let isPR, prKind, newPrMap, newPrRepsMap, newRepPRByWeightMap

    if (prType === 'reps') {
      isPR = set.reps > 0 && set.reps > currentPR
      prKind = isPR ? 'reps' : null
      newPrMap = isPR ? { ...prMap, [exerciseId]: set.reps } : prMap
      newPrRepsMap = null
      newRepPRByWeightMap = null
    } else {
      const isWeightPR = set.weight > 0 && set.weight > currentPR
      const weightBucket = repPRByWeightMap[exerciseId] ?? {}
      const bestRepsAtWeight = bestRepsAtOrAboveWeight(weightBucket, set.weight)
      const isRepPR = set.weight > 0 && set.reps > bestRepsAtWeight
      isPR = isWeightPR || isRepPR
      prKind = isWeightPR && isRepPR ? 'both' : isWeightPR ? 'weight' : isRepPR ? 'reps' : null
      newPrMap = isWeightPR ? { ...prMap, [exerciseId]: set.weight } : prMap
      newPrRepsMap = isWeightPR ? { ...prRepsMap, [exerciseId]: set.reps } : null
      newRepPRByWeightMap = isPR
        ? { ...repPRByWeightMap, [exerciseId]: { ...weightBucket, [set.weight]: Math.max(bestRepsAtWeight, set.reps) } }
        : null
    }

    const newLogs = logs.map((l, li) =>
      li !== logIndex ? l : {
        ...l,
        sets: l.sets.map((s, si) => si === setIndex ? { ...set, completed: true, isPR, prKind } : s),
      }
    )
    lastActivityAt.current = Date.now()
    updateLogsAndSync(newLogs, newPrMap, newPrRepsMap, newRepPRByWeightMap)
    if (settings.restTimerDuration > 0) {
      unlockChime() // primes audio now, inside this tap, so the chime can play later from the timer callback
      restKeyRef.current += 1
      setRestDuration(settings.restTimerDuration)
      setTimerMinimized(false) // each new rest period starts as the full modal
    }

    // Celebrate when all sets (including any added extras) are done
    const target = log.sets.length
    const nowDone = log.sets.filter(s => s.completed).length + 1
    if (nowDone >= target) {
      clearTimeout(celebrateTimerRef.current)
      setCelebratingExercise(exerciseId)
      celebrateTimerRef.current = setTimeout(() => setCelebratingExercise(null), 1200)
    }
  }

  // The guided plan in session order, one entry per log — set counts come from
  // the logs, so it always lines up with what gets saved.
  const guidedExercises = guided
    ? logs.map(log => {
        const ge = guidedPlan.exercises.find(e => e.exerciseId === log.exerciseId)
        return normalizeGuidedExercise({ ...(ge ?? { exerciseId: log.exerciseId }), sets: log.sets.length }, findExercise(log.exerciseId))
      })
    : null

  // Guided sets the player finished: [{ exIndex, setIndex, type, value }] —
  // several at once when it catches up after the screen was away. No PR
  // check: bodyweight sets on a timer aren't lifts (see guidedSetReps).
  function completeGuidedSets(items) {
    const byKey = new Map(items.map(it => [`${it.exIndex}:${it.setIndex}`, it]))
    let changed = false
    const newLogs = logs.map((log, li) => ({
      ...log,
      sets: log.sets.map((s, si) => {
        const it = byKey.get(`${li}:${si}`)
        if (!it || s.completed) return s
        changed = true
        return { ...s, reps: guidedSetReps(it.type, it.value, findExercise(log.exerciseId)), completed: true, isPR: false, prKind: null }
      }),
    }))
    if (!changed) return
    lastActivityAt.current = Date.now()
    updateLogsAndSync(newLogs, null)
  }

  function updateNotes(logIndex, text) {
    const newLogs = logs.map((log, li) => li !== logIndex ? log : { ...log, notes: text })
    updateLogsAndSync(newLogs, null)
  }

  function toggleCollapse(exerciseId) {
    const next = new Set(collapsedExercises)
    if (next.has(exerciseId)) next.delete(exerciseId)
    else next.add(exerciseId)
    setCollapsedExercises(next)
    saveCollapsedExercises(sessionId, next)
  }

  function addSet(logIndex) {
    const log = logs[logIndex]
    const last = log.sets[log.sets.length - 1]
    const newSet = { reps: last?.reps ?? 0, weight: last?.weight ?? 0, completed: false, isPR: false, prKind: null, isBonus: true }
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
        sets: log.sets.map((s, si) => si === setIndex ? { ...s, completed: false, isPR: false, prKind: null } : s),
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

  async function addExerciseToSession(exercise) {
    if (logs.some(l => l.exerciseId === exercise.id) || addingExerciseRef.current) return
    addingExerciseRef.current = true
    const last = await fetchLastLog(exercise.id)
    addingExerciseRef.current = false
    if (express) setExpressIndex(logs.length) // jump straight to what was just added
    const setCount = last?.sets.length || 3
    const newLog = {
      exerciseId: exercise.id,
      targetCount: setCount,
      sets: inheritSets(last, setCount).map(s => ({ ...s, isBonus: false })),
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

  async function doSubstituteExercise(newExercise) {
    if (addingExerciseRef.current) return
    const index = substituteIndex
    const oldLog = logs[index]
    const setCount = oldLog.targetCount ?? oldLog.sets.length
    addingExerciseRef.current = true
    const last = await fetchLastLog(newExercise.id)
    addingExerciseRef.current = false
    const newLog = {
      exerciseId:  newExercise.id,
      targetCount: setCount,
      sets: inheritSets(last, setCount),
      notes: '',
    }
    updateLogsAndSync(logs.map((l, i) => i === index ? newLog : l), null)
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
      // The workout is still in memory and localStorage, so tapping Finish
      // again retries the whole save.
      alertSaveError(err)
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
    try { await saveTemplate(savedTemplate) } catch (err) { alertSaveError(err); setModalSaving(false); return }
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
    try { await saveTemplate(updatedTemplate) } catch (err) { alertSaveError(err); setModalSaving(false); return }
    onFinish(session, updatedTemplate)
  }

  const editExiting = editVisible && !editMode

  function switchView(view) {
    if (view === 'express' && !canUse('expressMode')) { setShowProLock(true); return }
    if (view === 'express' && editMode) toggleEdit()
    if (view === 'list') setExpressMenuOpen(false)
    setViewPref(view)
    saveSessionView(view)
  }

  // "Machine taken": jump to what's up next and bring this exercise back right
  // after it. Only before any of its sets are logged — once started, it stays
  // put. The logs aren't reordered (see upNextIndex), so the progress dots
  // move to the exercise you're actually on.
  function pushLater(logIndex) {
    if (logs[logIndex].sets.some(s => s.completed)) return
    const target = upNextIndex(logs, logIndex, deferredId)
    if (target === -1) return
    setDeferredId(logs[logIndex].exerciseId)
    setExpressIndex(target)
  }

  // What the full-screen rest shows under the countdown.
  function expressRestPreview() {
    const log = logs[currentExpressIndex]
    if (!log) return null
    const exercise = findExercise(log.exerciseId)
    const nextSet = log.sets.findIndex(s => !s.completed)
    if (nextSet >= 0) {
      return (
        <>
          <p className="rest-label">Next · Set {nextSet + 1} of {log.sets.length}</p>
          <p className="xs-rest-next">{exercise?.name} · {fmtSet(log.sets[nextSet], exercise, settings.unit)}</p>
        </>
      )
    }
    const ni = upNextIndex(logs, currentExpressIndex, deferredId)
    if (ni === -1) return null
    return (
      <>
        <p className="rest-label">Up next</p>
        <p className="xs-rest-next">{findExercise(logs[ni].exerciseId)?.name}</p>
      </>
    )
  }

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

  // log.sets.length, not targetCount: targetCount is the originally-planned
  // count, kept around only so saving/updating a template can tell a
  // deliberately-removed set apart from an added one (see handleSaveAsNewWorkout
  // and handleUpdateTemplate). The visible progress has to include added sets
  // too — completeSet's celebration check below already does this.
  const totalSets     = logs.reduce((sum, log) => sum + log.sets.length, 0)
  const completedSets = logs.reduce((sum, log) => sum + log.sets.filter(s => s.completed).length, 0)
  const allDone   = completedSets === totalSets && totalSets > 0
  const underHalf = totalSets > 0 && completedSets < totalSets / 2

  return (
    <div className="session" style={{ '--session-sticky-height': `${stickyHeight}px` }}>
      {/* Sticky header + progress bar */}
      <div className="session-sticky" ref={stickyRef}>
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
          {guided ? (
            <span className="session-guided-badge">Guided</span>
          ) : (
          <div className="session-view-toggle" role="group" aria-label="Session view">
            <button
              className={`session-view-btn${!express ? ' session-view-btn--active' : ''}`}
              onClick={() => switchView('list')}
              aria-label="List view"
              aria-pressed={!express}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
                <line x1="4" y1="5" x2="16" y2="5" /><line x1="4" y1="10" x2="16" y2="10" /><line x1="4" y1="15" x2="16" y2="15" />
              </svg>
            </button>
            <button
              className={`session-view-btn${express ? ' session-view-btn--active' : ''}`}
              onClick={() => switchView('express')}
              aria-label={canUse('expressMode') ? 'Express view' : 'Express view (Pro)'}
              aria-pressed={express}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path d="M11.5 1.5 4 11h5l-1.5 7.5L15 9h-5z" />
              </svg>
              {!canUse('expressMode') && <span className="session-view-lock">🔒</span>}
            </button>
          </div>
          )}
          {express || guided ? (
            <button className="session-menu-btn" onClick={() => setExpressMenuOpen(true)} aria-label="Workout menu">⋯</button>
          ) : (
            <button
              className={`session-menu-btn${editMode ? ' session-menu-btn--active' : ''}`}
              onClick={toggleEdit}
              aria-label={editMode ? 'Done editing' : 'Edit workout'}
              aria-pressed={editMode}
            >
              ⋯
            </button>
          )}
        </div>

        <div className="session-progress-bar">
          <div
            className={`session-progress-fill${allDone ? ' session-progress-fill--done' : ''}`}
            style={{ width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {guided ? (
        <GuidedSession
          sessionId={sessionId}
          plan={guidedExercises}
          logs={logs}
          findExercise={findExercise}
          onCompleteSets={completeGuidedSets}
          onFinish={handleFinish}
          finishing={finishing}
          onAbandon={() => setShowAbandon(true)}
          totalSets={totalSets}
          completedSets={completedSets}
          menuOpen={expressMenuOpen}
          onCloseMenu={() => setExpressMenuOpen(false)}
        />
      ) : express ? (
        <ExpressSession
          logs={logs}
          currentIndex={currentExpressIndex}
          deferredId={deferredId}
          onChangeIndex={setExpressIndex}
          findExercise={findExercise}
          settings={settings}
          prMap={prMap}
          bestRepsAt={(exerciseId, weight) => bestRepsAtOrAboveWeight(repPRByWeightMap[exerciseId] ?? {}, weight)}
          lastLogFor={lastLogFor}
          celebratingExercise={celebratingExercise}
          onUpdateSet={updateSet}
          onCompleteSet={completeSet}
          onRescindSet={rescindSet}
          onAddSet={addSet}
          onRemoveSet={removeSet}
          onConfirmRemoveSet={(li, si) => setConfirmRemoveSet({ logIndex: li, setIndex: si })}
          onNotes={updateNotes}
          onLater={pushLater}
          onAddExercise={() => setShowAddExercise(true)}
          onSubstitute={handleSubstituteExercise}
          onRemoveExercise={handleRemoveExercise}
          onCopyLast={lastSession && !hasCopiedLastSession ? copyLastSession : null}
          onShowBreakdown={hasBreakdown ? () => setShowBreakdown(true) : null}
          onAbandon={() => setShowAbandon(true)}
          onFinish={handleFinish}
          finishing={finishing}
          totalSets={totalSets}
          completedSets={completedSets}
          menuOpen={expressMenuOpen}
          onCloseMenu={() => setExpressMenuOpen(false)}
        />
      ) : (
      <div className="session-body">
        {/* Copy last session banner */}
        {lastSession && !hasCopiedLastSession && !copiedBanner && (
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
          const target      = log.sets.length
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
          const lastLog = lastLogFor(log.exerciseId)
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
                    {allSetsDone ? '✓ ' : ''}{doneCount}/{target} sets
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
                <button
                  className={`session-notes-toggle ${openNotes.has(log.exerciseId) ? 'session-notes-toggle--open' : ''} ${log.notes ? 'session-notes-toggle--has-note' : ''}`}
                  onClick={e => { e.stopPropagation(); toggleNotes(log.exerciseId) }}
                  aria-label="Toggle notes"
                >
                  <NotesIcon />
                </button>
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
        <div className="session-finish-inline" ref={finishInlineRef}>
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
      )}

      {/* Sticky Finish — mirrors the in-flow button, shown only once the workout
          is actually done and that in-flow button is scrolled off-screen. Not
          gated on off-screen alone: the in-flow button sits after every
          exercise, so for any multi-exercise workout it's off-screen almost
          the entire time — showing the sticky version the whole workout,
          not just once there's something to finish. */}
      {!express && !guided && !finishInlineVisible && allDone && (
        <div className="session-finish-sticky">
          <button
            className={`session-finish-main session-finish-sticky-btn ${allDone ? 'session-finish-main--done' : ''} ${warnPending ? 'session-finish-main--warn' : ''}`}
            onClick={handleFinishClick}
            disabled={finishing}
          >
            {finishing
              ? <span className="session-spinner" />
              : warnPending
                ? 'Tap again to confirm'
                : 'Finish Workout'}
          </button>
        </div>
      )}

      {/* Rest timer overlay — a tap or scroll anywhere outside it minimizes it
          to a docked ribbon rather than dismissing it, so stray interaction
          with the rest of the screen doesn't cancel the rest period; Skip/
          Finish still end it outright. The backdrop is now purely a visual
          dim (pointer-events: none) so the page underneath stays scrollable
          while the modal is up — RestTimer detects "outside" itself. */}
      {restDuration !== null && (
        <>
          {!timerMinimized && !express && (
            <div className="rest-timer-backdrop" />
          )}
          <RestTimer
            key={restKeyRef.current}
            duration={restDuration}
            variant={express ? 'express' : 'modal'}
            preview={express ? expressRestPreview() : null}
            minimized={timerMinimized}
            onExpand={() => setTimerMinimized(false)}
            onMinimize={() => setTimerMinimized(true)}
            restTimerDuration={settings.restTimerDuration}
            onChangeRestTimerDuration={value => onUpdateSettings?.({ ...settings, restTimerDuration: value })}
            onDone={() => {
              setRestDuration(null)
              setTimerFlash(true)
              navigator.vibrate?.([200, 100, 200])
              playChime()
              setTimeout(() => setTimerFlash(false), 600)
            }}
            onSkip={() => setRestDuration(null)}
            showFinish={allDone}
            onFinish={() => {
              setRestDuration(null)
              handleFinishClick()
            }}
          />
        </>
      )}

      {timerFlash && <div className="session-timer-flash" />}

      {/* Express is Pro: shown when a non-Pro user taps the locked toggle */}
      {showProLock && (
        <div className="session-modal-overlay" onClick={() => setShowProLock(false)}>
          <div className="session-modal" onClick={e => e.stopPropagation()}>
            <p className="session-modal-title">⚡ Express mode is Pro</p>
            <p className="session-modal-body">See one exercise at a time with big, tappable numbers and a single Confirm button.</p>
            <div className="session-modal-actions">
              <button className="session-modal-cancel" onClick={() => setShowProLock(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}

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
