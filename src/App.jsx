import './App.css'

const NAV_ITEMS = [
  { label: 'Home',     icon: '🏠' },
  { label: 'Workouts', icon: '📋' },
  { label: 'History',  icon: '📈' },
  { label: 'Settings', icon: '⚙️' },
]

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <span className="app-logo">💪</span>
        <h1 className="app-title">Workout Tracker</h1>
      </header>

      <main className="app-main">
        <p className="app-placeholder">Let's get to work.</p>
      </main>

      <nav className="app-nav">
        {NAV_ITEMS.map(({ label, icon }) => (
          <button key={label} className="nav-item">
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
