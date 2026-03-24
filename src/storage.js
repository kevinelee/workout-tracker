// localStorage persistence layer
// All keys are namespaced under 'wt:' to avoid collisions

const KEYS = {
  exercises:  'wt:exercises',   // custom exercises (built-ins come from exerciseLibrary.js)
  templates:  'wt:templates',
  sessions:   'wt:sessions',
  settings:   'wt:settings',
}

function get(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function set(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

// --- Custom Exercises ---
export function getCustomExercises() {
  return get(KEYS.exercises) ?? []
}
export function saveCustomExercise(exercise) {
  const all = getCustomExercises()
  set(KEYS.exercises, [...all, exercise])
}

// --- Templates ---
export function getTemplates() {
  return get(KEYS.templates) ?? []
}
export function saveTemplate(template) {
  const all = getTemplates()
  const idx = all.findIndex(t => t.id === template.id)
  if (idx >= 0) all[idx] = template
  else all.push(template)
  set(KEYS.templates, all)
}
export function deleteTemplate(id) {
  set(KEYS.templates, getTemplates().filter(t => t.id !== id))
}

// --- Sessions ---
export function getSessions() {
  return get(KEYS.sessions) ?? []
}
export function saveSession(session) {
  const all = getSessions()
  const idx = all.findIndex(s => s.id === session.id)
  if (idx >= 0) all[idx] = session
  else all.push(session)
  set(KEYS.sessions, all)
}
export function getLastSessionForTemplate(templateId) {
  const all = getSessions()
  return all
    .filter(s => s.templateId === templateId && s.finishedAt)
    .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))[0] ?? null
}

// --- Settings ---
export function getSettings() {
  return get(KEYS.settings) ?? {
    unit: 'lbs',
    darkMode: true,
    controllerSide: 'right',
    restTimerDuration: 90,
    checkInEnabled: true,
  }
}
export function saveSettings(settings) {
  set(KEYS.settings, settings)
}

// --- Dev util ---
export function clearAll() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}
