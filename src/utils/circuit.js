// Helpers for circuit workouts: a template with a `circuit` config runs as a
// timed loop (work → rest → next exercise) instead of set-by-set logging.

import { exerciseKind } from './express'

export const DEFAULT_CIRCUIT = { rounds: 3, work: 40, rest: 20, roundRest: 60 }

// Seconds of "get ready" before the first work interval.
export const GET_READY_SECS = 5

export const CIRCUIT_LIMITS = {
  rounds:    { min: 1, max: 20,  step: 1 },
  work:      { min: 5, max: 600, step: 5 },
  rest:      { min: 0, max: 300, step: 5 },
  roundRest: { min: 0, max: 600, step: 15 },
}

export function normalizeCircuit(c) {
  const out = { ...DEFAULT_CIRCUIT }
  for (const key of Object.keys(CIRCUIT_LIMITS)) {
    const { min, max } = CIRCUIT_LIMITS[key]
    const n = Number(c?.[key])
    if (Number.isFinite(n)) out[key] = Math.min(max, Math.max(min, Math.round(n)))
  }
  return out
}

// Timed holds already log seconds in `reps`, so the work interval is the set.
// Everything else logs 0 reps: a 40s interval of crunches isn't 40 reps, and
// writing it there would land in the rep PRs.
export function circuitSetReps(exercise, work) {
  return exerciseKind(exercise) === 'stretch' ? work : 0
}

// Template exercises for a circuit: one template set per round.
export function circuitTemplateSets(exercise, circuit) {
  const reps = circuitSetReps(exercise, circuit.work)
  return Array.from({ length: circuit.rounds }, () => ({ reps, weight: 0 }))
}

// Every interval of the circuit, in order. Rests with 0 seconds are left out,
// so a circuit with no rest goes straight from one exercise to the next.
//   { type: 'ready' | 'work' | 'rest' | 'roundRest', duration, round, exIndex }
// For rests, exIndex/round point at the work interval that comes next.
export function buildCircuitSteps(circuit, exerciseCount) {
  const { rounds, work, rest, roundRest } = normalizeCircuit(circuit)
  const steps = []
  if (exerciseCount === 0) return steps
  steps.push({ type: 'ready', duration: GET_READY_SECS, round: 0, exIndex: 0 })
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < exerciseCount; i++) {
      steps.push({ type: 'work', duration: work, round: r, exIndex: i })
      const lastInRound = i === exerciseCount - 1
      if (!lastInRound && rest > 0) {
        steps.push({ type: 'rest', duration: rest, round: r, exIndex: i + 1 })
      } else if (lastInRound && r < rounds - 1 && roundRest > 0) {
        steps.push({ type: 'roundRest', duration: roundRest, round: r + 1, exIndex: 0 })
      }
    }
  }
  return steps
}

export function circuitTotalSeconds(circuit, exerciseCount) {
  return buildCircuitSteps(circuit, exerciseCount)
    .filter(s => s.type !== 'ready')
    .reduce((sum, s) => sum + s.duration, 0)
}

export function fmtClock(seconds) {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// "40s", "1:30", "2m"
export function fmtShort(seconds) {
  if (seconds < 60) return `${seconds}s`
  return seconds % 60 === 0 ? `${seconds / 60}m` : fmtClock(seconds)
}

export function circuitSummary(circuit, exerciseCount) {
  const c = normalizeCircuit(circuit)
  const total = circuitTotalSeconds(c, exerciseCount)
  const parts = [
    `${c.rounds} round${c.rounds === 1 ? '' : 's'}`,
    `${fmtShort(c.work)} on / ${c.rest > 0 ? fmtShort(c.rest) : 'no'} rest`,
  ]
  if (exerciseCount > 0) parts.push(`~${Math.max(1, Math.round(total / 60))} min`)
  return parts.join(' · ')
}
