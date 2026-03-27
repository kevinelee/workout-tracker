import { useState, useRef, useEffect } from 'react'
import {
  getTemplates, getSessions, getSettings, saveSettings, getCheckIns, saveCheckIn,
  getLastSessionForTemplate, getPRMap,
  getActiveSession, saveActiveSession, clearActiveSession, saveTemplate, deleteTemplate,
  deleteSession, setStorageUser, clearUserCache, getCustomExercises, hasCheckedInToday,
  getProfile, saveProfile, getBodyWeightLogs, saveBodyWeightLog, deleteBodyWeightLog,
} from './storage'
import { supabase, signOut } from './lib/supabase'
import { createSession } from './data/models'
import { starterTemplates } from './data/starterTemplates'
import { calcStreak } from './utils/streaks'
import HomeScreen from './screens/HomeScreen'
import WorkoutBuilderScreen from './screens/WorkoutBuilderScreen'
import SessionScreen from './screens/SessionScreen'
import HistoryScreen from './screens/HistoryScreen'
import SessionDetailScreen from './screens/SessionDetailScreen'
import SettingsScreen from './screens/SettingsScreen'
import PostWorkoutSummary from './components/PostWorkoutSummary'
import AuthScreen from './screens/AuthScreen'
import './App.css'

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
  function goBuilder(template)       { setScreen({ name: 'builder', template }) }
  function goSession()               { setScreen({ name: 'session' }) }
  function goSummary(session, template, prevSession) { setScreen({ name: 'summary', session, template, prevSession }) }
  function goSessionDetail(session)  { setScreen({ name: 'sessionDetail', session }) }
  function goTab(id)                 { setActiveTab(id); setScreen({ name: id }) }

  return { screen, activeTab, setActiveTab, goHome, goBuilder, goSession, goSummary, goSessionDetail, goTab }
}

export default function App() {
  const [authUser, setAuthUser]   = useState(null)
  const [authReady, setAuthReady] = useState(false)
  // Track the user ID we've already bootstrapped so TOKEN_REFRESHED and
  // duplicate INITIAL_SESSION events don't re-run all Supabase queries.
  const bootstrappedUidRef = useRef(null)

  // Bootstrap auth — onAuthStateChange fires with INITIAL_SESSION on mount,
  // which handles both normal loads and magic link / invite token exchanges
  // in one place, avoiding the race condition where getSession() resolves
  // before the token is exchanged and flashes the login screen.
  useEffect(() => {
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
    bootstrappedUidRef.current = user.id
    setStorageUser(user.id)
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('bootstrap timeout')), 10000)
      )
      const load = Promise.all([
        getTemplates(),
        getSessions(),
        getSettings(),
        getCheckIns(),
        hasCheckedInToday(),
        getCustomExercises(),
        getProfile(),
        getBodyWeightLogs(),
      ])
      const [tmpl, sess, stg, ci, chk, , prof, bwl] = await Promise.race([load, timeout])
      setTemplates(tmpl)
      setSessions(sess)
      setSettings(stg)
      setCheckIns(ci)
      setCheckedIn(chk)
      setProfile(prof)
      setBodyWeightLogs(bwl)
      setAuthUser(user)
    } catch (err) {
      console.error('bootstrapUser failed:', err)
      // Still mark the user as authenticated so the app shows something.
      // Data will be empty but the user can retry from a working state.
      setAuthUser(user)
    } finally {
      setAuthReady(true)
    }
  }

  async function handleSignOut() {
    bootstrappedUidRef.current = null
    await signOut()
    clearUserCache()
    setTemplates([])
    setSessions([])
    setSettings({ unit: 'lbs', theme: 'dark', controllerSide: 'right', restTimerDuration: 90, checkInEnabled: true })
    setCheckIns([])
    setCheckedIn(false)
    setAuthUser(null)
  }

  const { screen, activeTab, setActiveTab, goHome, goBuilder, goSession, goSummary, goSessionDetail, goTab } = useNav()
  const [templates, setTemplates]             = useState([])
  const [sessions, setSessions]               = useState([])
  const [settings, setSettings]               = useState({ unit: 'lbs', theme: 'dark', controllerSide: 'right', restTimerDuration: 90, checkInEnabled: true })
  const [checkIns, setCheckIns]               = useState([])
  const [checkedIn, setCheckedIn]             = useState(false)
  const [profile, setProfile]                 = useState(null)
  const [bodyWeightLogs, setBodyWeightLogs]   = useState([])
  const streak = calcStreak(sessions, checkIns)

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme ?? 'dark')
  }, [settings.theme])

  // Active session — persisted to localStorage so it survives navigation & sleep
  const [activeSession, setActiveSession] = useState(() => getActiveSession())

  // Start sheet (▶ nav tab) + conflict-guard state
  const [startSheetOpen,    setStartSheetOpen]    = useState(false)
  const [startSheetClosing, setStartSheetClosing] = useState(false)
  const [pendingStart, setPendingStart]           = useState(null) // template waiting for override confirm
  const [startingTemplateId, setStartingTemplateId] = useState(null)
  const [startingQuickStart, setStartingQuickStart] = useState(null) // label of quick start being loaded


  // Drag-to-dismiss state
  const dragStartY  = useRef(null)
  const dragOffsetY = useRef(0)
  const sheetRef    = useRef(null)
  const isDragging  = useRef(false)

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
    setStartingQuickStart(null)
    const session = createSession({ templateId: template.id, logs: [] })
    const exerciseIds = template.exercises.map(e => e.exerciseId)
    const prMap = await getPRMap(exerciseIds)
    const logs = initLogsFromTemplate(template)
    const data = { template, sessionId: session.id, startedAt: session.startedAt, logs, prMap }
    saveActiveSession(data)
    setActiveSession(data)
    setStartingTemplateId(null)
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
    doStartSession(template)
  }

  function handleStartSession(template) {
    attemptStart(template)
  }

  async function handleQuickStartStarter(starter) {
    if (startingQuickStart) return
    setStartingQuickStart(starter.label)
    try {
      const template = { ...starter.build(), isQuickStart: true }
      await saveTemplate(template)
      await refreshData()
      attemptStart(template)
    } catch (err) {
      console.error('Failed to start quick start:', err)
      setStartingQuickStart(null)
    }
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

  function handleSessionUpdate(logs, prMap) {
    if (!activeSession) return
    const updated = { ...activeSession, logs, prMap }
    saveActiveSession(updated)
    setActiveSession(updated)
  }

  async function handleSessionFinish(session, template) {
    clearActiveSession()
    setActiveSession(null)
    // If the template was a quick start that the user chose not to save, clean it up
    if (template.isQuickStart) {
      await deleteTemplate(template.id)
    }
    const all = await getSessions()
    setSessions(all)
    await refreshData()
    const prev = all
      .filter(s => s.templateId === template.id && s.finishedAt && s.id !== session.id)
      .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))[0] ?? null
    goSummary(session, template, prev)
  }

  function handleSessionMinimize() {
    goHome()
    setActiveTab('home')
  }

  function handleSessionAbandon() {
    clearActiveSession()
    setActiveSession(null)
    goHome()
    setActiveTab('home')
  }

  async function handleSaveSettings(updated) {
    await saveSettings(updated)
    setSettings(updated)
  }

  function templateName(id) {
    return templates.find(t => t.id === id)?.name ?? 'Workout'
  }

  // Show nothing while checking auth state, then gate on auth
  if (!authReady) return (
    <div className="app-loading">
      <div className="app-loading-spinner" />
      <img src="/avg-logo.png" alt="avg" className="app-loading-logo" />
    </div>
  )
  if (!authUser) return <AuthScreen onAuth={user => bootstrapUser(user)} />

  const fullscreen = ['builder', 'session', 'summary', 'sessionDetail'].includes(screen.name)

  // Build nav tabs — inject Session tab when a workout is active
  const completedSets = activeSession?.logs?.reduce((sum, l) => sum + l.sets.filter(s => s.completed).length, 0) ?? 0
  const totalSets     = activeSession?.logs?.reduce((sum, l) => sum + l.sets.length, 0) ?? 0

  const navTabs = [
    { id: 'home',    label: 'Home',    icon: '🏠' },
    {
      id: 'session',
      label: activeSession ? (activeSession.template?.name ?? 'Session') : 'Start',
      icon: activeSession ? '🏃' : '▶',
      badge: activeSession ? `${completedSets}/${totalSets}` : null,
      live: !!activeSession,
    },
    { id: 'history',  label: 'History',  icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ]

  function renderScreen() {
    switch (screen.name) {
      case 'home':
        return (
          <HomeScreen
            templates={templates.filter(t => !t.isQuickStart)}
            sessions={sessions}
            checkIns={checkIns}
            checkedIn={checkedIn}
            streak={streak}
            settings={settings}
            activeSession={activeSession}
            onNew={() => goBuilder(null)}
            onEdit={t => goBuilder(t)}
            onStart={handleStartSession}
            startingTemplateId={startingTemplateId}
            onQuickStart={handleQuickStartStarter}
            startingQuickStart={startingQuickStart}
            onCheckIn={handleCheckIn}
            onResumeSession={() => { goSession(); setActiveTab('session') }}
          />
        )
      case 'builder':
        return (
          <WorkoutBuilderScreen
            template={screen.template}
            onSave={handleSaveTemplate}
            onBack={goHome}
            onDelete={handleDeleteTemplate}
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
          />
        )
      case 'history':
        return (
          <HistoryScreen
            sessions={sessions}
            templates={templates}
            checkIns={checkIns}
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
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="app">
      {!fullscreen && (
        <header className="app-header">
          {settings.checkInEnabled && checkedIn
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
        <div className={`sheet-backdrop ${startSheetClosing ? 'sheet-backdrop--closing' : ''}`} onClick={closeStartSheet}>
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
                      : <span className="sheet-quickstart-emoji">{starter.emoji}</span>
                    }
                    <span className="sheet-quickstart-name">{starter.label}</span>
                    <span className="sheet-quickstart-desc">{starter.description}</span>
                  </button>
                )
              })}
            </div>
            <button className="sheet-custom-btn" onClick={() => { closeStartSheet(); setTimeout(() => goBuilder(null), 220) }}>
              Build Custom Workout
            </button>
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
          {navTabs.map(({ id, label, icon, badge, live }) => (
            <button
              key={id}
              className={`nav-item ${activeTab === id ? 'active' : ''} ${id === 'session' && live ? 'nav-item--session' : ''} ${id === 'session' && !live ? 'nav-item--session-idle' : ''}`}
              onClick={() => {
                if (id === 'session') {
                  if (activeSession) { goSession(); setActiveTab('session') }
                  else { setStartSheetOpen(true) }
                } else {
                  goTab(id)
                }
              }}
            >
              <span className="nav-icon">{icon}</span>
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
