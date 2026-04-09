import { useState, useRef, useEffect } from 'react'
import {
  getTemplates, saveTemplate, getCachedTemplates, getSessions, getSettings, saveSettings, getCheckIns, saveCheckIn,
  getLastSessionForTemplate, getPRMap,
  getActiveSession, saveActiveSession, clearActiveSession, abandonSession,
  deleteSession, setStorageUser, clearUserCache, getCustomExercises, getCachedCustomExercises, hasCheckedInToday,
  getProfile, saveProfile, getBodyWeightLogs, saveBodyWeightLog, deleteBodyWeightLog,
  getNewFeedbackCount, encodeTheme,
} from './storage'
import { supabase, signOut } from './lib/supabase'
import { createSession } from './data/models'
import { starterTemplates } from './data/starterTemplates'
import { defaultExercises } from './data/exerciseLibrary'
import { calcStreak } from './utils/streaks'
import HomeScreen from './screens/HomeScreen'
import WorkoutBuilderScreen from './screens/WorkoutBuilderScreen'
import NewWorkoutWizard from './screens/NewWorkoutWizard'
import SessionScreen from './screens/SessionScreen'
import HistoryScreen from './screens/HistoryScreen'
import SessionDetailScreen from './screens/SessionDetailScreen'
import SettingsScreen from './screens/SettingsScreen'
import PostWorkoutSummary from './components/PostWorkoutSummary'
import AuthScreen from './screens/AuthScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import ProfileScreen from './screens/ProfileScreen'
import AdminScreen from './screens/AdminScreen'
import GeneratePlanWizard from './screens/GeneratePlanWizard'
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

  return { screen, activeTab, setActiveTab, goHome, goWizard, goBuilder, goSession, goSummary, goSessionDetail, goTab }
}

export default function App() {
  const [authUser, setAuthUser]   = useState(null)
  const [authReady, setAuthReady] = useState(false)
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
    return () => subscription.unsubscribe()
  }, [])

  async function bootstrapUser(user) {
    // Guard against double-invocation (React StrictMode fires the auth effect twice in dev).
    if (bootstrappedUidRef.current === user.id) return
    bootstrappedUidRef.current = user.id
    setStorageUser(user.id)

    // Seed from localStorage cache so the UI is populated before any network round-trip.
    const cachedTemplates = getCachedTemplates(user.id)
    if (cachedTemplates) setTemplates(cachedTemplates)

    // Show the app shell immediately — don't block on data queries.
    // Screens render with empty defaults while data loads in the background.
    setAuthUser(user)
    setAuthReady(true)

    const isAdminUser = user.id === import.meta.env.VITE_ADMIN_UID

    // Fire each query independently — each setState re-renders as data arrives,
    // so a slow query (e.g. avatar storage) never blocks the rest of the UI.
    getTemplates().then(setTemplates).catch(console.error)
    getSessions().then(setSessions).catch(console.error)
    getSettings().then(setSettings).catch(console.error)
    getCustomExercises().catch(console.error)
    getProfile().then(p => { setProfile(p); setShowOnboarding(!p?.onboardingComplete) }).catch(console.error)
    getBodyWeightLogs().then(setBodyWeightLogs).catch(console.error)
    if (isAdminUser) getNewFeedbackCount().then(setFeedbackCount).catch(console.error)

    Promise.all([getCheckIns(), hasCheckedInToday()])
      .then(([ci, chk]) => { setCheckIns(ci); setCheckedIn(chk); setDataLoaded(true) })
      .catch(err => { console.error('bootstrapUser check-in load failed:', err); setDataLoaded(true) })
  }

  async function handleSignOut() {
    bootstrappedUidRef.current = null
    await signOut()
    clearUserCache()
    setTemplates(null)
    setSessions([])
    setSettings({ unit: 'lbs', colorScheme: 'default', themeMode: 'dark', controllerSide: 'right', restTimerDuration: 90, checkInEnabled: true })
    setCheckIns([])
    setCheckedIn(false)
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
  }

  const exerciseLibraryForAPI = defaultExercises.map(e => ({
    id: e.id, name: e.name, category: e.category, muscleGroup: e.muscleGroup,
  }))

  const [showGeneratePlan, setShowGeneratePlan] = useState(false)

  function handleGenerateWorkout() {
    setShowGeneratePlan(true)
  }

  async function handleGeneratePlan({ days, focus }) {
    const { data, error } = await supabase.functions.invoke('generate-workout-plan', {
      body: {
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
      },
    })
    if (error || !data?.templates?.length) throw new Error('No templates returned')
    return data.templates
  }

  async function handleGeneratePlanComplete(templates) {
    for (const t of templates) {
      await saveTemplate(t)
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
      const { data, error } = await supabase.functions.invoke('generate-overload-suggestions', {
        body: { template: { name: template.name }, exercises, recentSessions, unit: settings.unit },
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
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const thisWeek = currentSessions.filter(s => s.finishedAt && new Date(s.finishedAt) >= weekAgo)
    if (!thisWeek.length) return

    const allExercises = [...defaultExercises, ...getCachedCustomExercises()]
    const sessionData  = thisWeek.map(s => ({
      date:         s.finishedAt?.slice(0, 10),
      templateName: s.template?.name ?? templates?.find(t => t.id === s.templateId)?.name ?? 'Workout',
      durationMins: s.duration ? Math.round(s.duration / 60) : null,
      exercises:    (s.logs ?? [])
        .map(l => allExercises.find(e => e.id === l.exerciseId)?.name)
        .filter(Boolean),
    }))

    setWeeklyInsight({ insight: null, loading: true })
    try {
      const { data, error } = await supabase.functions.invoke('generate-weekly-insight', {
        body: { sessions: sessionData, goal: profile?.goal ?? '', unit: settings.unit },
      })
      if (error || !data?.insight) throw new Error('empty')
      const result = { insight: data.insight, week: getWeekKey() }
      localStorage.setItem('weekly-insight', JSON.stringify(result))
      setWeeklyInsight({ insight: data.insight, loading: false })
    } catch {
      setWeeklyInsight(null)
    }
  }


  const { screen, activeTab, setActiveTab, goHome, goWizard, goBuilder, goSession, goSummary, goSessionDetail, goTab } = useNav()
  const [templates, setTemplates]             = useState(null)
  const [sessions, setSessions]               = useState([])
  const [settings, setSettings]               = useState({ unit: 'lbs', colorScheme: 'default', themeMode: 'dark', controllerSide: 'right', restTimerDuration: 90, checkInEnabled: true })
  const [checkIns, setCheckIns]               = useState([])
  const [checkedIn, setCheckedIn]             = useState(false)
  const [dataLoaded, setDataLoaded]           = useState(false)
  const [feedbackCount, setFeedbackCount]     = useState(0)
  const [profile, setProfile]                 = useState(null)
  const [bodyWeightLogs, setBodyWeightLogs]   = useState(null) // null = loading, [] = loaded empty
  const [showOnboarding, setShowOnboarding]   = useState(null) // null = profile not yet loaded
  const streak = calcStreak(sessions, checkIns)

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', encodeTheme(settings.colorScheme ?? 'default', settings.themeMode ?? 'dark'))
  }, [settings.colorScheme, settings.themeMode])

  // Weekly insight — generate once per calendar week when sessions load
  useEffect(() => {
    if (!dataLoaded || weeklyInsightFiredRef.current) return
    const weekKey = getWeekKey()
    const cached  = (() => { try { return JSON.parse(localStorage.getItem('weekly-insight') ?? '') } catch { return null } })()
    if (cached?.week === weekKey) {
      if (!cached.dismissed) setWeeklyInsight({ insight: cached.insight, loading: false })
      weeklyInsightFiredRef.current = true
      return
    }
    weeklyInsightFiredRef.current = true
    generateWeeklyInsight(sessions)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded])

  // Active session — persisted to localStorage so it survives navigation & sleep
  const [activeSession, setActiveSession] = useState(() => getActiveSession())

  // Start sheet (▶ nav tab) + conflict-guard state
  const [startSheetOpen,    setStartSheetOpen]    = useState(false)
  const [startSheetClosing, setStartSheetClosing] = useState(false)
  const [pendingStart, setPendingStart]           = useState(null) // template waiting for override confirm
  const [startingTemplateId, setStartingTemplateId] = useState(null)
  const [startingQuickStart, setStartingQuickStart] = useState(null) // label of quick start being loaded

  // Progressive overload pre-session sheet
  // null | { template, loading, headline, suggestions: [{ exerciseId, note }] }
  const [overloadSheet, setOverloadSheet] = useState(null)
  const overloadTimeoutRef = useRef(null)

  // Weekly insight
  // null | { insight, loading }
  const [weeklyInsight, setWeeklyInsight] = useState(null)
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

  async function handleCheckIn() {
    await saveCheckIn()
    const today = new Date().toISOString().slice(0, 10)
    setCheckIns(prev => prev.includes(today) ? prev : [...prev, today])
    setCheckedIn(true)
  }

  async function handleSaveTemplate(template) { await refreshData(); goHome() }

  async function handleDeleteTemplate() { await refreshData(); goHome() }

  async function doStartSession(template) {
    setStartingTemplateId(template.id)
    const session = createSession({ templateId: template.isQuickStart ? null : template.id, logs: [] })
    const exerciseIds = template.exercises.map(e => e.exerciseId)
    const allExercises = [...defaultExercises, ...getCachedCustomExercises()]
    const prTypes = Object.fromEntries(
      exerciseIds.map(id => [id, allExercises.find(e => e.id === id)?.prType ?? 'weight'])
    )
    const prMap = await getPRMap(exerciseIds, prTypes)
    const logs = initLogsFromTemplate(template)
    const data = { template, sessionId: session.id, startedAt: session.startedAt, logs, prMap }
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

  function handleStartSession(template) {
    attemptStart(template)
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

  function handleSessionUpdate(logs, prMap) {
    if (!activeSession) return
    const updated = { ...activeSession, logs, prMap }
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

  function templateName(id) {
    return templates?.find(t => t.id === id)?.name ?? 'Workout'
  }

  // Show nothing while checking auth state, then gate on auth
  if (!authReady) return (
    <div className="app-loading">
      <div className="app-loading-spinner" />
      <img src="/avg-logo.png" alt="avg" className="app-loading-logo" />
    </div>
  )
  if (!authUser) return <AuthScreen onAuth={user => bootstrapUser(user)} />
  if (showOnboarding === null) return (
    <div className="app-loading">
      <div className="app-loading-spinner" />
      <img src="/avg-logo.png" alt="avg" className="app-loading-logo" />
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

  const isAdmin = authUser?.id === import.meta.env.VITE_ADMIN_UID

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
  const NavSliders = () => (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <line x1="3" y1="6"  x2="19" y2="6"  />
      <line x1="3" y1="11" x2="19" y2="11" />
      <line x1="3" y1="16" x2="19" y2="16" />
      <circle cx="7"  cy="6"  r="2" fill="var(--bg)" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="14" cy="11" r="2" fill="var(--bg)" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="9"  cy="16" r="2" fill="var(--bg)" stroke="currentColor" strokeWidth="1.7" />
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
    { id: 'settings', label: 'Settings', icon: <NavSliders /> },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: <NavShield />, badge: feedbackCount > 0 ? feedbackCount : null }] : []),
  ]

  function renderScreen() {
    switch (screen.name) {
      case 'home':
        return (
          <HomeScreen
            templates={templates === null ? null : templates.filter(t => !t.isQuickStart)}
            sessions={sessions}
            checkIns={checkIns}
            checkedIn={checkedIn}
            dataLoaded={dataLoaded}
            streak={streak}
            settings={settings}
            activeSession={activeSession}
            onNew={() => goWizard()}
            onEdit={t => goBuilder(t)}
            onStart={handleStartSession}
            startingTemplateId={startingTemplateId}
            onQuickStart={handleQuickStartStarter}
            startingQuickStart={startingQuickStart}
            onCheckIn={handleCheckIn}
            onResumeSession={() => { goSession(); setActiveTab('session') }}
            onNewGenerate={handleGenerateWorkout}
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
          />
        )
      case 'session':
        return activeSession ? (
          <SessionScreen
            activeSession={activeSession}
            settings={settings}
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
            onDone={goHome}
            profile={profile}
            settings={settings}
          />
        )
      case 'history':
        return (
          <HistoryScreen
            sessions={sessions}
            templates={templates}
            checkIns={checkIns}
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
            profile={profile}
          />
        )
      case 'profile':
        return (
          <ProfileScreen
            profile={profile}
            sessions={sessions}
            checkIns={checkIns}
            settings={settings}
            authUser={authUser}
            onSaveProfile={async data => {
              await saveProfile(data)
              setProfile(data)
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
          />
        )
      case 'admin':
        return <AdminScreen onReviewed={() => setFeedbackCount(c => Math.max(0, c - 1))} />
      default:
        return null
    }
  }

  return (
    <div className="app">
      {!fullscreen && (
        <header className="app-header">
          {settings.checkInEnabled && checkedIn && dataLoaded && streak > 0
            ? <span className="app-streak-badge" key={streak}>🔥 {streak}</span>
            : <span className="app-header-spacer" />
          }
          <img src="/avg-logo.png" alt="avg" className="app-logo-img" />
          <span className="app-header-spacer" />
        </header>
      )}

      <main className="app-main">
        <div key={screen.name} className="screen-enter">
          {renderScreen()}
        </div>
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

      {/* Progressive overload pre-session sheet */}
      {overloadSheet && (
        <div className="sheet-backdrop" onClick={() => { clearTimeout(overloadTimeoutRef.current); setOverloadSheet(null); doStartSession(overloadSheet.template) }}>
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
                  onClick={() => { setOverloadSheet(null); doStartSession(overloadSheet.template) }}
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
    </div>
  )
}
