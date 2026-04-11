// storage.js — fully async, Supabase-backed persistence layer
// All public functions return Promises. No localStorage used for user data.

import { nanoid } from 'nanoid'
import { supabase } from './lib/supabase'

// ── User context ─────────────────────────────────────────────
let _uid = null

export function setStorageUser(uid) {
  _uid = uid
}

// In-memory cache for custom exercises so synchronous helper
// functions in components (findExercise, exerciseName, etc.) keep working.
let _customExercisesCache = []
export function getCachedCustomExercises() {
  return _customExercisesCache
}


// ── Shape transforms ─────────────────────────────────────────
// DB rows use snake_case and flat joins; app uses camelCase nested objects.

function dbTemplateToApp(t) {
  const exercises = (t.template_exercises ?? [])
    .sort((a, b) => a.position - b.position)
    .map(te => ({
      exerciseId: te.exercise_id,
      notes:      te.notes ?? '',
      sets: (te.template_sets ?? [])
        .sort((a, b) => a.position - b.position)
        .map(s => ({ reps: s.reps, weight: Number(s.weight) })),
      // keep DB ids for updates
      _teId: te.id,
    }))

  return {
    id:         t.id,
    name:       t.name,
    createdAt:  t.created_at,
    exercises,
  }
}

function dbSessionToApp(s) {
  const logs = (s.session_logs ?? [])
    .sort((a, b) => a.position - b.position)
    .map(log => ({
      exerciseId: log.exercise_id,
      notes:      log.notes ?? '',
      sets: (log.session_sets ?? [])
        .sort((a, b) => a.position - b.position)
        .map(ss => ({
          reps:      ss.reps,
          weight:    Number(ss.weight),
          completed: ss.completed,
          isPR:      ss.is_pr,
        })),
    }))

  return {
    id:          s.id,
    templateId:  s.template_id,
    startedAt:   s.started_at,
    finishedAt:  s.finished_at,
    duration:    s.duration_seconds,
    status:      s.status,
    logs,
  }
}

function dbProfileToApp(p) {
  if (!p) return defaultProfile()
  return {
    displayName:        p.display_name ?? '',
    avatarUrl:          p.avatar_url ?? '',
    heightCm:           p.height_cm          != null ? Number(p.height_cm)          : null,
    weightKg:           p.weight_kg          != null ? Number(p.weight_kg)          : null,
    age:                p.age                != null ? Number(p.age)                : null,
    gender:             p.gender             ?? null,
    activityLevel:      p.activity_level     ?? null,
    trackWeight:           p.track_weight       ?? null,
    weekStartDay:          p.week_start_day     != null ? Number(p.week_start_day)     : 1,
    targetDaysPerWeek:     p.target_days_per_week != null ? Number(p.target_days_per_week) : 3,
    onboardingComplete:    p.onboarding_complete  ?? false,
    fitnessProfileSummary: p.fitness_profile_summary ?? null,
  }
}

function defaultProfile() {
  return {
    displayName:           '',
    avatarUrl:             '',
    heightCm:              null,
    weightKg:              null,
    age:                   null,
    gender:                null,
    activityLevel:         null,
    trackWeight:           null,
    weekStartDay:          1,
    targetDaysPerWeek:     3,
    onboardingComplete:    false,
    fitnessProfileSummary: null,
  }
}

function decodeTheme(theme) {
  if (!theme || theme === 'dark') return { colorScheme: 'default', themeMode: 'dark' }
  if (theme === 'light')          return { colorScheme: 'default', themeMode: 'light' }
  if (theme === 'amoled')         return { colorScheme: 'amoled',  themeMode: 'dark' }
  if (theme.endsWith('-light'))   return { colorScheme: theme.replace('-light', ''), themeMode: 'light' }
  return { colorScheme: theme, themeMode: 'dark' } // 'pink', 'blue', etc.
}

export function encodeTheme(colorScheme, themeMode) {
  if (colorScheme === 'default') return themeMode === 'light' ? 'light' : 'dark'
  if (colorScheme === 'amoled')  return 'amoled'
  return themeMode === 'light' ? `${colorScheme}-light` : colorScheme
}

function dbSettingsToApp(s) {
  if (!s) return defaultSettings()
  const { colorScheme, themeMode } = decodeTheme(s.theme)
  return {
    unit:               s.unit,
    colorScheme,
    themeMode,
    controllerSide:     s.controller_side,
    restTimerDuration:  s.rest_timer_duration,
    checkInEnabled:     s.check_in_enabled,
  }
}

function defaultSettings() {
  return {
    unit:               'lbs',
    colorScheme:        'default',
    themeMode:          'dark',
    controllerSide:     'right',
    restTimerDuration:  90,
    checkInEnabled:     true,
  }
}


// ── Custom Exercises ─────────────────────────────────────────

export async function getCustomExercises() {
  const { data } = await supabase
    .from('custom_exercises')
    .select('*')
    .order('created_at', { ascending: true })
  _customExercisesCache = (data ?? []).map(e => ({
    id:          e.id,
    name:        e.name,
    category:    e.category,
    muscleGroup: e.muscle_group,
    isCustom:    true,
  }))
  return _customExercisesCache
}

export async function saveCustomExercise(exercise) {
  await supabase.from('custom_exercises').upsert({
    id:           exercise.id,
    user_id:      _uid,
    name:         exercise.name,
    category:     exercise.category,
    muscle_group: exercise.muscleGroup,
  })
  await getCustomExercises() // refresh cache
}

export async function deleteCustomExercise(id) {
  await supabase.from('custom_exercises').delete().eq('id', id)
  _customExercisesCache = _customExercisesCache.filter(e => e.id !== id)
}


// ── Workout Templates ────────────────────────────────────────

const TEMPLATES_CACHE_KEY = uid => `wt:templates:${uid}`
const SETTINGS_CACHE_KEY  = uid => `wt:settings:${uid}`
const SESSIONS_CACHE_KEY  = uid => `wt:sessions:${uid}`

export function getCachedTemplates(uid) {
  try {
    const raw = localStorage.getItem(TEMPLATES_CACHE_KEY(uid))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function writeCachedTemplates(templates) {
  try { localStorage.setItem(TEMPLATES_CACHE_KEY(_uid), JSON.stringify(templates)) } catch {}
}

export function getCachedSettings(uid) {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY(uid))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function writeCachedSettings(settings) {
  try { localStorage.setItem(SETTINGS_CACHE_KEY(_uid), JSON.stringify(settings)) } catch {}
}

export function getCachedSessions(uid) {
  try {
    const raw = localStorage.getItem(SESSIONS_CACHE_KEY(uid))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function writeCachedSessions(sessions) {
  // Cap at 50 most recent to avoid localStorage bloat
  try { localStorage.setItem(SESSIONS_CACHE_KEY(_uid), JSON.stringify(sessions.slice(0, 50))) } catch {}
}

export async function getTemplates() {
  const { data } = await supabase
    .from('workout_templates')
    .select(`
      *,
      template_exercises (
        *,
        template_sets (*)
      )
    `)
    .order('created_at', { ascending: true })
  const result = (data ?? []).map(dbTemplateToApp)
  writeCachedTemplates(result)
  return result
}

export async function saveTemplate(template) {
  // 1. Upsert the template row
  await supabase.from('workout_templates').upsert({
    id:      template.id,
    user_id: _uid,
    name:    template.name,
  })

  // 2. Replace all exercises: delete existing, then re-insert
  await supabase.from('template_exercises').delete().eq('template_id', template.id)

  for (let i = 0; i < template.exercises.length; i++) {
    const ex = template.exercises[i]
    const teId = nanoid()

    await supabase.from('template_exercises').insert({
      id:          teId,
      template_id: template.id,
      exercise_id: ex.exerciseId,
      position:    i,
      notes:       ex.notes ?? '',
    })

    for (let j = 0; j < ex.sets.length; j++) {
      await supabase.from('template_sets').insert({
        id:                   nanoid(),
        template_exercise_id: teId,
        position:             j,
        reps:                 ex.sets[j].reps,
        weight:               ex.sets[j].weight,
      })
    }
  }
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from('workout_templates').delete().eq('id', id)
  if (error) throw error
}

export function getTemplateOrder() {
  if (!_uid) return null
  try {
    const raw = localStorage.getItem(`wt:template-order:${_uid}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveTemplateOrder(ids) {
  if (!_uid) return
  try { localStorage.setItem(`wt:template-order:${_uid}`, JSON.stringify(ids)) } catch {}
}


// ── Sessions ─────────────────────────────────────────────────

export async function getSessions() {
  const { data } = await supabase
    .from('sessions')
    .select(`
      *,
      session_logs (
        *,
        session_sets (*)
      )
    `)
    .eq('user_id', _uid)
    .eq('status', 'finished')
    .order('finished_at', { ascending: false })
  const sessions = (data ?? []).map(dbSessionToApp)
  writeCachedSessions(sessions)
  return sessions
}

async function saveSessionViaEdgeFunction(session) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  const token = authSession?.access_token
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ session }),
    }
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `save-session edge function failed: ${res.status}`)
  }
}

export async function saveSession(session) {
  // 1. Update session row — use update() not upsert() to avoid overwriting user_id.
  //    Add .select('id') so we can detect if 0 rows matched (orphaned session).
  const { data: updated, error: sessionErr } = await supabase.from('sessions').update({
    template_id:      session.templateId ?? null,
    started_at:       session.startedAt,
    finished_at:      session.finishedAt ?? null,
    duration_seconds: session.duration ?? null,
    status:           session.finishedAt ? 'finished' : 'active',
    pr_map:           session.prMap ?? {},
  }).eq('id', session.id).eq('user_id', _uid).select('id')

  if (sessionErr) console.error('[saveSession] update session:', sessionErr)

  // If 0 rows were updated the session is likely orphaned (null user_id).
  // Fall back to the edge function which uses the service role to claim + update it.
  if (!sessionErr && (!updated || updated.length === 0)) {
    await saveSessionViaEdgeFunction(session)
    return
  }

  if (!session.logs?.length) return

  // 2. Replace logs: delete existing, re-insert
  await supabase.from('session_logs').delete().eq('session_id', session.id)

  for (let i = 0; i < session.logs.length; i++) {
    const log = session.logs[i]
    const logId = nanoid()

    await supabase.from('session_logs').insert({
      id:          logId,
      session_id:  session.id,
      exercise_id: log.exerciseId,
      position:    i,
      notes:       log.notes ?? '',
    })

    for (let j = 0; j < log.sets.length; j++) {
      const s = log.sets[j]
      await supabase.from('session_sets').insert({
        id:             nanoid(),
        session_log_id: logId,
        position:       j,
        reps:           s.reps,
        weight:         s.weight,
        completed:      s.completed,
        is_pr:          s.isPR ?? false,
      })
    }
  }
}

export async function deleteSession(id) {
  // Delete children explicitly — cascade may not be active on the live DB
  const { data: logs } = await supabase
    .from('session_logs').select('id').eq('session_id', id)

  if (logs?.length) {
    const logIds = logs.map(l => l.id)
    await supabase.from('session_sets').delete().in('session_log_id', logIds)
    await supabase.from('session_logs').delete().eq('session_id', id)
  }

  const { data: deleted, error } = await supabase
    .from('sessions').delete().eq('id', id).select('id')

  if (error) throw error
  // If 0 rows were deleted the session either doesn't exist or RLS blocked it.
  // Treat as success only if the select above already confirmed no logs existed
  // (i.e. the session was already gone). If logs existed but sessions returned
  // 0 rows, the delete was blocked — surface it as an error.
  if (deleted?.length === 0) {
    // Re-check: if no session row exists at all, it was already gone — OK.
    const { count } = await supabase
      .from('sessions').select('id', { count: 'exact', head: true }).eq('id', id)
    if (count && count > 0) throw new Error('Could not delete session — permission denied')
  }
}

export async function updateSessionDuration(id, durationSeconds) {
  await supabase.from('sessions').update({ duration_seconds: durationSeconds }).eq('id', id)
}

export async function getLastSessionForTemplate(templateId) {
  const { data } = await supabase
    .from('sessions')
    .select(`*, session_logs(*, session_sets(*))`)
    .eq('template_id', templateId)
    .eq('status', 'finished')
    .order('finished_at', { ascending: false })
    .limit(1)
  return data?.[0] ? dbSessionToApp(data[0]) : null
}


// ── Settings ─────────────────────────────────────────────────

export async function getSettings() {
  const { data } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', _uid)
    .single()
  const settings = dbSettingsToApp(data)
  writeCachedSettings(settings)
  return settings
}

export async function saveSettings(settings) {
  await supabase.from('settings').upsert({
    user_id:             _uid,
    unit:                settings.unit,
    theme:               encodeTheme(settings.colorScheme, settings.themeMode),
    controller_side:     settings.controllerSide,
    rest_timer_duration: settings.restTimerDuration,
    check_in_enabled:    settings.checkInEnabled,
  })
}


// ── Profile ───────────────────────────────────────────────────

export async function uploadAvatar(file) {
  // Always upload as avatar.jpg so getProfile can find it by a known path
  const path = `${_uid}/avatar.jpg`

  const { error } = await supabase.storage
    .from('Avatars')
    .upload(path, file, { upsert: true, contentType: 'image/jpeg' })

  if (error) throw error

  const { data } = supabase.storage.from('Avatars').getPublicUrl(path)
  // Cache-bust so the browser doesn't serve the old image after re-upload
  return `${data.publicUrl}?t=${Date.now()}`
  // Note: avatar URL is NOT stored in the profiles table — getProfile derives
  // it from storage directly to avoid the updated_at trigger issue.
}


export async function getProfile() {
  const [{ data: profileData }, { data: avatarFiles }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', _uid).single(),
    supabase.storage.from('Avatars').list(_uid, { search: 'avatar' }),
  ])
  const profile = dbProfileToApp(profileData)
  // Derive avatar URL from storage so we never write avatar_url to profiles
  // (avoids the updated_at trigger issue on the profiles table)
  const avatarFile = avatarFiles?.find(f => f.name.startsWith('avatar'))
  if (avatarFile) {
    const { data: urlData } = supabase.storage
      .from('Avatars')
      .getPublicUrl(`${_uid}/${avatarFile.name}`)
    // Use file's updated_at as cache-bust so re-uploads show immediately
    profile.avatarUrl = `${urlData.publicUrl}?t=${new Date(avatarFile.updated_at).getTime()}`
  }
  return profile
}

export async function saveProfile(profile) {
  await supabase.from('profiles').upsert({
    id:                    _uid,
    display_name:          profile.displayName        ?? null,
    height_cm:             profile.heightCm           ?? null,
    weight_kg:             profile.weightKg           ?? null,
    age:                   profile.age                ?? null,
    gender:                profile.gender             ?? null,
    activity_level:        profile.activityLevel      ?? null,
    track_weight:             profile.trackWeight           ?? null,
    week_start_day:           profile.weekStartDay          ?? 1,
    target_days_per_week:     profile.targetDaysPerWeek     ?? 3,
    onboarding_complete:      profile.onboardingComplete    ?? false,
    fitness_profile_summary:  profile.fitnessProfileSummary ?? null,
  })
}


// ── Body Weight Logs ──────────────────────────────────────────

export async function getBodyWeightLogs() {
  const { data } = await supabase
    .from('body_weight_logs')
    .select('*')
    .eq('user_id', _uid)
    .order('logged_at', { ascending: true })
  return (data ?? []).map(r => ({
    id:       r.id,
    weightKg: Number(r.weight_kg),
    loggedAt: r.logged_at,
  }))
}

export async function saveBodyWeightLog(weightKg) {
  const { data } = await supabase
    .from('body_weight_logs')
    .insert({ id: nanoid(), user_id: _uid, weight_kg: weightKg })
    .select()
    .single()
  // Also keep profiles.weight_kg in sync with the latest entry
  await supabase.from('profiles').upsert({ id: _uid, weight_kg: weightKg })
  return { id: data.id, weightKg: Number(data.weight_kg), loggedAt: data.logged_at }
}

export async function deleteBodyWeightLog(id) {
  await supabase.from('body_weight_logs').delete().eq('id', id)
}


// ── Check-Ins ────────────────────────────────────────────────

export async function getCheckIns() {
  const { data } = await supabase
    .from('check_ins')
    .select('date')
    .eq('user_id', _uid)
    .order('date', { ascending: true })
  return (data ?? []).map(r => r.date)
}

export async function saveCheckIn() {
  const today = new Date().toISOString().slice(0, 10)
  await supabase
    .from('check_ins')
    .upsert({ user_id: _uid, date: today }, { onConflict: 'user_id,date' })
}

export async function hasCheckedInToday() {
  const today = new Date().toISOString().slice(0, 10)
  const { count } = await supabase
    .from('check_ins')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', _uid)
    .eq('date', today)
  return (count ?? 0) > 0
}


// ── PR Tracking ──────────────────────────────────────────────

// prTypes: { [exerciseId]: 'weight' | 'reps' } — controls which column is used per exercise
export async function getPRMap(exerciseIds, prTypes = {}) {
  if (!exerciseIds.length) return {}
  const { data } = await supabase
    .from('personal_records')
    .select('exercise_id, max_weight, max_reps')
    .eq('user_id', _uid)
    .in('exercise_id', exerciseIds)

  const map = Object.fromEntries(exerciseIds.map(id => [id, 0]))
  for (const row of data ?? []) {
    const isRepsBased = prTypes[row.exercise_id] === 'reps'
    map[row.exercise_id] = isRepsBased
      ? Number(row.max_reps ?? 0)
      : Number(row.max_weight ?? 0)
  }
  return map
}


// ── Active Session ────────────────────────────────────────────
// Stored in Supabase as a session row with status='active'.
// We also keep a small localStorage fallback so the UI stays
// snappy during a live workout (no network latency on every set).

const ACTIVE_KEY = 'wt:activeSession'

export function getActiveSession() {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveActiveSession(data) {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(data))
  // Persist to DB in background (non-blocking)
  if (_uid && data) {
    supabase.from('sessions').upsert({
      id:          data.sessionId,
      user_id:     _uid,
      template_id: data.template?.isQuickStart ? null : (data.template?.id ?? null),
      started_at:  data.startedAt,
      status:      'active',
      pr_map:      data.prMap ?? {},
    }).then()
  }
}

export function clearActiveSession() {
  localStorage.removeItem(ACTIVE_KEY)
  // The session row in DB will be updated to 'finished' by saveSession()
}

export async function abandonSession(sessionId) {
  if (!sessionId || !_uid) return
  await supabase.from('sessions').delete().eq('id', sessionId).eq('user_id', _uid)
}


// ── Feedback ──────────────────────────────────────────────────

export async function saveFeedback(type, message, userEmail) {
  await supabase.from('feedback').insert({
    id:         nanoid(),
    user_id:    _uid,
    user_email: userEmail ?? null,
    type,
    message,
    metadata: { userAgent: navigator.userAgent },
  })
}

export async function getFeedback() {
  const { data } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function markFeedbackReviewed(id) {
  await supabase.from('feedback').update({ status: 'reviewed' }).eq('id', id)
}

export async function archiveFeedback(id) {
  await supabase.from('feedback').update({ status: 'archived' }).eq('id', id)
}

// ── Admin: Activity feed ──────────────────────────────────────
// Requires admin-level RLS policies on `sessions` and `profiles`:
//   CREATE POLICY "admin_read_all_sessions" ON sessions FOR SELECT
//     USING (auth.uid() = '<ADMIN_UID>');
//   CREATE POLICY "admin_read_all_profiles" ON profiles FOR SELECT
//     USING (auth.uid() = '<ADMIN_UID>');

export async function getAdminActivity() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: sessions }, { data: profiles }, { data: feedbackEmails }, { data: authUsers }] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, user_id, started_at, finished_at, status')
      .gte('started_at', sevenDaysAgo)
      .order('started_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, display_name'),
    supabase
      .from('feedback')
      .select('user_id, user_email')
      .not('user_email', 'is', null),
    supabase.rpc('get_user_emails'),
  ])

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  // Auth email map from admin RPC (most authoritative source)
  const authEmailMap = Object.fromEntries((authUsers ?? []).map(u => [u.id, u.email]))

  // Build email fallback map: most recent email per user_id from feedback
  const emailMap = {}
  for (const f of (feedbackEmails ?? [])) {
    if (f.user_id && f.user_email && !emailMap[f.user_id]) {
      emailMap[f.user_id] = f.user_email
    }
  }

  // Group sessions by user, track today's activity
  const todayStr = new Date().toISOString().split('T')[0]
  const userMap = {}

  for (const s of (sessions ?? [])) {
    if (!userMap[s.user_id]) {
      const displayName = profileMap[s.user_id]?.display_name
        || authEmailMap[s.user_id]
        || emailMap[s.user_id]
        || s.user_id.slice(0, 8)
      const { data: avatarData } = supabase.storage
        .from('Avatars')
        .getPublicUrl(`${s.user_id}/avatar.jpg`)
      userMap[s.user_id] = {
        userId:          s.user_id,
        displayName,
        avatarUrl:       avatarData?.publicUrl ?? null,
        lastActive:      s.started_at,
        hasActiveNow:    false,
        activeSessionId: null,
        workedOutToday:  false,
        todaySessions:   0,
        recentSessions:  [],
      }
    }
    const u = userMap[s.user_id]
    const isRecentlyActive = s.status === 'active' &&
      (Date.now() - new Date(s.started_at).getTime()) < 3 * 60 * 60 * 1000
    if (isRecentlyActive) { u.hasActiveNow = true; u.activeSessionId = s.id }
    const sessionDay = s.started_at?.split('T')[0]
    if (sessionDay === todayStr) {
      u.workedOutToday = true
      u.todaySessions++
    }
    if (u.recentSessions.length < 5) u.recentSessions.push(s)
  }

  return Object.values(userMap).sort((a, b) =>
    new Date(b.lastActive) - new Date(a.lastActive)
  )
}

export async function getAdminUserStats(userId) {
  const { data, error } = await supabase.rpc('admin_get_user_stats', { target_user_id: userId })
  if (error) throw error
  return data?.[0] ?? { total_sessions: 0, total_duration_seconds: 0, current_session_id: null, current_session_started_at: null }
}

export async function adminTerminateSession(sessionId) {
  const { error } = await supabase.rpc('admin_terminate_session', { target_session_id: sessionId })
  if (error) throw error
}

export async function getNewFeedbackCount() {
  const { count } = await supabase
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new')
  return count ?? 0
}


// ── Clear all user data ───────────────────────────────────────

export async function clearAll() {
  localStorage.removeItem(ACTIVE_KEY)
  // Delete from all tables — cascade handles children
  await Promise.all([
    supabase.from('workout_templates').delete().eq('user_id', _uid),
    supabase.from('sessions').delete().eq('user_id', _uid),
    supabase.from('check_ins').delete().eq('user_id', _uid),
    supabase.from('custom_exercises').delete().eq('user_id', _uid),
    supabase.from('settings').delete().eq('user_id', _uid),
  ])
}

export function clearUserCache() {
  localStorage.removeItem(ACTIVE_KEY)
  if (_uid) {
    localStorage.removeItem(TEMPLATES_CACHE_KEY(_uid))
    localStorage.removeItem(SETTINGS_CACHE_KEY(_uid))
    localStorage.removeItem(SESSIONS_CACHE_KEY(_uid))
    localStorage.removeItem(`wt:template-order:${_uid}`)
  }
  _uid = null
  _customExercisesCache = []
}
