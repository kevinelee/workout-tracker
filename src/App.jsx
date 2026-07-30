import { useState, useRef, useEffect, Component } from 'react'
import {
  getTemplates, saveTemplate, getCachedTemplates, getSessions, getCachedSessions, getSettings, getCachedSettings, saveSettings,
  getLastSessionForTemplate, getPRMap,
  getActiveSession, saveActiveSession, clearActiveSession, abandonSession,
  deleteSession, setStorageUser, clearUserCache, getCustomExercises, getCachedCustomExercises,
  getProfile, saveProfile, getBodyWeightLogs, saveBodyWeightLog, deleteBodyWeightLog,
  getNewFeedbackCount, encodeTheme,
  getPrograms, createProgram, renameProgram, deleteProgram, setActiveProgram, reassignProgramTemplates, ensureDefaultProgram,
} from './storage'
import { supabase, signOut, callFunction } from './lib/supabase'
import { createSession } from './data/models'
import { starterTemplates } from './data/starterTemplates'
import { defaultExercises } from './data/exerciseLibrary'
import HomeScreen from './screens/HomeScreen'
import WorkoutBuilderScreen from './screens/WorkoutBuilderScreen'
import NewWorkoutWizard from './screens/NewWorkoutWizard'
import SessionScreen from './screens/SessionScreen'
import HistoryScreen from './screens/HistoryScreen'
import SessionDetailScreen from './screens/SessionDetailScreen'
import SettingsScreen from './screens/SettingsScreen'
import PostWorkoutSummary from './components/PostWorkoutSummary'
import AuthScreen from './screens/AuthScreen'
import LandingScreen from './screens/LandingScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import ProfileScreen from './screens/ProfileScreen'
import AdminScreen from './screens/AdminScreen'
import GeneratePlanWizard from './screens/GeneratePlanWizard'
import GenerateWorkoutWizard from './screens/GenerateWorkoutWizard'
import WhatsNewModal, { hasSeenLatest, LATEST_VERSION } from './components/WhatsNewModal'
import { ProGateProvider } from './lib/proGate'
import './App.css'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const QS_ICONS = {
  // Push Day — upward arrow + floor bar (press motion)
  push: (
    <svg viewBox="0 0 24 24" {...S}>
      <line x1="12" y1="20" x2="12" y2="7" />
      <polyline points="6 13 12 7 18 13" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </svg>
  ),
  // Pull Day — ceiling bar + downward arrow (pull motion)
  pull: (
    <svg viewBox="0 0 24 24" {...S}>
      <line x1="4" y1="4" x2="20" y2="4" />
      <line x1="12" y1="5" x2="12" y2="18" />
      <polyline points="6 12 12 18 18 12" />
    </svg>
  ),
  // Leg Day — squat stance (two legs, wide base)
  legs: (
    <svg viewBox="0 0 24 24" {...S}>
      <line x1="8" y1="3" x2="16" y2="3" />
      <path d="M8 3v8l-4 5v5" />
      <path d="M16 3v8l4 5v5" />
    </svg>
  ),
  // Full Body — barbell with plates
  barbell: (
    <svg viewBox="0 0 24 24" {...S}>
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="3" y1="9" x2="3" y2="15" />
      <line x1="21" y1="9" x2="21" y2="15" />
      <line x1="5" y1="10" x2="5" y2="14" />
      <line x1="19" y1="10" x2="19" y2="14" />
    </svg>
  ),
  // Upper Body — torso outline (arch top, open bottom)
  upper: (
    <svg viewBox="0 0 24 24" {...S}>
      <path d="M5 9C5 6 8 4 12 4s7 2 7 5" />
      <line x1="5" y1="9" x2="5" y2="20" />
      <line x1="19" y1="9" x2="19" y2="20" />
      <line x1="5" y1="20" x2="19" y2="20" />
    </svg>
  ),
  // Core & Cardio — lightning bolt
  bolt: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M13 2L4 13.5h7L9 22l11-12.5H13L13 2z" />
    </svg>
  ),
}

// Initialize logs from a template's default sets
function initLogsFromTemplate(template) {
  return template.exercises.map(te => ({
    exerciseId: te.exerciseId,
    targetCount: te.sets.length,
    sets: te.sets.map(s => ({ reps: s.reps, weight: s.weight, completed: false, isPR: false })),
    notes: te.notes ?? '',
  }))
}

// Initialize logs from the last session (copy last session)
function initLogsFromSession(template, lastSession) {
  return template.exercises.map(te => {
    const lastLog = lastSession.logs?.find(l => l.exerciseId === te.exerciseId)
    if (!lastLog) {
      return { exerciseId: te.exerciseId, targetCount: te.sets.length, sets: te.sets.map(s => ({ ...s, completed: false, isPR: false })), notes: '' }
    }
    return {
      exerciseId: te.exerciseId,
      targetCount: te.sets.length,
      sets: lastLog.sets.map(s => ({ reps: s.reps, weight: s.weight, completed: false, isPR: false })),
      notes: lastLog.notes ?? '',
    }
  })
}

export { initLogsFromTemplate, initLogsFromSession }

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <polyline points="7 4 13 10 7 16" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <polyline points="13 4 7 10 13 16" />
    </svg>
  )
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Render error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: 16, padding: 24, textAlign: 'center', background: 'var(--bg)' }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>Something went wrong</p>
          <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, opacity: 0.7 }}>{this.state.error?.message}</p>
          <button
            style={{ marginTop: 8, padding: '12px 24px', background: 'var(--accent)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer' }}
            onClick={() => window.location.reload()}
          >
            Reload app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function useNav() {
  const [screen, setScreen] = useState({ name: 'home' })
  const [activeTab, setActiveTab] = useState('home')

  function goHome()                  { setScreen({ name: 'home' }); setActiveTab('home') }
  function goWizard()                { setScreen({ name: 'wizard' }) }
  function goBuilder(template)       { setScreen({ name: 'builder', template }) }
  function goSession()               { setScreen({ name: 'session' }) }
  function goSummary(session, template, prevSession) { setScreen({ name: 'summary', session, template, prevSession }) }
  function goSessionDetail(session)  { setScreen({ name: 'sessionDetail', session }) }
  function goTab(id)                 { setActiveTab(id); setScreen({ name: id }) }
  function goSettings()              { setScreen({ name: 'settings' }) }

  return { screen, activeTab, setActiveTab, goHome, goWizard, goBuilder, goSession, goSummary, goSessionDetail, goTab, goSettings }
}

export default function App() {
  const [authUser, setAuthUser]   = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [authMode, setAuthMode]   = useState('signin') // passed to AuthScreen after landing
  // Track the user ID we've already bootstrapped so TOKEN_REFRESHED and
  // duplicate INITIAL_SESSION events don't re-run all Supabase queries.
  const bootstrappedUidRef = useRef(null)

  // Bootstrap auth — fast path via getSession() reads localStorage without
  // waiting for a network token refresh, so the app starts immediately.
  // onAuthStateChange handles sign-out, magic links, and token refreshes.
  useEffect(() => {
    // Fast path: kick off bootstrap from the locally cached session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        bootstrapUser(session.user)
        // Proactively refresh the token in the background. The auto-refresh
        // timer doesn't run while the browser tab is suspended (phone sleep,
        // background), so the access token may be expired by the time the
        // user tries to write. refreshSession() gets a fresh token without
        // blocking startup; TOKEN_REFRESHED will fire and the supabase client
        // will use the new token for all subsequent requests.
        supabase.auth.refreshSession().then(() => setSessionReady(true)).catch(() => setSessionReady(true))
      } else {
        setAuthReady(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Already bootstrapped for this user (e.g. TOKEN_REFRESHED on resume) — skip.
        if (bootstrappedUidRef.current === session.user.id) return
        await bootstrapUser(session.user)
      } else {
        bootstrappedUidRef.current = null
        setAuthUser(null)
        setAuthReady(true)
      }
    })

    // Re-check auth whenever the tab becomes visible again (catches the case where
    // the phone/browser went to sleep after the token expired but before the
    // auto-refresh timer fired).
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && bootstrappedUidRef.current) {
        supabase.auth.refreshSession().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  async function bootstrapUser(user) {
    // Guard against double-invocation (React StrictMode fires the auth effect twice in dev).
    if (bootstrappedUidRef.current === user.id) return
    bootstrappedUidRef.current = user.id
    setStorageUser(user.id)

    // Seed from localStorage cache so the UI is populated before any network round-trip.
    const cachedTemplates = getCachedTemplates(user.id)
    if (cachedTemplates) setTemplates(cachedTemplates)
    const cachedSessions = getCachedSessions(user.id)
    if (cachedSessions) setSessions(cachedSessions)
    const cachedSettings = getCachedSettings(user.id)
    if (cachedSettings) setSettings(cachedSettings)

    // Show the app shell immediately — don't block on data queries.
    // Screens render with empty defaults while data loads in the background.
    setAuthUser(user)
    setAuthReady(true)

    // Fire each query independently — each setState re-renders as data arrives,
    // so a slow query (e.g. avatar storage) never blocks the rest of the UI.
    getTemplates().then(setTemplates).catch(console.error)
    getSessions().then(setSessions).catch(console.error)
    getSettings().then(setSettings).catch(console.error)
    getCustomExercises().catch(console.error)
    getPrograms().then(async progs => {
      if (progs.length === 0) {
        const created = await ensureDefaultProgram()
        if (created) {
          progs = [created]
          getTemplates().then(setTemplates).catch(console.error)
        }
      }
      setPrograms(progs)
    }).catch(console.error)
    // Only show onboarding for brand-new users (no profile row at all).
    // Existing users whose profiles predate the onboardingComplete field
    // would otherwise be wrongly sent back through the questionnaire.
    getProfile().then(p => {
      setProfile(p)
      setShowOnboarding(p === null)
      if (p?.role === 'admin') getNewFeedbackCount().then(setFeedbackCount).catch(console.error)
    }).catch(console.error)
    getBodyWeightLogs().then(setBodyWeightLogs).catch(console.error)

    setDataLoaded(true)
  }

  async function handleSignOut() {
    bootstrappedUidRef.current = null
    await signOut()
    clearUserCache()
    setTemplates(null)
    setPrograms(null)
    setSessions([])
    setSettings({ unit: 'lbs', colorScheme: 'default', themeMode: 'dark', controllerSide: 'right', restTimerDuration: 90 })
    setDataLoaded(false)
    setFeedbackCount(0)
    setProfile(null)
    setBodyWeightLogs(null)
    setAuthUser(null)
  }

  async function handleOnboardingComplete({ answers, summary, templates = [] }) {
    const daysMap = answers.frequency?.includes('6') ? 6 : answers.frequency?.includes('4') ? 4 : 3
    const updated = {
      ...(profile ?? {}),
      onboardingComplete:    true,
      fitnessProfileSummary: summary,
      targetDaysPerWeek:     daysMap,
    }
    await saveProfile(updated)
    setProfile(updated)
    for (const t of templates) {
      await saveTemplate(t)
    }
    if (templates.length > 0) {
      getTemplates().then(setTemplates).catch(console.error)
    }
    setShowOnboarding(false)
    // Assign any newly created templates to the active program
    getPrograms().then(setPrograms).catch(console.error)
  }

  const exerciseLibraryForAPI = defaultExercises.map(e => ({
    id: e.id, name: e.name, category: e.category, muscleGroup: e.muscleGroup,
  }))

  const [showGeneratePlan,   setShowGeneratePlan]   = useState(false)
  const [showGenerateSingle, setShowGenerateSingle] = useState(false)

  function handleGenerateWorkout() {
    setShowGeneratePlan(true)
  }

  function handleGenerateSingleWorkout() {
    setShowGenerateSingle(true)
  }

  async function handleGeneratePlan({ days, focus }) {
    const { data, error } = await callFunction('generate-workout-plan', {
      mode: 'split',
      answers: {
        days,
        focus,
        goal: profile?.fitnessProfileSummary ?? '',
        experience: '',
        equipment: [],
        frequency: `${days} days per week`,
      },
      exerciseLibrary: exerciseLibraryForAPI,
      unit: settings.unit,
    })
    if (error || !data?.templates?.length) throw new Error('No templates returned')
    return data.templates
  }

  async function handleGenerateSingle({ focus }) {
    const { data, error } = await callFunction('generate-workout-plan', {
      mode: 'single',
      answers: {
        days: 1,
        focus,
        goal: profile?.fitnessProfileSummary ?? '',
        experience: '',
        equipment: [],
        frequency: '1 day per week',
      },
      exerciseLibrary: exerciseLibraryForAPI,
      unit: settings.unit,
    })
    if (error || !data?.templates?.length) throw new Error('No template returned')
    return data.templates[0]
  }

  function handleGenerateSingleComplete(template) {
    setShowGenerateSingle(false)
    goBuilder(template)
  }

  async function handleGeneratePlanComplete(templates) {
    const activeProgramId = programs?.find(p => p.isActive)?.id ?? programs?.[0]?.id ?? null
    for (const t of templates) {
      await saveTemplate({ ...t, programId: activeProgramId })
    }
    setShowGeneratePlan(false)
    const updated = await getTemplates()
    setTemplates(updated)
    goHome()
  }

  // ── Overload suggestions ─────────────────────────────────────────────────

  function getWeekKey() {
    const now   = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const week  = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
    return `${now.getFullYear()}-W${week}`
  }

  function overloadBreakdown(sheet) {
    if (!sheet || sheet.loading) return null
    if (!sheet.headline && !sheet.suggestions?.length) return null
    return { headline: sheet.headline, suggestions: sheet.suggestions }
  }

  async function showOverloadSheet(template) {
    const allExercises = [...defaultExercises, ...getCachedCustomExercises()]

    // Build recent session history for this template (last 3 completed)
    const recent = sessions
      .filter(s => s.templateId === template.id && s.finishedAt)
      .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))
      .slice(0, 3)

    const exercises = template.exercises.map(ex => {
      const def = allExercises.find(e => e.id === ex.exerciseId)
      const first = ex.sets?.[0] ?? {}
      return {
        exerciseId:   ex.exerciseId,
        name:         def?.name ?? ex.exerciseId,
        targetSets:   ex.sets?.length ?? 3,
        targetReps:   first.reps ?? 8,
        targetWeight: first.weight ?? 0,
      }
    })

    const recentSessions = recent.map(s => ({
      date: s.finishedAt?.slice(0, 10),
      logs: (s.logs ?? []).map(l => ({
        exerciseId: l.exerciseId,
        sets: l.sets ?? [],
      })),
    }))

    setOverloadSheet({ template, loading: true, headline: null, suggestions: [] })

    // Hard timeout — never block the workout more than 4s
    overloadTimeoutRef.current = setTimeout(() => {
      setOverloadSheet(null)
      doStartSession(template)
    }, 4000)

    try {
      const { data, error } = await callFunction('generate-overload-suggestions', {
        template: { name: template.name }, exercises, recentSessions, unit: settings.unit,
      })
      clearTimeout(overloadTimeoutRef.current)
      if (error || !data) throw new Error('empty')
      setOverloadSheet({ template, loading: false, headline: data.headline, suggestions: data.suggestions ?? [] })
    } catch {
      clearTimeout(overloadTimeoutRef.current)
      setOverloadSheet(null)
      doStartSession(template)
    }
  }

  // ── Weekly insight ───────────────────────────────────────────────────────

  async function generateWeeklyInsight(currentSessions) {
    const weekAgo   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const finished  = currentSessions
      .filter(s => s.finishedAt)
      .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))
    const thisWeek  = finished.filter(s => new Date(s.finishedAt) >= weekAgo)

    const allExercises = [...defaultExercises, ...getCachedCustomExercises()]
    const toSessionData = s => ({
      date:         s.finishedAt?.slice(0, 10),
      templateName: s.template?.name ?? templates?.find(t => t.id === s.templateId)?.name ?? 'Workout',
      durationMins: s.duration ? Math.round(s.duration / 60) : null,
      exercises:    (s.logs ?? [])
        .map(l => allExercises.find(e => e.id === l.exerciseId)?.name)
        .filter(Boolean),
    })

    // No session this week but there's history — surface an absence-aware nudge
    // instead of just staying silent. Brand-new users with no history at all get nothing.
    let body
    if (thisWeek.length) {
      body = { sessions: thisWeek.map(toSessionData), goal: profile?.goal ?? '', unit: settings.unit, mode: 'weekly' }
    } else if (finished.length) {
      const daysSince = Math.round((Date.now() - new Date(finished[0].finishedAt).getTime()) / 86400000)
      body = { sessions: finished.slice(0, 5).map(toSessionData), goal: profile?.goal ?? '', unit: settings.unit, mode: 'returning', daysSince }
    } else {
      return
    }

    setWeeklyInsight({ insight: null, loading: true, mode: body.mode })
    try {
      const { data, error } = await callFunction('generate-weekly-insight', body)
      if (error || !data?.insight) throw new Error('empty')
      const result = { insight: data.insight, week: getWeekKey(), mode: body.mode }
      localStorage.setItem('weekly-insight', JSON.stringify(result))
      setWeeklyInsight({ insight: data.insight, loading: false, mode: body.mode })
    } catch {
      setWeeklyInsight(null)
    }
  }



  const { screen, activeTab, setActiveTab, goHome, goWizard, goBuilder, goSession, goSummary, goSessionDetail, goTab, goSettings } = useNav()
  const [templates, setTemplates]             = useState(null)
  const [programs, setPrograms]               = useState(null) // null = loading
  const [sessions, setSessions]               = useState([])
  const [settings, setSettings]               = useState({ unit: 'lbs', colorScheme: 'default', themeMode: 'dark', controllerSide: 'right', restTimerDuration: 90 })
  const [dataLoaded, setDataLoaded]           = useState(false)
  const [feedbackCount, setFeedbackCount]     = useState(0)
  const [profile, setProfile]                 = useState(null)
  const [bodyWeightLogs, setBodyWeightLogs]   = useState(null) // null = loading, [] = loaded empty
  const [showOnboarding, setShowOnboarding]   = useState(null) // null = profile not yet loaded
  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', encodeTheme(settings.colorScheme ?? 'default', settings.themeMode ?? 'dark'))
  }, [settings.colorScheme, settings.themeMode])

  // Weekly insight — generate once per calendar week, after session is confirmed fresh
  useEffect(() => {
    if (!dataLoaded || !sessionReady || weeklyInsightFiredRef.current) return
    const weekKey = getWeekKey()
    const cached  = (() => { try { return JSON.parse(localStorage.getItem('weekly-insight') ?? '') } catch { return null } })()
    if (cached?.week === weekKey) {
      if (!cached.dismissed) setWeeklyInsight({ insight: cached.insight, loading: false, mode: cached.mode })
      weeklyInsightFiredRef.current = true
      return
    }
    weeklyInsightFiredRef.current = true
    generateWeeklyInsight(sessions)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded, sessionReady])


  // Active session — persisted to localStorage so it survives navigation & sleep
  const [activeSession, setActiveSession] = useState(() => getActiveSession())

  // Start sheet (▶ nav tab) + conflict-guard state
  const [startSheetOpen,    setStartSheetOpen]    = useState(false)
  const [startSheetClosing, setStartSheetClosing] = useState(false)
  const [pendingStart, setPendingStart]           = useState(null) // template waiting for override confirm
  const [startingTemplateId, setStartingTemplateId] = useState(null)
  const [startingQuickStart, setStartingQuickStart] = useState(null) // label of quick start being loaded

  // Workout review sheet — shown before starting, lets user preview exercises
  const [reviewSheet, setReviewSheet] = useState(null)
  const [reviewSheetLastSession, setReviewSheetLastSession] = useState(null)

  // Progressive overload pre-session sheet
  // null | { template, loading, headline, suggestions: [{ exerciseId, note }] }
  const [overloadSheet, setOverloadSheet] = useState(null)
  const overloadTimeoutRef = useRef(null)
  const mainRef = useRef(null)

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [screen.name])


  // Weekly insight
  // null | { insight, loading }
  const [weeklyInsight, setWeeklyInsight] = useState(null)

  // What's New modal
  const [showWhatsNew, setShowWhatsNew] = useState(false)

  // Auto-show What's New once per version after the user is logged in
  useEffect(() => {
    if (!authUser) return
    if (!hasSeenLatest()) setShowWhatsNew(true)
  }, [authUser])
  const weeklyInsightFiredRef = useRef(false)


  // Drag-to-dismiss state
  const dragStartY  = useRef(null)
  const dragOffsetY = useRef(0)
  const sheetRef    = useRef(null)
  const isDragging  = useRef(false)
  const sheetJustOpenedRef = useRef(false)

  function closeStartSheet() {
    setStartSheetClosing(true)
  }
  function onStartSheetAnimationEnd() {
    if (startSheetClosing) {
      setStartSheetOpen(false)
      setStartSheetClosing(false)
      dragOffsetY.current = 0
    }
  }

  function onDragStart(e) {
    if (startSheetClosing) return
    dragStartY.current = e.touches ? e.touches[0].clientY : e.clientY
    isDragging.current = true
  }

  function onDragMove(e) {
    if (!isDragging.current || dragStartY.current === null) return
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const delta = Math.max(0, clientY - dragStartY.current)
    dragOffsetY.current = delta
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`
      sheetRef.current.style.transition = 'none'
    }
  }

  function onDragEnd(e) {
    if (!isDragging.current) return
    isDragging.current = false
    const velocity = e.changedTouches
      ? (e.changedTouches[0].clientY - dragStartY.current)
      : dragOffsetY.current
    dragStartY.current = null

    if (sheetRef.current) {
      sheetRef.current.style.transform = ''
      sheetRef.current.style.transition = ''
    }

    // Close if dragged >120px down or flicked fast (>40px in one event)
    if (dragOffsetY.current > 120 || velocity > 200) {
      closeStartSheet()
    }
    dragOffsetY.current = 0
  }

  async function refreshData() {
    const [tmpl, sess] = await Promise.all([getTemplates(), getSessions()])
    setTemplates(tmpl)
    setSessions(sess)
  }

  async function handleSaveTemplate(template) { await refreshData(); goHome() }

  async function handleDeleteTemplate() { await refreshData(); goHome() }

  async function doStartSession(template, aiBreakdown = null) {
    setStartingTemplateId(template.id)
    const session = createSession({ templateId: template.isQuickStart ? null : template.id, logs: [] })
    const exerciseIds = template.exercises.map(e => e.exerciseId)
    const allExercises = [...defaultExercises, ...getCachedCustomExercises()]
    const prTypes = Object.fromEntries(
      exerciseIds.map(id => [id, allExercises.find(e => e.id === id)?.prType ?? 'weight'])
    )
    const { prMap, prRepsMap, repPRByWeightMap } = await getPRMap(exerciseIds, prTypes)
    const logs = initLogsFromTemplate(template)
    const data = { template, sessionId: session.id, startedAt: session.startedAt, logs, prMap, prRepsMap, repPRByWeightMap, aiBreakdown }
    saveActiveSession(data)
    setActiveSession(data)
    setStartingTemplateId(null)
    setStartingQuickStart(null)
    closeStartSheet()
    goSession()
    setActiveTab('session')
  }

  function attemptStart(template) {
    // Already in a session for this same template — just resume
    if (activeSession?.sessionId && activeSession.template?.id === template.id) {
      setStartSheetOpen(false)
      goSession()
      setActiveTab('session')
      return
    }
    // Different template while a session is live — ask first
    if (activeSession?.sessionId) {
      setPendingStart(template)
      setStartSheetOpen(false)
      return
    }
    // Show overload sheet for templates that have prior session history
    const hasHistory = !template.isQuickStart && sessions.some(s => s.templateId === template.id && s.finishedAt)
    if (hasHistory) {
      closeStartSheet()
      showOverloadSheet(template)
      return
    }
    doStartSession(template)
  }

  async function handleStartSession(template) {
    let lastSession = null
    if (!template.isQuickStart) {
      lastSession = await getLastSessionForTemplate(template.id)
    }
    setReviewSheetLastSession(lastSession)
    setReviewSheet(template)
  }

  function handleQuickStartStarter(starter) {
    if (startingQuickStart) return
    setStartingQuickStart(starter.label)
    const template = { ...starter.build(settings.unit), isQuickStart: true }
    attemptStart(template)
  }

  function handleConfirmOverride() {
    if (!pendingStart) return
    clearActiveSession()
    setActiveSession(null)
    doStartSession(pendingStart)
    setPendingStart(null)
  }

  function handleCancelOverride() {
    setPendingStart(null)
    setStartingQuickStart(null)
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      if (pendingStart)     { handleCancelOverride(); return }
      if (startSheetOpen)   { closeStartSheet(); return }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [pendingStart, startSheetOpen])

  function handleSessionUpdate(logs, prMap, prRepsMap, repPRByWeightMap) {
    if (!activeSession) return
    const updated = { ...activeSession, logs, prMap, prRepsMap, repPRByWeightMap: repPRByWeightMap ?? activeSession.repPRByWeightMap }
    saveActiveSession(updated)
    setActiveSession(updated)
  }

  async function handleSessionFinish(session, template) {
    clearActiveSession()
    // Navigate to summary immediately so the screen is never blank
    const prev = template.isQuickStart ? null : sessions
      .filter(s => s.templateId === template.id && s.finishedAt && s.id !== session.id)
      .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))[0] ?? null
    setActiveSession(null)
    goSummary(session, template, prev)
    // Refresh data in the background — don't block or swallow the summary
    getSessions().then(all => setSessions(all)).catch(() => {})
    refreshData().catch(() => {})
  }

  function handleSessionMinimize() {
    goHome()
    setActiveTab('home')
  }

  function handleSessionAbandon() {
    const sessionId = activeSession?.sessionId
    clearActiveSession()
    setActiveSession(null)
    if (sessionId) abandonSession(sessionId)
    goHome()
    setActiveTab('home')
  }

  async function handleSaveSettings(updated) {
    await saveSettings(updated)
    setSettings(updated)
  }

  async function handleSwitchProgram(id) {
    await setActiveProgram(id)
    setPrograms(prev => prev?.map(p => ({ ...p, isActive: p.id === id })) ?? prev)
  }

  async function handleCreateProgram(name) {
    const created = await createProgram(name)
    setPrograms(prev => [...(prev ?? []), created])
    return created
  }

  async function handleRenameProgram(id, name) {
    await renameProgram(id, name)
    setPrograms(prev => prev?.map(p => p.id === id ? { ...p, name } : p) ?? prev)
  }

  async function handleDeleteProgram(id) {
    if ((programs?.length ?? 0) <= 1) return
    const target = programs.find(p => p.id !== id)
    await reassignProgramTemplates(id, target.id)
    await deleteProgram(id)
    const wasActive = programs.find(p => p.id === id)?.isActive
    let updated = programs.filter(p => p.id !== id)
    if (wasActive && updated.length > 0) {
      await setActiveProgram(updated[0].id)
      updated = updated.map((p, i) => ({ ...p, isActive: i === 0 }))
    }
    setPrograms(updated)
    getTemplates().then(setTemplates).catch(console.error)
  }

  function templateName(id) {
    return templates?.find(t => t.id === id)?.name ?? 'Workout'
  }

  // Show nothing while checking auth state, then gate on auth
  if (!authReady) return (
    <div className="app-loading">
      <div className="app-loading-spinner" />
      <img src="/session.png" alt="session" className="app-loading-logo" />
    </div>
  )
  if (!authUser) {
    const seenLanding = localStorage.getItem('seen-landing')
    if (!seenLanding) {
      return (
        <LandingScreen
          onGetStarted={() => { localStorage.setItem('seen-landing', '1'); setAuthMode('signup') }}
          onSignIn={() => { localStorage.setItem('seen-landing', '1'); setAuthMode('signin') }}
        />
      )
    }
    return <AuthScreen onAuth={user => bootstrapUser(user)} initialMode={authMode} />
  }
  if (showOnboarding === null) return (
    <div className="app-loading">
      <div className="app-loading-spinner" />
      <img src="/session.png" alt="session" className="app-loading-logo" />
    </div>
  )
  if (showOnboarding) return <OnboardingScreen onComplete={handleOnboardingComplete} unit={settings.unit} />
  if (showGeneratePlan) return (
    <GeneratePlanWizard
      onBack={() => setShowGeneratePlan(false)}
      onGenerate={handleGeneratePlan}
      onComplete={handleGeneratePlanComplete}
    />
  )
  if (showGenerateSingle) return (
    <GenerateWorkoutWizard
      onBack={() => setShowGenerateSingle(false)}
      onGenerate={handleGenerateSingle}
      onComplete={handleGenerateSingleComplete}
    />
  )

  const isAdmin = profile?.role === 'admin'
  const activeProgram = programs?.find(p => p.isActive) ?? programs?.[0] ?? null

  const fullscreen = ['wizard', 'builder', 'session', 'summary', 'sessionDetail'].includes(screen.name)

  // Build nav tabs — inject Session tab when a workout is active
  const completedSets = activeSession?.logs?.reduce((sum, l) => sum + l.sets.filter(s => s.completed).length, 0) ?? 0
  const totalSets     = activeSession?.logs?.reduce((sum, l) => sum + l.sets.length, 0) ?? 0

  const NavHome = () => (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10L11 3l8 7v9a1 1 0 01-1 1H4a1 1 0 01-1-1v-9z" />
      <path d="M8.5 21v-7h5v7" />
    </svg>
  )
  const NavPlay = () => (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8.5" />
      <path d="M9 8.5l5 2.5-5 2.5V8.5z" fill="currentColor" stroke="none" />
    </svg>
  )
  const NavDumbbell = () => (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7v8M15 7v8" />
      <path d="M4.5 9v4M17.5 9v4" />
      <path d="M7 11h8" />
    </svg>
  )
  const NavChart = () => (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3"  y="13" width="4" height="6" rx="1" />
      <rect x="9"  y="8"  width="4" height="11" rx="1" />
      <rect x="15" y="4"  width="4" height="15" rx="1" />
    </svg>
  )
  const NavPerson = () => (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="7.5" r="3.5" />
      <path d="M3.5 19.5c0-4 3.4-7 7.5-7s7.5 3 7.5 7" />
    </svg>
  )
const NavShield = () => (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2l7.5 3v5c0 4.5-3.2 8-7.5 10C6.7 18 3.5 14.5 3.5 10V5L11 2z" />
    </svg>
  )

  const navTabs = [
    { id: 'home',    label: 'Home',    icon: <NavHome /> },
    {
      id: 'session',
      label: activeSession ? (activeSession.template?.name ?? 'Session') : 'Start',
      icon: activeSession ? <NavDumbbell /> : <NavPlay />,
      badge: activeSession ? `${completedSets}/${totalSets}` : null,
      live: !!activeSession,
    },
    { id: 'history',  label: 'History',  icon: <NavChart /> },
    { id: 'profile',  label: 'Profile',  icon: <NavPerson />, avatarUrl: profile?.avatarUrl || null },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: <NavShield />, badge: feedbackCount > 0 ? feedbackCount : null }] : []),
  ]

  function renderScreen() {
    switch (screen.name) {
      case 'home':
        return (
          <HomeScreen
            templates={templates === null ? null : templates.filter(t => !t.isQuickStart && (!activeProgram || t.programId === activeProgram.id))}
            programs={programs}
            activeProgram={activeProgram}
            onSwitchProgram={handleSwitchProgram}
            onCreateProgram={handleCreateProgram}
            onRenameProgram={handleRenameProgram}
            onDeleteProgram={handleDeleteProgram}
            sessions={sessions}
            dataLoaded={dataLoaded}
            settings={settings}
            activeSession={activeSession}
            onNew={() => goWizard()}
            onEdit={t => goBuilder(t)}
            onStart={handleStartSession}
            startingTemplateId={startingTemplateId}
            onQuickStart={handleQuickStartStarter}
            startingQuickStart={startingQuickStart}
            onResumeSession={() => { goSession(); setActiveTab('session') }}
            onAbandon={handleSessionAbandon}
            onNewGenerate={handleGenerateWorkout}
            onNewGenerateSingle={handleGenerateSingleWorkout}
            weeklyInsight={weeklyInsight}
            onDismissInsight={() => {
              localStorage.setItem('weekly-insight', JSON.stringify({ week: getWeekKey(), insight: weeklyInsight?.insight ?? '', dismissed: true }))
              setWeeklyInsight(null)
            }}
            onRefreshInsight={() => {
              weeklyInsightFiredRef.current = false
              localStorage.removeItem('weekly-insight')
              setWeeklyInsight(null)
              generateWeeklyInsight(sessions)
            }}
          />
        )
      case 'wizard':
        return (
          <NewWorkoutWizard
            onComplete={exercises => goBuilder({ exercises })}
            onBack={goHome}
            unit={settings.unit}
          />
        )
      case 'builder':
        return (
          <WorkoutBuilderScreen
            template={screen.template}
            onSave={handleSaveTemplate}
            onBack={goHome}
            onDelete={handleDeleteTemplate}
            unit={settings.unit}
            programId={activeProgram?.id ?? null}
          />
        )
      case 'session':
        return activeSession ? (
          <SessionScreen
            activeSession={activeSession}
            settings={settings}
            programId={activeProgram?.id ?? null}
            onUpdate={handleSessionUpdate}
            onFinish={handleSessionFinish}
            onMinimize={handleSessionMinimize}
            onAbandon={handleSessionAbandon}
          />
        ) : null
      case 'summary':
        return (
          <PostWorkoutSummary
            session={screen.session}
            template={screen.template}
            prevSession={screen.prevSession}
            onDone={() => { getSessions().then(all => setSessions(all)).catch(() => {}); goHome() }}
            profile={profile}
            settings={settings}
          />
        )
      case 'history':
        return (
          <HistoryScreen
            sessions={sessions}
            templates={templates}
            checkIns={[]}
            settings={settings}
            profile={profile}
            onViewSession={s => goSessionDetail(s)}
            onDeleteSession={async id => { await deleteSession(id); setSessions(await getSessions()) }}
          />
        )
      case 'sessionDetail':
        return (
          <SessionDetailScreen
            session={screen.session}
            templateName={templateName(screen.session.templateId)}
            onBack={() => goTab('history')}
            onDelete={async () => { setSessions(await getSessions()) }}
            onSave={async () => { setSessions(await getSessions()) }}
            profile={profile}
          />
        )
      case 'profile':
        return (
          <ProfileScreen
            profile={profile}
            sessions={sessions}
            checkIns={[]}
            settings={settings}
            authUser={authUser}
            onSaveProfile={async data => {
              await saveProfile(data)
              setProfile(p => ({ ...p, ...data }))
            }}
            bodyWeightLogs={bodyWeightLogs}
            onLogWeight={async kg => {
              const entry = await saveBodyWeightLog(kg)
              setBodyWeightLogs(prev => [...prev, entry])
            }}
            onDeleteWeightLog={async id => {
              await deleteBodyWeightLog(id)
              setBodyWeightLogs(prev => prev.filter(l => l.id !== id))
            }}
            onAvatarUpdate={url => setProfile(p => ({ ...p, avatarUrl: url }))}
            onRecalibrate={() => setShowOnboarding(true)}
            onOpenSettings={goSettings}
          />
        )
      case 'settings':
        return (
          <SettingsScreen
            settings={settings}
            onSave={handleSaveSettings}
            sessions={sessions}
            templates={templates}
            onSignOut={handleSignOut}
            authUser={authUser}
            onRecalibrate={() => setShowOnboarding(true)}
            onShowWhatsNew={() => setShowWhatsNew(true)}
            appVersion={LATEST_VERSION}
            onBack={() => goTab('profile')}
          />
        )
      case 'admin':
        return <AdminScreen onReviewed={() => setFeedbackCount(c => Math.max(0, c - 1))} />
      default:
        return null
    }
  }

  return (
    <ProGateProvider isPro={profile?.isPro ?? true}>
    <div className="app">
      {!fullscreen && (
        <header className="app-header">
          <span className="app-header-spacer" />
          <img src="/session.png" alt="session" className="app-logo-img" />
          <span className="app-header-spacer" />
        </header>
      )}

      <main className="app-main" ref={mainRef}>
        <ErrorBoundary key={screen.name}>
          <div className="screen-enter">
            {renderScreen()}
          </div>
        </ErrorBoundary>
      </main>

      {/* Start sheet — opened by idle ▶ nav tab */}
      {startSheetOpen && (
        <div className={`sheet-backdrop ${startSheetClosing ? 'sheet-backdrop--closing' : ''}`} onClick={() => { if (!sheetJustOpenedRef.current) closeStartSheet() }}>
          <div
            ref={sheetRef}
            className={`sheet ${startSheetClosing ? 'sheet--closing' : ''}`}
            onClick={e => e.stopPropagation()}
            onAnimationEnd={onStartSheetAnimationEnd}
            onTouchMove={onDragMove}
            onTouchEnd={onDragEnd}
          >
            <div
              className="sheet-handle"
              onTouchStart={onDragStart}
              onMouseDown={onDragStart}
              onMouseMove={onDragMove}
              onMouseUp={onDragEnd}
            />
            <p className="sheet-title">Start a Workout</p>
            <div className="sheet-quickstart-grid">
              {starterTemplates.map(starter => {
                const isLoading = startingQuickStart === starter.label
                return (
                  <button
                    key={starter.label}
                    className={`sheet-quickstart-card${isLoading ? ' sheet-quickstart-card--loading' : ''}${startingQuickStart && !isLoading ? ' sheet-quickstart-card--dimmed' : ''}`}
                    onClick={() => handleQuickStartStarter(starter)}
                    disabled={!!startingQuickStart}
                  >
                    {isLoading
                      ? <span className="qs-spinner" />
                      : <span className="sheet-quickstart-icon">{QS_ICONS[starter.iconKey]}</span>
                    }
                    <span className="sheet-quickstart-name">{starter.label}</span>
                    <span className="sheet-quickstart-desc">{starter.description}</span>
                  </button>
                )
              })}
            </div>
            <button className="sheet-custom-btn" onClick={() => { closeStartSheet(); setTimeout(() => goWizard(), 220) }}>
              Build Custom Workout
            </button>
          </div>
        </div>
      )}

      {/* Workout review sheet — preview before starting */}
      {reviewSheet && (
        <div className="sheet-backdrop" onClick={() => { setReviewSheet(null); setReviewSheetLastSession(null) }}>
          <div className="sheet review-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="review-header">
              <p className="review-title">{reviewSheet.name}</p>
              <p className="review-meta">
                {reviewSheet.exercises.length} exercise{reviewSheet.exercises.length !== 1 ? 's' : ''}
                {' · '}
                {reviewSheet.exercises.reduce((sum, ex) => sum + (ex.sets?.length ?? 0), 0)} sets
              </p>
            </div>
            <div className="review-exercises">
              {reviewSheet.exercises.map((ex, i) => {
                const def = [...defaultExercises, ...getCachedCustomExercises()].find(e => e.id === ex.exerciseId)
                const lastLog = reviewSheetLastSession?.logs?.find(l => l.exerciseId === ex.exerciseId)
                const sourceSets = lastLog?.sets?.length > 0 ? lastLog.sets : (ex.sets ?? [])
                const first = sourceSets[0]
                const dispW = first?.weight > 0
                  ? (settings.unit === 'kg' ? Math.round(first.weight / 2.2046) : first.weight)
                  : 0
                const setsLabel = sourceSets.length === 0
                  ? ''
                  : dispW > 0
                    ? `${sourceSets.length} × ${first.reps} reps @ ${dispW} ${settings.unit}`
                    : `${sourceSets.length} × ${first?.reps ?? 0} reps`
                return (
                  <div key={i} className="review-exercise">
                    <p className="review-ex-name">{def?.name ?? ex.exerciseId}</p>
                    {setsLabel && <p className="review-ex-sets">{setsLabel}</p>}
                  </div>
                )
              })}
            </div>
            <button
              className="review-start-btn"
              onClick={() => { setReviewSheet(null); setReviewSheetLastSession(null); attemptStart(reviewSheet) }}
              disabled={!!startingTemplateId}
            >
              {startingTemplateId
                ? <span className="overload-spinner" />
                : <>Start Workout {settings.controllerSide === 'left' ? <ChevronLeftIcon /> : <ChevronRightIcon />}</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Progressive overload pre-session sheet */}
      {overloadSheet && (
        <div className="sheet-backdrop" onClick={() => { clearTimeout(overloadTimeoutRef.current); setOverloadSheet(null); doStartSession(overloadSheet.template, overloadBreakdown(overloadSheet)) }}>
          <div className="sheet overload-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            {overloadSheet.loading ? (
              <div className="overload-loading">
                <div className="overload-spinner" />
                <p className="overload-loading-text">Getting your targets…</p>
              </div>
            ) : (
              <>
                {overloadSheet.headline && (
                  <p className="overload-headline">{overloadSheet.headline}</p>
                )}
                <div className="overload-list">
                  {overloadSheet.suggestions.map((s, i) => {
                    const ex = [...defaultExercises, ...getCachedCustomExercises()].find(e => e.id === s.exerciseId)
                    return (
                      <div key={i} className="overload-row">
                        <p className="overload-ex-name">{ex?.name ?? s.exerciseId}</p>
                        <p className="overload-ex-note">{s.note}</p>
                      </div>
                    )
                  })}
                </div>
                <button
                  className="overload-start-btn"
                  onClick={() => { setOverloadSheet(null); doStartSession(overloadSheet.template, overloadBreakdown(overloadSheet)) }}
                >
                  Start Workout →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Conflict confirm — shown when starting a new workout over an active session */}
      {pendingStart && (
        <div className="sheet-backdrop">
          <div className="sheet sheet--confirm">
            <div className="sheet-handle" />
            <p className="sheet-title">Workout in Progress</p>
            <p className="sheet-confirm-body">
              You have an active session. Abandon it and start <strong>{pendingStart.name}</strong>?
            </p>
            <div className="sheet-confirm-actions">
              <button className="sheet-confirm-cancel" onClick={handleCancelOverride}>Keep Going</button>
              <button className="sheet-confirm-ok" onClick={handleConfirmOverride}>Abandon &amp; Start</button>
            </div>
          </div>
        </div>
      )}

      {!fullscreen && (
        <nav className="app-nav">
          {navTabs.map(({ id, label, icon, badge, live, avatarUrl: tabAvatarUrl }) => (
            <button
              key={id}
              className={`nav-item ${activeTab === id ? 'active' : ''} ${id === 'session' && live ? 'nav-item--session' : ''} ${id === 'session' && !live ? 'nav-item--session-idle' : ''}`}
              onClick={() => {
                if (id === 'session') {
                  if (activeSession) { goSession(); setActiveTab('session') }
                  else {
                    sheetJustOpenedRef.current = true
                    setTimeout(() => { sheetJustOpenedRef.current = false }, 400)
                    setStartSheetOpen(true)
                  }
                } else {
                  goTab(id)
                }
              }}
            >
              <span className="nav-icon-wrap">
                {id === 'profile' && tabAvatarUrl
                  ? <img src={tabAvatarUrl} className="nav-avatar" alt="Profile"
                      onError={() => setProfile(p => p ? { ...p, avatarUrl: '' } : p)}
                    />
                  : <span className="nav-icon">{icon}</span>
                }
                {id === 'admin' && badge && (
                  <span className="nav-dot-badge">{badge}</span>
                )}
              </span>
              {id === 'session' && badge && (
                <span className="nav-badge">{badge}</span>
              )}
            </button>
          ))}
        </nav>
      )}

      {showWhatsNew && (
        <WhatsNewModal onClose={() => setShowWhatsNew(false)} />
      )}
    </div>
    </ProGateProvider>
  )
}
