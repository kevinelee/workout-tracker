import { useState, useEffect } from 'react'
import { streakMilestone } from '../utils/streaks'
import { starterTemplates } from '../data/starterTemplates'
import './HomeScreen.css'

function fmtElapsed(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function HomeScreen({ templates, sessions, checkIns, checkedIn, streak, settings, activeSession, onNew, onEdit, onStart, onQuickStart, onCheckIn, onResumeSession }) {
  const milestone = streakMilestone(streak)
  const [sessionElapsed, setSessionElapsed] = useState(0)

  useEffect(() => {
    if (!activeSession) return
    const tick = () => setSessionElapsed(Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeSession?.startedAt])

  const completedSets = activeSession?.logs?.reduce((sum, l) => sum + l.sets.filter(s => s.completed).length, 0) ?? 0
  const totalSets     = activeSession?.logs?.reduce((sum, l) => sum + l.sets.length, 0) ?? 0

  return (
    <div className={`home ${settings.controllerSide === 'left' ? 'home--left' : ''}`}>
      <div className="home-header">
        <h2 className="home-title">My Workouts</h2>
        <button className="home-new-btn" onClick={onNew}>+ New</button>
      </div>

      {/* Active session resume banner */}
      {activeSession && (
        <button className="home-session-banner" onClick={onResumeSession}>
          <div className="home-session-banner-left">
            <span className="home-session-banner-dot" />
            <div>
              <p className="home-session-banner-name">{activeSession.template?.name}</p>
              <p className="home-session-banner-meta">{completedSets}/{totalSets} sets · {fmtElapsed(sessionElapsed)}</p>
            </div>
          </div>
          <span className="home-session-banner-cta">Resume →</span>
        </button>
      )}

      {/* Streak + check-in — hidden once checked in for the day */}
      {settings.checkInEnabled && !checkedIn && (
        <div className="home-streak-row">
          <div className="home-streak-info">
            <span className="home-streak-fire">🔥</span>
            <span className="home-streak-count">{streak} day streak</span>
            {milestone && <span className="home-streak-milestone">🏅 {milestone} days!</span>}
          </div>
          <button className="home-checkin-btn" onClick={onCheckIn}>
            Check in
          </button>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="home-empty">
          <p className="home-empty-icon">🏋️</p>
          <p className="home-empty-text">No workouts yet.</p>
          <p className="home-empty-sub">Pick a Quick Start below or tap <strong>+ New</strong> to build your own.</p>
        </div>
      ) : (
        <ul className="home-list">
          {templates.map(t => (
            <li key={t.id}>
              <div className="home-card">
                <div className="home-card-info">
                  <p className="home-card-name">{t.name}</p>
                  <p className="home-card-meta">
                    {t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="home-card-actions">
                  <button className="home-edit-btn" onClick={() => onEdit(t)} aria-label="Edit workout">✏️</button>
                  <button className="home-start-btn" onClick={() => onStart(t)}>Start</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Quick start — always visible */}
      <div className="home-quickstart">
        <p className="home-quickstart-label">Quick Start</p>
        <div className="home-quickstart-grid">
          {starterTemplates.map(starter => (
            <button
              key={starter.label}
              className="home-quickstart-card"
              onClick={() => onQuickStart(starter)}
            >
              <span className="home-quickstart-emoji">{starter.emoji}</span>
              <span className="home-quickstart-name">{starter.label}</span>
              <span className="home-quickstart-desc">{starter.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
