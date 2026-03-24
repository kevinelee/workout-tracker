import { useState } from 'react'
import { getTemplates, getSessions, getSettings, saveSettings, getCheckIns, getLastSessionForTemplate } from './storage'
import HomeScreen from './screens/HomeScreen'
import WorkoutBuilderScreen from './screens/WorkoutBuilderScreen'
import SessionScreen from './screens/SessionScreen'
import HistoryScreen from './screens/HistoryScreen'
import SessionDetailScreen from './screens/SessionDetailScreen'
import SettingsScreen from './screens/SettingsScreen'
import PostWorkoutSummary from './components/PostWorkoutSummary'
import './App.css'

const NAV_TABS = [
  { id: 'home',     label: 'Home',     icon: '🏠' },
  { id: 'history',  label: 'History',  icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

function useNav() {
  const [screen, setScreen] = useState({ name: 'home' })
  const [activeTab, setActiveTab] = useState('home')

  function goHome()                  { setScreen({ name: 'home' }); setActiveTab('home') }
  function goBuilder(template)       { setScreen({ name: 'builder', template }) }
  function goSession(template)       { setScreen({ name: 'session', template }) }
  function goSummary(session, template, prevSession) { setScreen({ name: 'summary', session, template, prevSession }) }
  function goSessionDetail(session)  { setScreen({ name: 'sessionDetail', session }) }
  function goTab(id)                 { setActiveTab(id); setScreen({ name: id }) }

  return { screen, activeTab, goHome, goBuilder, goSession, goSummary, goSessionDetail, goTab }
}

export default function App() {
  const { screen, activeTab, goHome, goBuilder, goSession, goSummary, goSessionDetail, goTab } = useNav()
  const [templates, setTemplates] = useState(getTemplates)
  const [sessions, setSessions]   = useState(getSessions)
  const [settings, setSettings]   = useState(getSettings)
  const checkIns = getCheckIns()

  function refreshData() {
    setTemplates(getTemplates())
    setSessions(getSessions())
  }

  function handleSaveTemplate() { refreshData(); goHome() }

  function handleFinishSession(session, template) {
    setSessions(getSessions())
    const prevSession = getLastSessionForTemplate(template.id)
    // prevSession at this point is the one just before what we finished
    // getSessions() now includes the new one, so find the one before it
    const all = getSessions().filter(s => s.templateId === template.id && s.finishedAt && s.id !== session.id)
    const prev = all.sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))[0] ?? null
    goSummary(session, template, prev)
  }

  function handleSaveSettings(updated) {
    saveSettings(updated)
    setSettings(updated)
  }

  function templateName(id) {
    return templates.find(t => t.id === id)?.name ?? 'Workout'
  }

  const fullscreen = ['builder', 'session', 'summary', 'sessionDetail'].includes(screen.name)

  function renderScreen() {
    switch (screen.name) {
      case 'home':
        return (
          <HomeScreen
            templates={templates}
            sessions={sessions}
            checkIns={checkIns}
            settings={settings}
            onNew={() => goBuilder(null)}
            onEdit={t => goBuilder(t)}
            onStart={t => goSession(t)}
          />
        )
      case 'builder':
        return (
          <WorkoutBuilderScreen
            template={screen.template}
            onSave={handleSaveTemplate}
            onBack={goHome}
          />
        )
      case 'session':
        return (
          <SessionScreen
            template={screen.template}
            onFinish={(session) => handleFinishSession(session, screen.template)}
            onBack={goHome}
          />
        )
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
            onViewSession={s => goSessionDetail(s)}
          />
        )
      case 'sessionDetail':
        return (
          <SessionDetailScreen
            session={screen.session}
            templateName={templateName(screen.session.templateId)}
            onBack={() => goTab('history')}
          />
        )
      case 'settings':
        return (
          <SettingsScreen
            settings={settings}
            onSave={handleSaveSettings}
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
          <span className="app-logo">💪</span>
          <h1 className="app-title">Workout Tracker</h1>
        </header>
      )}

      <main className="app-main">
        {renderScreen()}
      </main>

      {!fullscreen && (
        <nav className="app-nav">
          {NAV_TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              className={`nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => goTab(id)}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
