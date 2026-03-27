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
    displayName:   p.display_name ?? '',
    avatarUrl:     p.avatar_url ?? '',
    heightCm:      p.height_cm   != null ? Number(p.height_cm)  : null,
    weightKg:      p.weight_kg   != null ? Number(p.weight_kg)  : null,
    age:           p.age         != null ? Number(p.age)        : null,
    gender:        p.gender      ?? null,
    activityLevel: p.activity_level ?? null,
  }
}

function defaultProfile() {
  return {
    displayName:   '',
    avatarUrl:     '',
    heightCm:      null,
    weightKg:      null,
    age:           null,
    gender:        null,
    activityLevel: null,
  }
}

function dbSettingsToApp(s) {
  if (!s) return defaultSettings()
  return {
    unit:               s.unit,
    theme:              s.theme,
    controllerSide:     s.controller_side,
    restTimerDuration:  s.rest_timer_duration,
    checkInEnabled:     s.check_in_enabled,
  }
}

function defaultSettings() {
  return {
    unit:               'lbs',
    theme:              'dark',
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
  return (data ?? []).map(dbTemplateToApp)
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
  await supabase.from('workout_templates').delete().eq('id', id)
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
    .eq('status', 'finished')
    .order('finished_at', { ascending: false })
  return (data ?? []).map(dbSessionToApp)
}

export async function saveSession(session) {
  // 1. Upsert session row
  await supabase.from('sessions').upsert({
    id:               session.id,
    user_id:          _uid,
    template_id:      session.templateId ?? null,
    started_at:       session.startedAt,
    finished_at:      session.finishedAt ?? null,
    duration_seconds: session.duration ?? null,
    status:           session.finishedAt ? 'finished' : 'active',
    pr_map:           session.prMap ?? {},
  })

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
  await supabase.from('sessions').delete().eq('id', id)
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
  return dbSettingsToApp(data)
}

export async function saveSettings(settings) {
  await supabase.from('settings').upsert({
    user_id:             _uid,
    unit:                settings.unit,
    theme:               settings.theme,
    controller_side:     settings.controllerSide,
    rest_timer_duration: settings.restTimerDuration,
    check_in_enabled:    settings.checkInEnabled,
  })
}


// ── Profile ───────────────────────────────────────────────────

export async function uploadAvatar(file) {
  const ext  = file.name.split('.').pop() || 'jpg'
  const path = `${_uid}/avatar.${ext}`

  const { error } = await supabase.storage
    .from('Avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw error

  const { data } = supabase.storage.from('Avatars').getPublicUrl(path)
  // Cache-bust so the browser doesn't serve the old image after re-upload
  const url = `${data.publicUrl}?t=${Date.now()}`

  await supabase.from('profiles').upsert({ id: _uid, avatar_url: url })
  return url
}


export async function getProfile() {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', _uid)
    .single()
  return dbProfileToApp(data)
}

export async function saveProfile(profile) {
  await supabase.from('profiles').upsert({
    id:             _uid,
    display_name:   profile.displayName   ?? null,
    height_cm:      profile.heightCm      ?? null,
    weight_kg:      profile.weightKg      ?? null,
    age:            profile.age           ?? null,
    gender:         profile.gender        ?? null,
    activity_level: profile.activityLevel ?? null,
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

export async function getPRMap(exerciseIds) {
  if (!exerciseIds.length) return {}
  const { data } = await supabase
    .from('personal_records')   // the view we created
    .select('exercise_id, max_weight')
    .eq('user_id', _uid)
    .in('exercise_id', exerciseIds)

  const map = Object.fromEntries(exerciseIds.map(id => [id, 0]))
  for (const row of data ?? []) {
    map[row.exercise_id] = Number(row.max_weight)
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
      template_id: data.template?.id ?? null,
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
  _uid = null
  _customExercisesCache = []
}
