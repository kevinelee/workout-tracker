// Guided workouts: exercises run one after another, all sets of an exercise
// before the next, with rests in between. The player walks the whole thing
// on its own: set → rest → set → … → next exercise → … → complete.
//
// The plan stores each exercise ONCE, with a set count, not one object per
// set:
//   template.guided = { exercises: [{ exerciseId, sets: 3, type: 'timed', target: 30, rest: 15 }] }
// expandSets() turns that into the individual sets, and buildGuidedSteps()
// into the timeline the player runs. Per-set differences (a drop set, a
// longer last hold) can later go in an optional `setOverrides` array on the
// exercise — expandSets() already merges it, and nothing else has to change.

import { exerciseKind } from './express'

// timed — perform for `target` seconds (mountain climbers, jumping jacks)
// reps  — perform `target` reps, tap Done when finished
// hold  — hold a position for `target` seconds (plank, wall sit)
export const GUIDED_TYPES = ['reps', 'timed', 'hold']

export const TYPE_LABELS = { reps: 'Reps', timed: 'Timed', hold: 'Hold' }

export const GUIDED_LIMITS = {
  sets:    { min: 1, max: 10,  step: 1 },
  reps:    { min: 1, max: 100, step: 1 },
  seconds: { min: 5, max: 600, step: 5 },
  rest:    { min: 0, max: 300, step: 5 },
}

// Seconds of "get ready" before the first set, when that set is on a timer.
export const GET_READY_SECS = 5

export const isTimedType = type => type === 'timed' || type === 'hold'

const clamp = (n, { min, max }) => Math.min(max, Math.max(min, Math.round(n)))

export function targetLimits(type) {
  return isTimedType(type) ? GUIDED_LIMITS.seconds : GUIDED_LIMITS.reps
}

// A sensible starting point for an exercise from the library.
export function defaultGuidedExercise(exercise, exerciseId = exercise?.id) {
  const kind = exerciseKind(exercise)
  const type = kind === 'stretch' ? 'hold' : kind === 'strength' ? 'reps' : 'timed'
  return { exerciseId, sets: 3, type, target: type === 'reps' ? 10 : 30, rest: 30 }
}

export function normalizeGuidedExercise(e, exercise) {
  const base = defaultGuidedExercise(exercise, e?.exerciseId)
  const type = GUIDED_TYPES.includes(e?.type) ? e.type : base.type
  const n = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback)
  const out = {
    exerciseId: e?.exerciseId ?? base.exerciseId,
    sets:   clamp(n(e?.sets, base.sets), GUIDED_LIMITS.sets),
    type,
    target: clamp(n(e?.target, type === 'reps' ? 10 : 30), targetLimits(type)),
    rest:   clamp(n(e?.rest, base.rest), GUIDED_LIMITS.rest),
  }
  if (Array.isArray(e?.setOverrides)) out.setOverrides = e.setOverrides
  return out
}

// The guided plan for a template, or null for a regular workout. Circuit
// templates from v1.2.0 carry over as guided ones: each exercise keeps its
// work time as the target, with a set per former round.
export function guidedPlanFor(template, findExercise) {
  if (!template) return null
  if (template.guided?.exercises) {
    return {
      exercises: template.guided.exercises.map(e => normalizeGuidedExercise(e, findExercise(e.exerciseId))),
    }
  }
  const c = template.circuit
  if (c && template.exercises) {
    return {
      exercises: template.exercises.map(te => {
        const exercise = findExercise(te.exerciseId)
        return normalizeGuidedExercise({
          exerciseId: te.exerciseId,
          sets: c.rounds,
          type: exerciseKind(exercise) === 'stretch' ? 'hold' : 'timed',
          target: c.work,
          rest: c.rest,
        }, exercise)
      }),
    }
  }
  return null
}

// One config per set: { type, target, rest }.
export function expandSets(ge) {
  return Array.from({ length: ge.sets }, (_, i) => ({
    type: ge.type,
    target: ge.target,
    rest: ge.rest,
    ...(ge.setOverrides?.[i] ?? {}),
  }))
}

// The player's timeline:
//   { kind: 'ready' | 'set' | 'rest', duration, exIndex, setIndex, type, target }
// duration is null for a reps set: it waits for Done instead of a timer.
// A rest points (exIndex/setIndex) at the set that comes after it, and uses
// the rest length of the set before it. Zero-second rests are left out.
export function buildGuidedSteps(planExercises) {
  const sets = planExercises.flatMap((ge, exIndex) =>
    expandSets(ge).map((cfg, setIndex) => ({ ...cfg, exIndex, setIndex })))
  const steps = []
  if (sets.length === 0) return steps
  if (isTimedType(sets[0].type)) {
    steps.push({ kind: 'ready', duration: GET_READY_SECS, exIndex: 0, setIndex: 0, type: sets[0].type, target: sets[0].target })
  }
  sets.forEach((s, i) => {
    steps.push({ kind: 'set', duration: isTimedType(s.type) ? s.target : null, exIndex: s.exIndex, setIndex: s.setIndex, type: s.type, target: s.target })
    const next = sets[i + 1]
    if (next && s.rest > 0) {
      steps.push({ kind: 'rest', duration: s.rest, exIndex: next.exIndex, setIndex: next.setIndex, type: next.type, target: next.target })
    }
  })
  return steps
}

// What a finished set logs as `reps`. Reps sets log the reps. Timed holds
// from the library (plank…) already log seconds in reps, so they keep doing
// that; any other exercise logs 0 for a timed set, so 30s of crunches can't
// turn into a 30-rep PR.
export function guidedSetReps(type, target, exercise) {
  if (type === 'reps') return target
  return exerciseKind(exercise) === 'stretch' ? target : 0
}

// Template sets to save alongside the plan, so sessions, history and set
// counts work the same as for any other workout.
export function guidedTemplateSets(ge, exercise) {
  return expandSets(ge).map(cfg => ({ reps: guidedSetReps(cfg.type, cfg.target, exercise), weight: 0 }))
}

export function fmtClock(seconds) {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// "40s", "1:30", "2m"
export function fmtSecs(seconds) {
  if (seconds < 60) return `${seconds}s`
  return seconds % 60 === 0 ? `${seconds / 60}m` : fmtClock(seconds)
}

// "12 reps", "30s", "45s hold"
export function fmtTarget(type, target) {
  if (type === 'reps') return `${target} rep${target === 1 ? '' : 's'}`
  return type === 'hold' ? `${fmtSecs(target)} hold` : fmtSecs(target)
}

// "3 × 12 reps · 30s rest"
export function fmtGuidedExercise(ge) {
  return `${ge.sets} × ${fmtTarget(ge.type, ge.target)} · ${ge.rest > 0 ? `${fmtSecs(ge.rest)} rest` : 'no rest'}`
}

// Rough length, counting a rep as ~3 seconds.
export function guidedTotalSeconds(planExercises) {
  return buildGuidedSteps(planExercises)
    .filter(s => s.kind !== 'ready')
    .reduce((sum, s) => sum + (s.duration ?? s.target * 3), 0)
}

export function guidedSummary(planExercises) {
  const sets = planExercises.reduce((n, e) => n + e.sets, 0)
  const mins = Math.max(1, Math.round(guidedTotalSeconds(planExercises) / 60))
  return `${sets} set${sets === 1 ? '' : 's'} · ~${mins} min`
}
