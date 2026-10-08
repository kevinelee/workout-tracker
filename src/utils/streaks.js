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

// Monday week key `n` weeks away from `week`. Parsed at local noon, not
// midnight, so neither the UTC shift described above nor a DST change can
// move it onto a different day.
function addWeeks(week, n) {
  const d = new Date(week + 'T12:00:00')
  d.setDate(d.getDate() + n * 7)
  return toDateStr(d)
}

// A streak pause covers weeks that missed their goal: they don't break the
// streak and don't add to it. At most PAUSE_BUDGET_WEEKS weeks are covered in
// any PAUSE_WINDOW_WEEKS stretch, and a pause can reach back at most
// PAUSE_BACKDATE_WEEKS before the week it was created in.
export const PAUSE_BUDGET_WEEKS = 8
const PAUSE_WINDOW_WEEKS   = 52
const PAUSE_BACKDATE_WEEKS = 1

// Which missed weeks the pauses cover, and the pause still running (if any).
// pauses: [{ startWeek, endWeek, createdAt }] -- week keys, endWeek null
// while the pause is open. A pause stops covering at the earliest of: its
// endWeek, a week after its first that hits the goal (you're back), or the
// budget running out.
function resolvePauses(pauses, met, thisWeek) {
  const frozen = new Set()
  let active = null
  for (const p of [...pauses].sort((a, b) => a.startWeek < b.startWeek ? -1 : 1)) {
    let start = p.startWeek
    if (p.createdAt) {
      const earliest = addWeeks(toWeekStartStr(new Date(p.createdAt)), -PAUSE_BACKDATE_WEEKS)
      if (start < earliest) start = earliest
    }
    const last = p.endWeek && p.endWeek < thisWeek ? p.endWeek : thisWeek
    let ended = false
    for (let week = start; week <= last; week = addWeeks(week, 1)) {
      if (met(week)) {
        if (week === start) continue
        ended = true
        break
      }
      if (frozen.has(week)) continue
      if (pauseWeeksUsed(frozen, week) >= PAUSE_BUDGET_WEEKS) {
        ended = true
        break
      }
      frozen.add(week)
    }
    if (!p.endWeek && !ended) active = p
  }
  return { frozen, active }
}

// Covered weeks in the budget window ending at (and including) `week`.
function pauseWeeksUsed(frozen, week) {
  const windowStart = addWeeks(week, -PAUSE_WINDOW_WEEKS)
  let used = 0
  for (const f of frozen) if (f > windowStart && f <= week) used++
  return used
}

// Consecutive weeks (Monday-Sunday) that hit their goal, counted in distinct
// active days. The week in progress never breaks the streak -- it only adds
// to it once its goal is hit -- so the streak doesn't zero out on a Monday
// before you've had a chance to train. Weeks covered by a pause are skipped.
//
// Returns { streak, doneThisWeek, target, weekMet } so the banner can show
// progress through the current week, not just the total, plus the pause
// state: { activePause, pauseWeeksLeft, thisWeek }.
export function streakStatus(sessions, checkIns, targetDaysPerWeek = 3, pauses = []) {
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
  const { frozen, active } = resolvePauses(pauses, met, thisWeek)

  let streak = weekMet ? 1 : 0
  cursor.setDate(cursor.getDate() - 7)
  for (let week = toWeekStartStr(cursor); met(week) || frozen.has(week); week = toWeekStartStr(cursor)) {
    if (met(week)) streak++
    cursor.setDate(cursor.getDate() - 7)
  }
  return {
    streak,
    doneThisWeek: daysPerWeek.get(thisWeek) ?? 0,
    target: goalFor(thisWeek),
    weekMet,
    activePause: active,
    pauseWeeksLeft: PAUSE_BUDGET_WEEKS - pauseWeeksUsed(frozen, thisWeek),
    thisWeek,
  }
}

// The week a pause started now should begin in: last week when that rescues
// a streak last week's miss would otherwise have ended, else this week.
export function pauseStartWeek(sessions, checkIns, targetDaysPerWeek, pauses = []) {
  const createdAt = new Date().toISOString()
  const withStart = startWeek =>
    streakStatus(sessions, checkIns, targetDaysPerWeek, [...pauses, { startWeek, endWeek: null, createdAt }])
  const { thisWeek, streak } = withStart(toWeekStartStr(new Date()))
  const lastWeek = addWeeks(thisWeek, -1)
  return withStart(lastWeek).streak > streak ? lastWeek : thisWeek
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
