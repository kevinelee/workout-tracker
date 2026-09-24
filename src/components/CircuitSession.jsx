import { useEffect, useMemo, useRef, useState } from 'react'
import MuscleIcon from './MuscleIcon'
import { Sheet } from './ExpressSession'
import { buildCircuitSteps, circuitSummary, fmtClock, fmtShort, normalizeCircuit } from '../utils/circuit'
import { getCircuitProgress, saveCircuitProgress } from '../storage'
import { playChime, playTick, unlockChime } from '../utils/sound'
import './CircuitSession.css'

// Circuit mode: the timer drives the workout. Each exercise gets a work
// interval, then a rest that shows what's up next, then the next exercise —
// round after round, with no taps needed once it's started.
//
// Progress is { index, endsAt, pausedLeft }: the step being run, the wall-clock
// time it ends (null while paused), and the ms left on it while paused. Being
// wall-clock based means it keeps running while SessionScreen is unmounted (a
// tab switch) or the phone is locked; on return, the tick catches up through
// every step that ended in the meantime and logs those rounds as done.
// index -1 = not started yet; index === steps.length = circuit complete.

const IDLE = { index: -1, endsAt: null, pausedLeft: null }
const TICK_MS = 250
const ADD_TIME_MS = 15000
const RING_R = 52
const RING_C = 2 * Math.PI * RING_R

function catchUp(prog, steps, now) {
  if (prog.endsAt == null || prog.index < 0 || prog.index >= steps.length) return { prog, done: [] }
  let { index, endsAt } = prog
  const done = []
  while (index < steps.length && now >= endsAt) {
    const s = steps[index]
    if (s.type === 'work') done.push([s.exIndex, s.round])
    index++
    if (index < steps.length) endsAt += steps[index].duration * 1000
  }
  if (index === prog.index) return { prog, done }
  return { prog: index >= steps.length ? { index, endsAt: null, pausedLeft: null } : { index, endsAt, pausedLeft: null }, done }
}

// Keeps the screen on while the circuit runs — nobody wants to tap the phone
// awake mid-plank. Silently a no-op where the Wake Lock API isn't available.
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
    <div className={`cs-ring cs-ring--${phase}`}>
      <svg className="cs-ring-svg" viewBox="0 0 120 120" aria-hidden="true">
        <circle className="cs-ring-track" cx="60" cy="60" r={RING_R} />
        <circle
          className="cs-ring-fill"
          cx="60" cy="60" r={RING_R}
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - Math.min(1, Math.max(0, progress)))}
        />
      </svg>
      <div className="cs-ring-inner">{children}</div>
    </div>
  )
}

export default function CircuitSession({
  sessionId, circuit: rawCircuit, logs, findExercise, onCompleteSets, onFinish, finishing, onAbandon,
  totalSets, completedSets, menuOpen, onCloseMenu,
}) {
  const circuit = normalizeCircuit(rawCircuit)
  const steps = useMemo(
    () => buildCircuitSteps(circuit, logs.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [circuit.rounds, circuit.work, circuit.rest, circuit.roundRest, logs.length],
  )

  const [prog, setProg] = useState(() => getCircuitProgress(sessionId) ?? IDLE)
  const progRef = useRef(prog)
  const [now, setNow] = useState(() => Date.now())
  const [confirmFinish, setConfirmFinish] = useState(false)
  const tickedRef = useRef(new Set())
  // The interval outlives renders; always call the latest completion handler
  // so it writes into the latest logs, not the ones from when it started.
  const onCompleteRef = useRef(onCompleteSets)
  useEffect(() => { onCompleteRef.current = onCompleteSets })

  function commit(next) {
    progRef.current = next
    setProg(next)
    saveCircuitProgress(sessionId, next)
  }

  // Starts `index` running (or paused, if the circuit is paused) from the top.
  function goTo(index, t = Date.now()) {
    if (index >= steps.length) { commit({ index: steps.length, endsAt: null, pausedLeft: null }); return }
    const ms = steps[index].duration * 1000
    commit(progRef.current.endsAt == null && progRef.current.index >= 0
      ? { index, endsAt: null, pausedLeft: ms }
      : { index, endsAt: t + ms, pausedLeft: null })
  }

  useEffect(() => {
    function tick() {
      const t = Date.now()
      setNow(t)
      const cur = progRef.current
      const { prog: next, done } = catchUp(cur, steps, t)
      if (next !== cur) {
        commit(next)
        if (done.length) onCompleteRef.current(done)
        // One step ended while we were watching → cue it. A long catch-up
        // (back from another tab) just lands quietly where it should be.
        if (next.index - cur.index === 1 && document.visibilityState === 'visible') {
          playChime()
          navigator.vibrate?.(next.index >= steps.length ? [200, 100, 200, 100, 300] : [200, 100, 200])
        }
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
  const complete = prog.index >= steps.length && steps.length > 0
  const paused = started && !complete && prog.endsAt == null
  const running = started && !complete && !paused
  useWakeLock(running)

  function start() {
    unlockChime() // inside the tap, so the cues can play later from the interval
    goTo(0)
  }

  function togglePause() {
    const t = Date.now()
    const cur = progRef.current
    if (paused) commit({ index: cur.index, endsAt: t + cur.pausedLeft, pausedLeft: null })
    else commit({ index: cur.index, endsAt: null, pausedLeft: Math.max(0, cur.endsAt - t) })
  }

  // Skip leaves the work interval unlogged: you didn't do it.
  function skip() { goTo(prog.index + 1) }

  // Back restarts the current exercise if it's a few seconds in, otherwise
  // goes to the one before — like a music player's previous button.
  function back() {
    const step = steps[prog.index]
    const elapsed = step.duration * 1000 - msLeft
    if (step.type === 'work' && elapsed > 3000) { goTo(prog.index); return }
    for (let i = prog.index - 1; i >= 0; i--) {
      if (steps[i].type === 'work') { goTo(i); return }
    }
    goTo(0)
  }

  function addTime() {
    const cur = progRef.current
    if (cur.endsAt != null) commit({ ...cur, endsAt: cur.endsAt + ADD_TIME_MS })
    else commit({ ...cur, pausedLeft: cur.pausedLeft + ADD_TIME_MS })
  }

  function requestFinish() {
    if (totalSets > 0 && completedSets < totalSets) setConfirmFinish(true)
    else onFinish()
  }

  const exName = i => findExercise(logs[i]?.exerciseId)?.name ?? 'Exercise'
  const exGroup = i => findExercise(logs[i]?.exerciseId)?.muscleGroup

  if (logs.length === 0) {
    return (
      <div className="cs">
        <div className="cs-center"><p className="cs-muted">No exercises in this circuit.</p></div>
      </div>
    )
  }

  const step = started && !complete ? steps[prog.index] : null
  const msLeft = !step ? 0 : paused ? prog.pausedLeft : Math.max(0, prog.endsAt - now)
  const secsLeft = Math.ceil(msLeft / 1000)
  const progress = step ? msLeft / (step.duration * 1000) : 0
  const nextWork = step ? steps.slice(prog.index + (step.type === 'work' ? 1 : 0)).find(s => s.type === 'work') : null
  const workDone = steps.slice(0, Math.max(0, prog.index)).filter(s => s.type === 'work').length
  const workTotal = steps.filter(s => s.type === 'work').length
  const phase = step?.type === 'work' ? 'work' : step?.type === 'ready' ? 'ready' : 'rest'

  return (
    <div className="cs">
      {/* One segment per interval of work, filled as the circuit runs */}
      <div className="cs-track" aria-hidden="true">
        {Array.from({ length: circuit.rounds }, (_, r) => (
          <div key={r} className="cs-track-round">
            {logs.map((l, i) => {
              const idx = r * logs.length + i
              return (
                <span
                  key={l.exerciseId}
                  className={[
                    'cs-track-seg',
                    l.sets[r]?.completed && 'cs-track-seg--done',
                    step?.type === 'work' && step.round === r && step.exIndex === i && 'cs-track-seg--now',
                    !l.sets[r]?.completed && idx < workDone && 'cs-track-seg--skipped',
                  ].filter(Boolean).join(' ')}
                />
              )
            })}
          </div>
        ))}
      </div>

      {!started && (
        <div className="cs-intro" key="intro">
          <p className="cs-eyebrow">Circuit</p>
          <p className="cs-intro-summary">{circuitSummary(circuit, logs.length)}</p>
          <ol className="cs-intro-list">
            {logs.map((l, i) => (
              <li key={l.exerciseId} className="cs-intro-row">
                <span className="cs-intro-num">{i + 1}</span>
                <MuscleIcon muscleGroup={exGroup(i)} className="cs-intro-icon" />
                <span className="cs-intro-name">{exName(i)}</span>
                <span className="cs-intro-time">{fmtShort(circuit.work)}</span>
              </li>
            ))}
          </ol>
          <p className="cs-muted cs-intro-note">
            {circuit.rest > 0 ? `${fmtShort(circuit.rest)} rest between exercises` : 'No rest between exercises'}
            {circuit.rounds > 1 && (circuit.roundRest > 0 ? ` · ${fmtShort(circuit.roundRest)} between rounds` : ' · no break between rounds')}
          </p>
          <button className="xs-confirm cs-primary" onClick={start}>Start circuit</button>
        </div>
      )}

      {step && (
        <div className={`cs-stage cs-stage--${phase}`} key={prog.index}>
          <p className="cs-eyebrow">
            {step.type === 'ready' && 'Get ready'}
            {step.type === 'work' && `Round ${step.round + 1} of ${circuit.rounds} · ${step.exIndex + 1}/${logs.length}`}
            {step.type === 'rest' && 'Rest'}
            {step.type === 'roundRest' && `Round ${step.round} done`}
          </p>

          {step.type === 'work' && (
            <div className="cs-now">
              <MuscleIcon muscleGroup={exGroup(step.exIndex)} className="cs-now-icon" />
              <h3 className="cs-now-name">{exName(step.exIndex)}</h3>
            </div>
          )}

          <Ring progress={progress} phase={phase}>
            <span className="cs-count">{step.type === 'ready' ? secsLeft : fmtClock(secsLeft)}</span>
            {paused && <span className="cs-paused">Paused</span>}
          </Ring>

          {/* What's coming. During a rest this is the whole point of the
              screen, so it's big; during work it's a quiet line. */}
          {step.type === 'work' ? (
            <p className="cs-upnext-line">
              {nextWork
                ? <>Up next: <strong>{exName(nextWork.exIndex)}</strong>{nextWork.round !== step.round && ` · round ${nextWork.round + 1}`}</>
                : <strong>Last one — finish strong</strong>}
            </p>
          ) : (
            nextWork && (
              <div className="cs-upnext-card">
                <p className="cs-upnext-label">
                  {step.type === 'roundRest' ? `Round ${nextWork.round + 1} starts with` : step.type === 'ready' ? 'First up' : 'Up next'}
                </p>
                <div className="cs-upnext-row">
                  <MuscleIcon muscleGroup={exGroup(nextWork.exIndex)} className="cs-upnext-icon" />
                  <span className="cs-upnext-name">{exName(nextWork.exIndex)}</span>
                </div>
                <p className="cs-upnext-meta">{fmtShort(circuit.work)} · {nextWork.exIndex + 1} of {logs.length}</p>
              </div>
            )
          )}

          <div className="cs-controls">
            <button className="cs-ctl" onClick={back} aria-label="Previous exercise">
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
            </button>
            <button className="cs-ctl cs-ctl--main" onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'}>
              {paused
                ? <svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30"><path d="M7 4v16l13-8z" /></svg>
                : <svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>}
            </button>
            <button className="cs-ctl" onClick={skip} aria-label={step.type === 'work' ? 'Skip exercise' : 'Skip rest'}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
            </button>
          </div>
          {step.type !== 'work' && step.type !== 'ready' && (
            <button className="cs-add-time" onClick={addTime}>+15s rest</button>
          )}
        </div>
      )}

      {complete && (
        <div className="cs-done" key="done">
          <span className="cs-done-check">✓</span>
          <p className="cs-done-title">Circuit complete</p>
          <p className="cs-muted">{completedSets} of {workTotal} intervals · {circuit.rounds} round{circuit.rounds === 1 ? '' : 's'}</p>
          <button className="xs-confirm xs-confirm--done cs-primary" onClick={onFinish} disabled={finishing}>
            {finishing ? <span className="session-spinner" /> : 'Finish Workout'}
          </button>
        </div>
      )}

      {menuOpen && (
        <Sheet title="Circuit" onClose={onCloseMenu}>
          {close => (
            <div className="xs-menu">
              {started && !complete && (
                <button className="xs-menu-item" onClick={() => close(() => commit(IDLE))}>↺ Restart circuit</button>
              )}
              <button
                className="xs-menu-item xs-menu-item--accent"
                onClick={() => close(requestFinish)}
                disabled={finishing}
              >
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
            <p className="session-modal-body">Only {completedSets}/{totalSets} intervals are done. Finish anyway?</p>
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
