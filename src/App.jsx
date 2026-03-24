import { useState } from 'react'
import { getTemplates } from './storage'
import HomeScreen from './screens/HomeScreen'
import WorkoutBuilderScreen from './screens/WorkoutBuilderScreen'
import SessionScreen from './screens/SessionScreen'
import './App.css'

const NAV_TABS = [
  { id: 'home',     label: 'Home',     icon: '🏠' },
  { id: 'workouts', label: 'Workouts', icon: '📋' },
  { id: 'history',  label: 'History',  icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

function useNav() {
  const [screen, setScreen] = useState({ name: 'home' })
  const [activeTab, setActiveTab] = useState('home')

  function goHome() { setScreen({ name: 'home' }); setActiveTab('home') }
  function goBuilder(template = null) { setScreen({ name: 'builder', template }) }
  function goSession(template) { setScreen({ name: 'session', template }) }
  function goTab(id) { setActiveTab(id); setScreen({ name: id }) }

  return { screen, activeTab, goHome, goBuilder, goSession, goTab }
}

export default function App() {
  const { screen, activeTab, goHome, goBuilder, goSession, goTab } = useNav()
  const [templates, setTemplates] = useState(getTemplates)

  function refreshTemplates() { setTemplates(getTemplates()) }

  function handleSaveTemplate() { refreshTemplates(); goHome() }

  function handleFinishSession(session) {
    // M4 will show a summary here; for now just return home
    goHome()
  }

  const fullscreen = screen.name === 'builder' || screen.name === 'session'

  function renderScreen() {
    switch (screen.name) {
      case 'home':
      case 'workouts':
        return (
          <HomeScreen
            templates={templates}
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
            onFinish={handleFinishSession}
            onBack={goHome}
          />
        )
      case 'history':
        return <Placeholder label="History" icon="📈" />
      case 'settings':
        return <Placeholder label="Settings" icon="⚙️" />
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

function Placeholder({ label, icon }) {
  return (
    <div className="placeholder-screen">
      <span className="placeholder-icon">{icon}</span>
      <p>{label} coming soon.</p>
    </div>
  )
}
