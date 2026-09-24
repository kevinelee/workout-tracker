// Helpers for the Express (one exercise at a time) session view.

export function exerciseKind(exercise) {
  const isCardio = exercise?.category === 'Cardio'
  const cardioUnit = exercise?.cardioUnit ?? 'time'
  if (exercise?.category === 'Stretch' || exercise?.isTimed) return 'stretch'
  if (isCardio && cardioUnit === 'distance') return 'distance'
  if (isCardio && cardioUnit === 'both') return 'both'
  if (isCardio) return 'time'
  return 'strength'
}

const pad = n => String(n ?? 0).padStart(2, '0')

// Weight is stored in lbs and distance in miles — convert for display only,
// matching SessionSetRow.
export function displayWeight(weight, unit) {
  return unit === 'kg' ? Math.round(weight / 2.2046) : weight
}

// One −/+ tap on a weight, in display units: 5 lb steps (1 kg). Snaps to the
// step grid, so an odd weight like 137 goes to 140 / 135 rather than 142 / 132.
export function stepWeight(value, direction, unit) {
  const step = unit === 'kg' ? 1 : 5
  const next = direction > 0 ? Math.floor(value / step) * step + step : Math.ceil(value / step) * step - step
  return Math.max(0, next)
}

export function displayDistance(dist, unit) {
  return unit === 'kg' ? Math.round(dist * 1.60934 * 10) / 10 : dist
}

export function fmtSet(set, exercise, unit) {
  if (!set) return ''
  const distUnit = unit === 'kg' ? 'km' : 'mi'
  switch (exerciseKind(exercise)) {
    case 'stretch':  return `${set.reps}s`
    case 'time':     return `${set.reps}:${pad(set.secs)}`
    case 'distance': return `${displayDistance(set.weight, unit)} ${distUnit}`
    case 'both':     return `${set.reps}:${pad(set.secs)} · ${displayDistance(set.weight, unit)} ${distUnit}`
    default:
      return set.weight > 0
        ? `${displayWeight(set.weight, unit)} ${unit === 'kg' ? 'kg' : 'lbs'} × ${set.reps}`
        : `${set.reps} reps`
  }
}

export function hasOpenSets(log) {
  return log.sets.some(s => !s.completed)
}

// Next exercise with sets left, looking forward from `from` and wrapping
// around to anything skipped earlier. -1 when the whole workout is done.
export function nextOpenIndex(logs, from) {
  for (let step = 1; step <= logs.length; step++) {
    const i = (from + step) % logs.length
    if (i !== from && hasOpenSets(logs[i])) return i
  }
  return -1
}

// Where "next" goes from `from`: the exercise last pushed back with Later
// comes up first, as long as it still has sets left — otherwise the next open
// one in order. Later never reorders the logs, so the dots, the queue and the
// list view all keep the planned order.
export function upNextIndex(logs, from, deferredId) {
  const d = deferredId ? logs.findIndex(l => l.exerciseId === deferredId) : -1
  if (d >= 0 && d !== from && hasOpenSets(logs[d])) return d
  return nextOpenIndex(logs, from)
}
