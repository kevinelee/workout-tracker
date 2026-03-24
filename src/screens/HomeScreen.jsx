import { useState } from 'react'
import { saveCheckIn, hasCheckedInToday } from '../storage'
import { calcStreak } from '../utils/streaks'
import { streakMilestone } from '../utils/streaks'
import './HomeScreen.css'

export default function HomeScreen({ templates, sessions, checkIns, settings, onNew, onEdit, onStart }) {
  const [checkedIn, setCheckedIn] = useState(hasCheckedInToday)
  const streak = calcStreak(sessions, checkIns)
  const milestone = streakMilestone(streak)

  function handleCheckIn() {
    saveCheckIn()
    setCheckedIn(true)
  }

  return (
    <div className="home">
      <div className="home-header">
        <h2 className="home-title">My Workouts</h2>
        <button className="home-new-btn" onClick={onNew}>+ New</button>
      </div>

      {/* Streak + check-in */}
      {settings.checkInEnabled && (
        <div className="home-streak-row">
          <div className="home-streak-info">
            <span className="home-streak-fire">🔥</span>
            <span className="home-streak-count">{streak} day streak</span>
            {milestone && <span className="home-streak-milestone">🏅 {milestone} days!</span>}
          </div>
          <button
            className={`home-checkin-btn ${checkedIn ? 'home-checkin-btn--done' : ''}`}
            onClick={handleCheckIn}
            disabled={checkedIn}
          >
            {checkedIn ? '✓ Checked in' : 'Check in'}
          </button>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="home-empty">
          <p className="home-empty-icon">🏋️</p>
          <p className="home-empty-text">No workouts yet.</p>
          <p className="home-empty-sub">Tap <strong>+ New</strong> to build your first one.</p>
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
    </div>
  )
}
