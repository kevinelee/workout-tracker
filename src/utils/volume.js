export function setVolume(set) {
  return set.completed ? set.weight * set.reps : 0
}

export function logVolume(log) {
  return log.sets.reduce((sum, s) => sum + setVolume(s), 0)
}

export function sessionVolume(session) {
  return (session.logs ?? []).reduce((sum, log) => sum + logVolume(log), 0)
}

export function sessionPRCount(session) {
  return (session.logs ?? []).reduce(
    (sum, log) => sum + log.sets.filter(s => s.isPR).length,
    0
  )
}

export function volumeChangePercent(current, previous) {
  if (!previous || previous === 0) return null
  return ((current - previous) / previous) * 100
}

export function fmtVolume(lbs) {
  if (lbs >= 1000) return `${(lbs / 1000).toFixed(1)}k`
  return String(lbs)
}

export function fmtDuration(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function motivationalCopy({ prsHit, volumePct, allDone }) {
  if (prsHit > 0) return `🏆 ${prsHit} new PR${prsHit > 1 ? 's' : ''}! You're unstoppable.`
  if (!allDone) return "Still showed up. That's what counts. 💪"
  if (volumePct !== null && volumePct > 10) return `🔥 Up ${Math.round(volumePct)}% from last time!`
  if (volumePct !== null && volumePct > 0) return `📈 Up ${Math.round(volumePct)}% from last session.`
  if (volumePct !== null && volumePct < -10) return "Everyone has an off day. Back stronger next time. 💪"
  return "Solid session. Keep showing up. 💪"
}

// Build chart data for a single exercise across sessions
export function buildVolumeChartData(exerciseId, sessions) {
  return sessions
    .filter(s => s.finishedAt && (s.logs ?? []).some(l => l.exerciseId === exerciseId))
    .sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt))
    .map(s => {
      const log = s.logs.find(l => l.exerciseId === exerciseId)
      const vol = logVolume(log)
      return {
        date: new Date(s.finishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        volume: vol,
      }
    })
}
