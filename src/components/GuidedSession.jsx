import { useEffect, useMemo, useRef, useState } from 'react'
import MuscleIcon from './MuscleIcon'
import { Sheet } from './ExpressSession'
import { buildGuidedSteps, fmtClock, fmtGuidedExercise, fmtSecs, fmtTarget, guidedSummary } from '../utils/guided'
import { getGuidedProgress, saveGuidedProgress } from '../storage'
import { playChime, playTick, unlockChime } from '../utils/sound'
import './GuidedSession.css'

// Guided mode: the player walks the workout on its own — every set of an
// exercise with rests between, then on to the next exercise. Timed and hold
// sets run on a countdown; a reps set waits for Done, then the rest starts.
//
// Progress is { index, endsAt, pausedLeft }: the step being run, the
// wall-clock time a timed step ends (null for a paused or reps step), and the
// ms left while paused. Wall-clock, so it keeps going while SessionScreen is
// unmounted (a tab switch) or the phone is locked; on return, the tick catches
// up through every timed step that ended meanwhile and logs those sets. It
// stops at a reps set — only you know when that's done.
// index -1 = not started; index === steps.length = workout complete.

const IDLE = { index: -1, endsAt: null, pausedLeft: null }
const TICK_MS = 250
const ADD_TIME_MS = 15000
const RING_R = 52
const RING_C = 2 * Math.PI * RING_R

function stepState(step, t, paused) {
  if (step.duration == null) return { endsAt: null, pausedLeft: null }
  const ms = step.duration * 1000
  return paused ? { endsAt: null, pausedLeft: ms } : { endsAt: t + ms, pausedLeft: null }
}

function catchUp(prog, steps, now) {
  const done = []
  let { index, endsAt } = prog
  while (index >= 0 && index < steps.length && endsAt != null && now >= endsAt) {
    const s = steps[index]
    if (s.kind === 'set') done.push({ exIndex: s.exIndex, setIndex: s.setIndex, type: s.type, value: s.target })
    index++
    const next = steps[index]
    endsAt = next?.duration != null ? endsAt + next.duration * 1000 : null
  }
  if (index === prog.index) return { prog, done }
  return { prog: { index, endsAt, pausedLeft: null }, done }
}

// Keeps the screen on while the workout runs. A no-op without the Wake Lock API.
function useWakeLock(active) {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return
    let lock = null
    let cancelled = false
    function request() {
      if (lock && !lock.released) return
      navigator.wakeLock.request('screen')
        .then(l => { if (cancelled) l.release(); else lock = l })
        .catch(() => {})
    }
    function onVisible() { if (document.visibilityState === 'visible') request() }
    request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      lock?.release().catch(() => {})
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [active])
}

function Ring({ progress, phase, children }) {
  return (
    <div className={`gs-ring gs-ring--${phase}`}>
      <svg className="gs-ring-svg" viewBox="0 0 120 120" aria-hidden="true">
        <circle className="gs-ring-track" cx="60" cy="60" r={RING_R} />
        <circle
          className="gs-ring-fill"
          cx="60" cy="60" r={RING_R}
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - Math.min(1, Math.max(0, progress)))}
        />
      </svg>
      <div className="gs-ring-inner">{children}</div>
    </div>
  )
}

export default function GuidedSession({
  sessionId, plan, logs, findExercise, onCompleteSets, onFinish, finishing, onAbandon,
  totalSets, completedSets, menuOpen, onCloseMenu,
}) {
  // Keyed on the plan's contents: the caller rebuilds the array every render,
  // and a new `steps` would restart the tick effect each time.
  const planKey = JSON.stringify(plan)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const steps = useMemo(() => buildGuidedSteps(plan), [planKey])

  const [prog, setProg] = useState(() => getGuidedProgress(sessionId) ?? IDLE)
  const progRef = useRef(prog)
  const [now, setNow] = useState(() => Date.now())
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [repsDraft, setRepsDraft] = useState(null) // { index, reps } — adjusted count for the current reps set
  const tickedRef = useRef(new Set())
  // The interval outlives renders; always call the latest completion handler
  // so it writes into the latest logs.
  const onCompleteRef = useRef(onCompleteSets)
  useEffect(() => { onCompleteRef.current = onCompleteSets })

  function commit(next) {
    progRef.current = next
    setProg(next)
    saveGuidedProgress(sessionId, next)
  }

  // Starts step `index` from the top — paused if the workout is paused.
  function goTo(index, { paused = isPaused(progRef.current) } = {}) {
    if (index >= steps.length) { commit({ index: steps.length, endsAt: null, pausedLeft: null }); return }
    commit({ index, ...stepState(steps[index], Date.now(), paused) })
  }

  // Cue a step change the user is watching: a chime, and a longer buzz at the end.
  function cue(nextIndex) {
    if (document.visibilityState !== 'visible') return
    playChime()
    navigator.vibrate?.(nextIndex >= steps.length ? [200, 100, 200, 100, 300] : [200, 100, 200])
  }

  // items: [{ exIndex, setIndex, type, value }] — value is reps done or seconds.
  function logSets(items) {
    onCompleteRef.current(items)
  }

  useEffect(() => {
    function tick() {
      const t = Date.now()
      setNow(t)
      const cur = progRef.current
      const { prog: next, done } = catchUp(cur, steps, t)
      if (next !== cur) {
        commit(next)
        if (done.length) logSets(done)
        // One step ended while watching → cue it. A long catch-up (back from
        // another tab) lands quietly where it should be.
        if (next.index - cur.index === 1) cue(next.index)
        return
      }
      if (cur.endsAt != null) {
        const left = Math.ceil((cur.endsAt - t) / 1000)
        const key = `${cur.index}:${left}`
        if (left >= 1 && left <= 3 && !tickedRef.current.has(key)) {
          tickedRef.current.add(key)
          playTick()
        }
      }
    }
    tick()
    const id = setInterval(tick, TICK_MS)
    function onVisible() { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [steps]) // eslint-disable-line react-hooks/exhaustive-deps

  const started = prog.index >= 0
  const complete = steps.length > 0 && prog.index >= steps.length
  const step = started && !complete ? steps[prog.index] : null
  const paused = isPaused(prog)
  useWakeLock(started && !complete && !paused)

  function isPaused(p) {
    return p.index >= 0 && p.index < steps.length && steps[p.index]?.duration != null && p.endsAt == null
  }

  function start() {
    unlockChime() // inside the tap, so cues can play later from the interval
    goTo(0, { paused: false })
  }

  function togglePause() {
    const cur = progRef.current
    const t = Date.now()
    if (paused) commit({ index: cur.index, endsAt: t + cur.pausedLeft, pausedLeft: null })
    else commit({ index: cur.index, endsAt: null, pausedLeft: Math.max(0, cur.endsAt - t) })
  }

  // A reps set is done when you say so.
  function finishRepsSet() {
    const reps = repsDraft?.index === prog.index ? repsDraft.reps : step.target
    logSets([{ exIndex: step.exIndex, setIndex: step.setIndex, type: 'reps', value: reps }])
    cue(prog.index + 1)
    goTo(prog.index + 1, { paused: false })
  }

  // Skip leaves a set unlogged: you didn't do it.
  function skip() { goTo(prog.index + 1) }

  // Back restarts the current set if it's a few seconds in, otherwise goes
  // to the set before — like a music player's previous button.
  function back() {
    const elapsed = step.duration != null ? step.duration * 1000 - msLeft : 0
    if (step.kind === 'set' && elapsed > 3000) { goTo(prog.index); return }
    for (let i = prog.index - 1; i >= 0; i--) {
      if (steps[i].kind === 'set') { goTo(i); return }
    }
    goTo(0)
  }

  function addRest() {
    const cur = progRef.current
    if (cur.endsAt != null) commit({ ...cur, endsAt: cur.endsAt + ADD_TIME_MS })
    else commit({ ...cur, pausedLeft: cur.pausedLeft + ADD_TIME_MS })
  }

  function requestFinish() {
    if (totalSets > 0 && completedSets < totalSets) setConfirmFinish(true)
    else onFinish()
  }

  const exName  = i => findExercise(logs[i]?.exerciseId)?.name ?? 'Exercise'
  const exGroup = i => findExercise(logs[i]?.exerciseId)?.muscleGroup

  if (plan.length === 0) {
    return (
      <div className="gs">
        <div className="gs-center"><p className="gs-muted">No exercises in this workout.</p></div>
      </div>
    )
  }

  const msLeft = !step || step.duration == null ? 0 : paused ? prog.pausedLeft : Math.max(0, prog.endsAt - now)
  const secsLeft = Math.ceil(msLeft / 1000)
  const progress = step?.duration ? msLeft / (step.duration * 1000) : 0
  const phase = !step ? 'idle' : step.kind === 'rest' ? 'rest' : step.kind === 'ready' ? 'ready' : 'work'
  const setsOf = i => plan[i]?.sets ?? 0
  // The set after this one, for "Up next" while a set is running.
  const nextSet = step?.kind === 'set' ? steps.slice(prog.index + 1).find(s => s.kind === 'set') : null
  const reps = step?.kind === 'set' && step.type === 'reps'
    ? (repsDraft?.index === prog.index ? repsDraft.reps : step.target)
    : null
  const setReps = r => setRepsDraft({ index: prog.index, reps: Math.max(0, r) })

  return (
    <div className="gs">
      {/* One segment per set, grouped by exercise */}
      <div className="gs-track" aria-hidden="true">
        {plan.map((ge, i) => (
          <div key={ge.exerciseId} className="gs-track-ex" style={{ flexGrow: ge.sets }}>
            {Array.from({ length: ge.sets }, (_, s) => (
              <span
                key={s}
                className={[
                  'gs-track-seg',
                  logs[i]?.sets[s]?.completed && 'gs-track-seg--done',
                  step?.kind === 'set' && step.exIndex === i && step.setIndex === s && 'gs-track-seg--now',
                ].filter(Boolean).join(' ')}
              />
            ))}
          </div>
        ))}
      </div>

      {!started && (
        <div className="gs-intro">
          <p className="gs-eyebrow">Guided workout</p>
          <p className="gs-intro-summary">{guidedSummary(plan)}</p>
          <ol className="gs-intro-list">
            {plan.map((ge, i) => (
              <li key={ge.exerciseId} className="gs-intro-row">
                <span className="gs-intro-num">{i + 1}</span>
                <MuscleIcon muscleGroup={exGroup(i)} className="gs-intro-icon" />
                <span className="gs-intro-text">
                  <span className="gs-intro-name">{exName(i)}</span>
                  <span className="gs-intro-meta">{fmtGuidedExercise(ge)}</span>
                </span>
              </li>
            ))}
          </ol>
          <button className="xs-confirm gs-primary" onClick={start}>Start workout</button>
        </div>
      )}

      {step && (
        <div className={`gs-stage gs-stage--${phase}`} key={prog.index}>
          {step.kind === 'set' ? (
            <>
              <p className="gs-eyebrow">Exercise {step.exIndex + 1} of {plan.length}</p>
              <div className="gs-now">
                <MuscleIcon muscleGroup={exGroup(step.exIndex)} className="gs-now-icon" />
                <h3 className="gs-now-name">{exName(step.exIndex)}</h3>
                <p className="gs-now-set">Set {step.setIndex + 1} of {setsOf(step.exIndex)}</p>
              </div>
            </>
          ) : (
            <p className="gs-eyebrow gs-eyebrow--phase">{step.kind === 'rest' ? 'Rest' : 'Get ready'}</p>
          )}

          {step.duration != null ? (
            <Ring progress={progress} phase={phase}>
              <span className="gs-count">{step.kind === 'ready' ? secsLeft : fmtClock(secsLeft)}</span>
              {step.kind === 'set'
                ? <span className="gs-ring-sub">{step.type === 'hold' ? 'Hold' : 'Go'} · {fmtSecs(step.target)}</span>
                : paused && <span className="gs-ring-sub">Paused</span>}
              {step.kind === 'set' && paused && <span className="gs-ring-sub gs-paused">Paused</span>}
            </Ring>
          ) : (
            // A reps set: no timer — the target, adjustable if you got more or fewer.
            <div className="gs-reps">
              <button className="gs-reps-step" onClick={() => setReps(reps - 1)} aria-label="One fewer rep">−</button>
              <div className="gs-reps-value">
                <span className="gs-reps-num">{reps}</span>
                <span className="gs-reps-label">reps{reps !== step.target && ` · target ${step.target}`}</span>
              </div>
              <button className="gs-reps-step" onClick={() => setReps(reps + 1)} aria-label="One more rep">+</button>
            </div>
          )}

          {/* What's coming. During a rest it's the point of the screen, so
              it's big; during a set it's a quiet line. */}
          {step.kind === 'set' ? (
            <p className="gs-upnext-line">
              {nextSet
                ? nextSet.exIndex === step.exIndex
                  ? <>Next: set {nextSet.setIndex + 1} of {setsOf(nextSet.exIndex)}</>
                  : <>Next exercise: <strong>{exName(nextSet.exIndex)}</strong></>
                : <strong>Last set — finish strong</strong>}
            </p>
          ) : (
            <div className="gs-upnext-card">
              <p className="gs-upnext-label">
                {step.kind === 'ready' ? 'First up' : step.setIndex === 0 ? 'Next exercise' : 'Up next'}
              </p>
              <div className="gs-upnext-row">
                <MuscleIcon muscleGroup={exGroup(step.exIndex)} className="gs-upnext-icon" />
                <span className="gs-upnext-name">{exName(step.exIndex)}</span>
              </div>
              <p className="gs-upnext-meta">
                Set {step.setIndex + 1} of {setsOf(step.exIndex)} · {fmtTarget(step.type, step.target)}
              </p>
            </div>
          )}

          <div className="gs-controls">
            <button className="gs-ctl" onClick={back} aria-label="Previous set">
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
            </button>
            {step.duration == null ? (
              <button className="gs-ctl gs-ctl--main gs-ctl--done" onClick={finishRepsSet} aria-label="Set done">
                Done
              </button>
            ) : (
              <button className="gs-ctl gs-ctl--main" onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'}>
                {paused
                  ? <svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30"><path d="M7 4v16l13-8z" /></svg>
                  : <svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>}
              </button>
            )}
            <button className="gs-ctl" onClick={skip} aria-label={step.kind === 'set' ? 'Skip set' : 'Skip rest'}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
            </button>
          </div>
          {step.kind === 'rest' && <button className="gs-add-time" onClick={addRest}>+15s rest</button>}
        </div>
      )}

      {complete && (
        <div className="gs-done">
          <span className="gs-done-check">✓</span>
          <p className="gs-done-title">Workout complete</p>
          <p className="gs-muted">{completedSets} of {totalSets} sets · {plan.length} exercise{plan.length === 1 ? '' : 's'}</p>
          <button className="xs-confirm xs-confirm--done gs-primary" onClick={onFinish} disabled={finishing}>
            {finishing ? <span className="session-spinner" /> : 'Finish Workout'}
          </button>
        </div>
      )}

      {menuOpen && (
        <Sheet title="Workout" onClose={onCloseMenu}>
          {close => (
            <div className="xs-menu">
              {started && !complete && (
                <button className="xs-menu-item" onClick={() => close(() => commit(IDLE))}>↺ Start over</button>
              )}
              <button className="xs-menu-item xs-menu-item--accent" onClick={() => close(requestFinish)} disabled={finishing}>
                Finish workout
              </button>
              <button className="xs-menu-item xs-menu-item--danger" onClick={() => close(onAbandon)}>Abandon workout</button>
            </div>
          )}
        </Sheet>
      )}

      {confirmFinish && (
        <div className="session-modal-overlay" onClick={() => setConfirmFinish(false)}>
          <div className="session-modal" onClick={e => e.stopPropagation()}>
            <p className="session-modal-title">Finish early?</p>
            <p className="session-modal-body">Only {completedSets}/{totalSets} sets are done. Finish anyway?</p>
            <div className="session-modal-actions">
              <button className="session-modal-cancel" onClick={() => setConfirmFinish(false)}>Keep going</button>
              <button className="session-modal-confirm" onClick={() => { setConfirmFinish(false); onFinish() }}>Finish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
