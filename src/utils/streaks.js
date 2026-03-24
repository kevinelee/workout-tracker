function toDateStr(date) {
  return new Date(date).toISOString().slice(0, 10)
}

function buildActivitySet(sessions, checkIns) {
  const dates = new Set()
  for (const s of sessions) {
    if (s.finishedAt) dates.add(toDateStr(s.finishedAt))
  }
  for (const d of checkIns) dates.add(d)
  return dates
}

export function calcStreak(sessions, checkIns) {
  const dates = buildActivitySet(sessions, checkIns)
  const today = toDateStr(new Date())
  const yesterday = toDateStr(new Date(Date.now() - 86400000))

  // Streak is alive if active today or yesterday
  const startStr = dates.has(today) ? today : dates.has(yesterday) ? yesterday : null
  if (!startStr) return 0

  let streak = 0
  const cursor = new Date(startStr)
  while (dates.has(toDateStr(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// Returns array of { date: 'YYYY-MM-DD', count: number } for the last `weeks` weeks
export function buildHeatmapData(sessions, checkIns, weeks = 16) {
  const dates = buildActivitySet(sessions, checkIns)
  const data = []
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - weeks * 7 + 1)

  const cursor = new Date(start)
  while (cursor <= today) {
    const d = toDateStr(cursor)
    data.push({ date: d, active: dates.has(d) })
    cursor.setDate(cursor.getDate() + 1)
  }
  return data
}

export function streakMilestone(streak) {
  const milestones = [3, 5, 7, 14, 21, 30, 60, 90, 100, 365]
  return milestones.find(m => streak === m) ?? null
}
