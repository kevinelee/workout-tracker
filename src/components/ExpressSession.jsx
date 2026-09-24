import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import HoldButton from './HoldButton'
import MuscleIcon from './MuscleIcon'
import { exerciseKind, displayWeight, displayDistance, fmtSet, hasOpenSets, upNextIndex } from '../utils/express'
import './ExpressSession.css'

// A big tappable number with −/+ underneath. Tapping the number opens the
// keypad; the weight field's buttons use HoldButton for long-press repeat.
function BigValue({ label, value, onSet, step, min = 0, decimal = false, hold = false, highlight = false, small = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const Btn = hold ? HoldButton : 'button'
  const round = v => decimal ? Math.round(v * 10) / 10 : v
  const minus = () => onSet(Math.max(min, round(value - step)))
  const plus  = () => onSet(round(value + step))
  const btnProps = fn => hold ? { onTap: fn } : { onClick: fn, type: 'button' }

  function commit() {
    const n = decimal ? parseFloat(draft) : parseInt(draft, 10)
    onSet(!isNaN(n) && n >= 0 ? n : 0)
    setEditing(false)
  }

  return (
    <div className={`xs-value${small ? ' xs-value--small' : ''}${highlight ? ' xs-value--pr' : ''}`}>
      <span className="xs-value-label">{label}</span>
      {editing ? (
        <input
          className="xs-value-input"
          type="number"
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          onFocus={e => e.target.select()}
          autoFocus
        />
      ) : (
        <button
          type="button"
          className="xs-value-num"
          onClick={() => { setDraft(value === 0 ? '' : String(value)); setEditing(true) }}
          aria-label={`Edit ${label}`}
        >
          {value}
        </button>
      )}
      <div className="xs-value-steps">
        <Btn className="xs-step" aria-label={`Decrease ${label}`} {...btnProps(minus)}>−</Btn>
        <Btn className="xs-step" aria-label={`Increase ${label}`} {...btnProps(plus)}>+</Btn>
      </div>
    </div>
  )
}

function valueFields({ exercise, set, unit, onChange }) {
  const distUnit = unit === 'kg' ? 'km' : 'mi'
  const put = (field, v) => onChange({ ...set, [field]: Math.max(0, v) })
  const storeWeight = v => put('weight', unit === 'kg' ? Math.round(v * 2.2046) : v)
  const storeDist   = v => put('weight', unit === 'kg' ? parseFloat((v / 1.60934).toFixed(3)) : v)
  const storeSecs   = v => onChange({ ...set, secs: Math.max(0, Math.min(59, Math.round(v))) })

  const min  = { key: 'min', label: 'min', value: set.reps, step: 1, onSet: v => put('reps', v) }
  const sec  = { key: 'sec', label: 'sec', value: set.secs ?? 0, step: 5, onSet: storeSecs }
  const dist = { key: 'dist', label: distUnit, value: displayDistance(set.weight, unit), step: 0.1, decimal: true, onSet: storeDist }

  let fields
  switch (exerciseKind(exercise)) {
    case 'stretch':  fields = [{ key: 'hold', label: 'sec', value: set.reps, step: 5, min: 5, onSet: v => put('reps', v) }]; break
    case 'time':     fields = [min, sec]; break
    case 'distance': fields = [dist]; break
    case 'both':     fields = [min, sec, dist]; break
    default:
      fields = [
        { key: 'weight', label: unit === 'kg' ? 'kg' : 'lbs', value: displayWeight(set.weight, unit), step: 1, hold: true, onSet: storeWeight },
        { key: 'reps', label: 'reps', value: set.reps, step: 1, onSet: v => put('reps', v) },
      ]
  }
  if (exercise.difficultyLabel) {
    const step = exercise.difficultyDecimal ? 0.5 : 1
    fields.push({
      key: 'difficulty', label: exercise.difficultyLabel, value: set.difficulty ?? 0, step, decimal: !!exercise.difficultyDecimal,
      onSet: v => onChange({ ...set, difficulty: exercise.difficultyDecimal ? Math.round(Math.max(0, v) / step) * step : Math.max(0, Math.round(v)) }),
    })
  }
  return fields
}

// Removal plays a collapse before the set actually leaves the list; this is
// how long that takes (matches .xs-set--removing in the CSS).
const ROW_EXIT_MS = 200
const SHEET_EXIT_MS = 240
const CARD_EXIT_MS = 150 // matches .xs-card--out

// Bottom sheet that plays its slide-down before unmounting. Children get an
// animated close(after) so a row tap can slide the sheet away, then act.
export function Sheet({ onClose, title, children }) {
  const [closing, setClosing] = useState(false)
  function close(after) {
    if (closing) return
    setClosing(true)
    setTimeout(() => { onClose(); after?.() }, SHEET_EXIT_MS)
  }
  return (
    <div className={`sheet-backdrop${closing ? ' sheet-backdrop--closing' : ''}`} onClick={() => close()}>
      <div className={`sheet xs-sheet${closing ? ' sheet--closing' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <p className="sheet-title">{title}</p>
        {children(close)}
      </div>
    </div>
  )
}

function ExerciseCard({
  log, logIndex, exercise, settings, prMap, bestRepsAt, lastLog, celebrating, leaving,
  canLater, nextName, upNextButton, workoutDone, finishing, restDocked, onRestSlot,
  onUpdateSet, onCompleteSet, onRescindSet, onAddSet, onRemoveSet, onConfirmRemoveSet, onNotes, onLater, onNext, onFinish,
}) {
  const [focusOverride, setFocusOverride] = useState(null)
  const [editingSets, setEditingSets] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [armedSi, setArmedSi] = useState(null)    // done set showing its "Reopen" button

  // While the rest timer is minimized it docks in this slot above Up next
  // (it's position: fixed, so the slot just holds the space open and reports
  // where it sits). The thumb zone is sticky, so this only moves on resize or
  // when the card itself is shorter than the screen and scrolls.
  const restSlotRef = useRef(null)
  useLayoutEffect(() => {
    if (!restDocked) return
    function report() {
      const el = restSlotRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      onRestSlot?.({ top: r.top, left: r.left, right: window.innerWidth - r.right })
    }
    report()
    window.addEventListener('resize', report)
    document.addEventListener('scroll', report, true)
    const ro = new ResizeObserver(report)
    ro.observe(document.body)
    return () => {
      window.removeEventListener('resize', report)
      document.removeEventListener('scroll', report, true)
      ro.disconnect()
      onRestSlot?.(null)
    }
  }, [restDocked]) // eslint-disable-line react-hooks/exhaustive-deps
  const [removingSi, setRemovingSi] = useState(null)
  const [seenCount, setSeenCount] = useState(log.sets.length) // rows past this just got added
  const notesRef = useRef(null)

  // Adjust-during-render (not an effect): a removal shrinks the list, so
  // nothing at or past the new length should count as "just added".
  if (log.sets.length < seenCount) setSeenCount(log.sets.length)

  const firstOpen = log.sets.findIndex(s => !s.completed)
  const focus = focusOverride != null && log.sets[focusOverride] && !log.sets[focusOverride].completed
    ? focusOverride
    : firstOpen
  const set = focus >= 0 ? log.sets[focus] : null
  const doneCount = log.sets.filter(s => s.completed).length
  const exerciseDone = firstOpen === -1
  const unit = settings.unit
  const kind = exerciseKind(exercise)
  const prType = exercise.prType ?? 'weight'
  const currentPR = prMap[log.exerciseId] ?? 0

  const isPRPending = !!set && kind === 'strength' && (
    prType === 'reps'
      ? set.reps > 0 && set.reps > currentPR
      : set.weight > 0 && (set.weight > currentPR || set.reps > bestRepsAt(set.weight))
  )
  // Which big number to light up: the one that's actually making the record.
  const prFields = !isPRPending ? [] : prType === 'reps' ? ['reps'] : [
    ...(set.weight > currentPR ? ['weight'] : []),
    ...(set.reps > bestRepsAt(set.weight) ? ['reps'] : []),
  ]
  const lastTime = set && lastLog ? (lastLog.sets?.[focus] ?? lastLog.sets?.[0]) : null
  const fields = set ? valueFields({ exercise, set, unit, onChange: s => onUpdateSet(logIndex, focus, s) }) : []
  const canRemove = log.sets.length > 1

  function confirm() {
    if (!set) return
    navigator.vibrate?.([10, 30, 20])
    onCompleteSet(logIndex, focus, set)
    setFocusOverride(null)
    setArmedSi(null)
  }

  // A finished set never reopens on a plain tap — that tap only reveals a
  // "Reopen" button, so a stray touch can't undo logged work.
  function tapRow(si) {
    if (editingSets || removingSi != null) return
    if (log.sets[si].completed) {
      setArmedSi(a => a === si ? null : si)
      return
    }
    setArmedSi(null)
    setFocusOverride(si)
  }

  function reopen(si) {
    onRescindSet(logIndex, si)
    setFocusOverride(si)
    setArmedSi(null)
  }

  function removeRow(si) {
    if (removingSi != null) return
    // A logged set is real data — ask first (SessionScreen's confirm modal).
    if (log.sets[si].completed) { onConfirmRemoveSet(logIndex, si); return }
    setRemovingSi(si)
    setTimeout(() => {
      onRemoveSet(logIndex, si)
      setRemovingSi(null)
      setFocusOverride(null)
    }, ROW_EXIT_MS)
  }

  function toggleNotes() {
    if (showNotes) { setShowNotes(false); notesRef.current?.blur(); return }
    // Render it open synchronously so the focus lands inside this tap —
    // iOS only raises the keyboard for a focus made during the gesture.
    flushSync(() => setShowNotes(true))
    notesRef.current?.focus({ preventScroll: true })
  }

  return (
    <div className={`xs-card${celebrating ? ' xs-card--celebrating' : ''}${leaving ? ' xs-card--out' : ''}`}>
      <div className="xs-ex-head">
        <MuscleIcon muscleGroup={exercise.muscleGroup} className="xs-ex-icon" />
        <div className="xs-ex-title">
          <h3 className="xs-ex-name">{exercise.name}</h3>
          <p className="xs-ex-meta">
            {exerciseDone ? `✓ All ${log.sets.length} sets done` : `Set ${focus + 1} of ${log.sets.length}`}
            {lastTime && <span className="xs-ex-last"> · last {fmtSet(lastTime, exercise, unit)}</span>}
          </p>
        </div>
        <button
          className={`xs-icon-btn${showNotes || log.notes ? ' xs-icon-btn--on' : ''}`}
          onClick={toggleNotes}
          aria-label={showNotes ? 'Close notes' : 'Notes'}
          aria-expanded={showNotes}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <rect x="4" y="2" width="12" height="16" rx="2" /><line x1="7" y1="7" x2="13" y2="7" /><line x1="7" y1="10" x2="13" y2="10" /><line x1="7" y1="13" x2="11" y2="13" />
          </svg>
        </button>
      </div>

      <div className={`xs-collapse${showNotes ? ' xs-collapse--open' : ''}`}>
        <div className="xs-collapse-inner">
          <textarea
            ref={notesRef}
            className="xs-notes"
            placeholder="Add a note for this exercise…"
            value={log.notes ?? ''}
            onChange={e => onNotes(logIndex, e.target.value)}
            rows={2}
            tabIndex={showNotes ? 0 : -1}
          />
        </div>
      </div>

      {set ? (
        <div className={`xs-values xs-values--${Math.min(fields.length, 3)}`}>
          {fields.map(f => (
            <BigValue
              key={f.key}
              {...f}
              small={fields.length > 2}
              highlight={prFields.includes(f.key)}
            />
          ))}
        </div>
      ) : (
        <div className="xs-done">
          <span className="xs-done-check">✓</span>
          <p className="xs-done-text">{exercise.name} complete</p>
        </div>
      )}

      <div className={`xs-sets${editingSets ? ' xs-sets--editing' : ''}`}>
        <div className="xs-sets-head">
          <span>Sets · {doneCount}/{log.sets.length}</span>
          <button className="xs-link" onClick={() => { setEditingSets(v => !v); setArmedSi(null) }}>{editingSets ? 'Done' : 'Edit'}</button>
        </div>
        {log.sets.map((s, si) => (
          <div
            key={si}
            className={[
              'xs-set',
              s.completed && 'xs-set--done',
              si === focus && 'xs-set--focus',
              si === armedSi && 'xs-set--armed',
              si === removingSi && 'xs-set--removing',
              si >= seenCount && 'xs-set--new',
            ].filter(Boolean).join(' ')}
            onClick={() => tapRow(si)}
            onAnimationEnd={e => { if (e.animationName === 'xs-row-in') setSeenCount(log.sets.length) }}
            role="button"
            tabIndex={0}
          >
            <span className="xs-set-index">{s.isBonus ? '+' : si + 1}</span>
            <span className="xs-set-value">{fmtSet(s, exercise, unit)}</span>
            {s.isPR && <span className="xs-set-pr">{s.prKind === 'reps' ? 'REP PR' : s.prKind === 'both' ? 'PR+' : 'PR'}</span>}
            <span className="xs-set-status">{s.completed ? '✓' : si === focus ? 'now' : ''}</span>
            {s.completed && (
              <button
                className="xs-set-reopen"
                onClick={e => { e.stopPropagation(); reopen(si) }}
                tabIndex={si === armedSi ? 0 : -1}
                aria-hidden={si !== armedSi}
              >
                Reopen
              </button>
            )}
            {canRemove && (
              <button
                className="xs-set-remove"
                onClick={e => { e.stopPropagation(); removeRow(si) }}
                tabIndex={editingSets ? 0 : -1}
                aria-hidden={!editingSets}
                aria-label={`Remove set ${si + 1}`}
              >✕</button>
            )}
          </div>
        ))}
        <button className="xs-add-set" onClick={() => onAddSet(logIndex)}>+ Add set</button>
      </div>

      {/* Thumb zone, top to bottom: what's next (+ swap it in), PR hint,
          and the Confirm button pinned to the bottom edge. */}
      <div className="xs-actions">
        {restDocked && <div className="xs-rest-slot" ref={restSlotRef} />}
        <div className="xs-next-row">
          {upNextButton}
          {canLater && doneCount === 0 && (
            <button className="xs-later" onClick={() => onLater(logIndex)} aria-label="Machine taken? Do this exercise later">
              Later
            </button>
          )}
        </div>
        <p className={`xs-pr-hint${isPRPending ? ' xs-pr-hint--on' : ''}`} aria-hidden={!isPRPending}>🏆 This set is a PR</p>
        {set ? (
          <button className={`xs-confirm${isPRPending ? ' xs-confirm--pr' : ''}`} onClick={confirm}>
            {doneCount === log.sets.length - 1 ? 'Finish Exercise' : `Complete Set ${focus + 1}`}
          </button>
        ) : workoutDone ? (
          <button className="xs-confirm xs-confirm--done" onClick={onFinish} disabled={finishing}>
            {finishing ? <span className="session-spinner" /> : 'Finish Workout'}
          </button>
        ) : (
          <button className="xs-confirm" onClick={onNext}>Next: {nextName} →</button>
        )}
      </div>
    </div>
  )
}

export default function ExpressSession({
  logs, currentIndex, deferredId, onChangeIndex, findExercise, settings, prMap, bestRepsAt, lastLogFor, celebratingExercise,
  onUpdateSet, onCompleteSet, onRescindSet, onAddSet, onRemoveSet, onConfirmRemoveSet, onNotes, onLater,
  onAddExercise, onSubstitute, onRemoveExercise, onCopyLast, onShowBreakdown, onAbandon,
  onFinish, finishing, totalSets, completedSets,
  menuOpen, onCloseMenu, restDocked, onRestSlot,
}) {
  const [queueOpen, setQueueOpen] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [switching, setSwitching] = useState(false)

  // Changing exercise: fade the current card out, then swap in the new one
  // (which fades in on mount) — a crossfade rather than a slide.
  function switchExercise(change) {
    if (switching) return
    setSwitching(true)
    setTimeout(() => { change(); setSwitching(false) }, CARD_EXIT_MS)
  }

  if (logs.length === 0) {
    return (
      <div className="xs">
        <div className="xs-empty">
          <p>No exercises in this workout yet.</p>
          <button className="xs-confirm" onClick={onAddExercise}>+ Add exercise</button>
        </div>
      </div>
    )
  }

  const log = logs[currentIndex]
  const exercise = findExercise(log.exerciseId)
  const nextIdx = upNextIndex(logs, currentIndex, deferredId)
  const upNext = nextIdx >= 0 ? findExercise(logs[nextIdx].exerciseId) : null
  const canLater = nextIdx >= 0
  const workoutDone = totalSets > 0 && completedSets === totalSets

  const upNextButton = (
    <button className="xs-upnext" onClick={() => setQueueOpen(true)}>
      <span className="xs-upnext-label">{upNext ? 'Up next' : 'Workout'}</span>
      <span className="xs-upnext-name">{upNext ? upNext.name : workoutDone ? 'All exercises done' : 'Last exercise'}</span>
      <span className="xs-upnext-all">All {logs.length} ›</span>
    </button>
  )

  return (
    <div className="xs">
      {/* Progress dots — one per exercise */}
      <div className="xs-dots" aria-hidden="true">
        {logs.map((l, i) => (
          <span
            key={l.exerciseId}
            className={`xs-dot${!hasOpenSets(l) ? ' xs-dot--done' : ''}${i === currentIndex ? ' xs-dot--current' : ''}`}
          />
        ))}
      </div>

      {exercise ? (
        <ExerciseCard
          key={log.exerciseId}
          log={log}
          logIndex={currentIndex}
          exercise={exercise}
          settings={settings}
          prMap={prMap}
          bestRepsAt={w => bestRepsAt(log.exerciseId, w)}
          lastLog={lastLogFor(log.exerciseId)}
          celebrating={celebratingExercise === log.exerciseId}
          leaving={switching}
          canLater={canLater}
          nextName={upNext?.name}
          upNextButton={upNextButton}
          restDocked={restDocked}
          onRestSlot={onRestSlot}
          workoutDone={workoutDone}
          finishing={finishing}
          onUpdateSet={onUpdateSet}
          onCompleteSet={onCompleteSet}
          onRescindSet={onRescindSet}
          onAddSet={onAddSet}
          onRemoveSet={onRemoveSet}
          onConfirmRemoveSet={onConfirmRemoveSet}
          onNotes={onNotes}
          onLater={li => switchExercise(() => onLater(li))}
          onNext={() => switchExercise(() => onChangeIndex(nextIdx))}
          onFinish={onFinish}
        />
      ) : (
        <>
          <div className="xs-empty"><p>This exercise is no longer in your library.</p></div>
          {upNextButton}
        </>
      )}

      {/* Queue sheet — jump to any exercise */}
      {queueOpen && (
        <Sheet title="Exercises" onClose={() => setQueueOpen(false)}>
          {close => (
            <>
              <div className="xs-queue">
                {logs.map((l, i) => {
                  const ex = findExercise(l.exerciseId)
                  const done = l.sets.filter(s => s.completed).length
                  const status = done === l.sets.length ? '✓ Done' : done > 0 ? `${done}/${l.sets.length}` : `${l.sets.length} set${l.sets.length === 1 ? '' : 's'}`
                  return (
                    <button
                      key={l.exerciseId}
                      className={`xs-queue-row${i === currentIndex ? ' xs-queue-row--current' : ''}${done === l.sets.length ? ' xs-queue-row--done' : ''}`}
                      onClick={() => close(() => { if (i !== currentIndex) switchExercise(() => onChangeIndex(i)) })}
                    >
                      <span className="xs-queue-num">{i + 1}</span>
                      <MuscleIcon muscleGroup={ex?.muscleGroup} className="xs-queue-icon" />
                      <span className="xs-queue-name">{ex?.name ?? 'Unknown exercise'}</span>
                      <span className={`xs-queue-status${done > 0 && done < l.sets.length ? ' xs-queue-status--partial' : ''}`}>
                        {i === currentIndex ? 'Now' : status}
                      </span>
                    </button>
                  )
                })}
              </div>
              <button className="xs-sheet-add" onClick={() => close(onAddExercise)}>+ Add exercise</button>
            </>
          )}
        </Sheet>
      )}

      {/* ⋯ menu */}
      {menuOpen && (
        <Sheet title={exercise?.name ?? 'Workout'} onClose={onCloseMenu}>
          {close => (
            <div className="xs-menu">
              <button className="xs-menu-item" onClick={() => close(() => onSubstitute(currentIndex))}>⇄ Substitute exercise</button>
              <button className="xs-menu-item" onClick={() => close(() => onRemoveExercise(currentIndex))}>✕ Remove exercise</button>
              <button className="xs-menu-item" onClick={() => close(onAddExercise)}>+ Add exercise</button>
              {onCopyLast && <button className="xs-menu-item" onClick={() => close(onCopyLast)}>📋 Copy last session</button>}
              {onShowBreakdown && <button className="xs-menu-item" onClick={() => close(onShowBreakdown)}>✨ View AI breakdown</button>}
              <button
                className="xs-menu-item xs-menu-item--accent"
                onClick={() => close(() => workoutDone ? onFinish() : setConfirmFinish(true))}
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
