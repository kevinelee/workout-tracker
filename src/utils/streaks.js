function toDateStr(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildActivitySet(sessions, checkIns) {
  const dates = new Set()
  for (const s of sessions) {
    if (s.startedAt) dates.add(toDateStr(s.startedAt))
  }
  for (const d of checkIns) dates.add(d)
  return dates
}

// Start of "this week" per the user's configured weekStartDay (0=Sunday,
// 1=Monday, ... matching Date.getDay()), as a Date at local midnight.
// For "this week" filtering/display — distinct from toWeekStartStr below,
// which hardcodes Monday-start and is only used for streak continuity.
export function startOfThisWeek(weekStartDay = 1) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysSinceStart = ((today.getDay() - weekStartDay) + 7) % 7
  today.setDate(today.getDate() - daysSinceStart)
  return today
}

// Monday-start, matching the week boundary already used elsewhere in the app
// (see weekStartDay in HistoryScreen.jsx). Returns that week's Monday as a
// date string, used as the week's identity for grouping/comparison.
//
// Takes a Date, not a string -- new Date('YYYY-MM-DD') parses as UTC
// midnight, which in any timezone behind UTC (all of the Americas) lands on
// the previous local day. Round-tripping a date through toDateStr and back
// via `new Date(str)` silently shifts it back a day. Every date here has to
// stay a real Date object, stepped with setDate, and only ever turned into a
// string at the point it's used as a Set key -- never turned back into a Date.
function toWeekStartStr(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const daysSinceMonday = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - daysSinceMonday)
  return toDateStr(d)
}

// Weeks starting on or after this Monday have to hit the profile's target
// days/week to count toward the streak. Earlier weeks keep the original rule
// (any activity at all) so switching rules didn't wipe out existing streaks.
const TARGET_RULE_SINCE = '2026-09-21'

// Consecutive weeks (Monday-Sunday) that hit their goal, counted in distinct
// active days. The week in progress never breaks the streak -- it only adds
// to it once its goal is hit -- so the streak doesn't zero out on a Monday
// before you've had a chance to train.
//
// Returns { streak, doneThisWeek, target, weekMet } so the banner can show
// progress through the current week, not just the total.
export function streakStatus(sessions, checkIns, targetDaysPerWeek = 3) {
  const target = Math.max(1, targetDaysPerWeek)
  const daysPerWeek = new Map()
  for (const d of buildActivitySet(sessions, checkIns)) {
    const week = toWeekStartStr(new Date(d + 'T12:00:00'))
    daysPerWeek.set(week, (daysPerWeek.get(week) ?? 0) + 1)
  }
  // Week keys are zero-padded YYYY-MM-DD, so string order is date order.
  const goalFor = week => week >= TARGET_RULE_SINCE ? target : 1
  const met = week => (daysPerWeek.get(week) ?? 0) >= goalFor(week)

  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  const thisWeek = toWeekStartStr(cursor)
  const weekMet = met(thisWeek)

  let streak = weekMet ? 1 : 0
  cursor.setDate(cursor.getDate() - 7)
  while (met(toWeekStartStr(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 7)
  }
  return { streak, doneThisWeek: daysPerWeek.get(thisWeek) ?? 0, target: goalFor(thisWeek), weekMet }
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
