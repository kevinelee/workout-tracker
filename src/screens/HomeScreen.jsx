import { useState, useEffect } from 'react'
import { streakMilestone } from '../utils/streaks'
import { starterTemplates } from '../data/starterTemplates'
import './HomeScreen.css'

function fmtLastDone(isoDate) {
  if (!isoDate) return null
  const now = new Date()
  const then = new Date(isoDate)
  const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Last done: today'
  if (diffDays === 1) return 'Last done: yesterday'
  if (diffDays < 7) return `Last done: ${diffDays} days ago`
  if (diffDays < 14) return 'Last done: 1 week ago'
  if (diffDays < 30) return `Last done: ${Math.floor(diffDays / 7)} weeks ago`
  return `Last done: ${then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

function fmtElapsed(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function HomeScreen({
  templates, sessions, checkIns, checkedIn, dataLoaded, streak, settings,
  activeSession, startingTemplateId, startingQuickStart,
  onNew, onEdit, onStart, onQuickStart, onCheckIn, onResumeSession,
  onNewGenerate, weeklyInsight, onDismissInsight, onRefreshInsight,
}) {
  const milestone = streakMilestone(streak)
  const [showNewSheet, setShowNewSheet] = useState(false)

  const lastSessionByTemplate = sessions.reduce((map, s) => {
    if (!s.templateId || !s.finishedAt) return map
    const prev = map[s.templateId]
    if (!prev || new Date(s.finishedAt) > new Date(prev)) map[s.templateId] = s.finishedAt
    return map
  }, {})
  const [sessionElapsed, setSessionElapsed] = useState(0)

  useEffect(() => {
    if (!activeSession) return
    const tick = () => setSessionElapsed(Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeSession?.startedAt])

  // Close sheet on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setShowNewSheet(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const completedSets = activeSession?.logs?.reduce((sum, l) => sum + l.sets.filter(s => s.completed).length, 0) ?? 0
  const totalSets     = activeSession?.logs?.reduce((sum, l) => sum + l.sets.length, 0) ?? 0

  function handleNewManual() {
    setShowNewSheet(false)
    onNew()
  }

  function handleNewGenerate() {
    setShowNewSheet(false)
    onNewGenerate()
  }

  return (
    <div className={`home ${settings.controllerSide === 'left' ? 'home--left' : ''}`}>
      <div className="home-header">
        <h2 className="home-title">My Workouts</h2>
        <button className="home-new-btn" onClick={() => setShowNewSheet(true)}>+</button>
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

      {/* Weekly insight card */}
      {weeklyInsight && (
        <div className="home-insight-card">
          {weeklyInsight.loading ? (
            <div className="home-insight-loading">
              <div className="home-insight-spinner" />
              <span>Analyzing your week…</span>
            </div>
          ) : (
            <>
              <div className="home-insight-body">
                <p className="home-insight-label">Weekly recap</p>
                <p className="home-insight-text">{weeklyInsight.insight}</p>
              </div>
              <div className="home-insight-actions">
                <button className="home-insight-refresh" onClick={onRefreshInsight} aria-label="Refresh">↻</button>
                <button className="home-insight-dismiss" onClick={onDismissInsight} aria-label="Dismiss">✕</button>
              </div>
            </>
          )}
        </div>
      )}

      {templates === null ? (
        <ul className="home-list">
          {[0, 1, 2].map(i => (
            <li key={i}>
              <div className="home-card home-card--skeleton">
                <div className="home-skeleton-info">
                  <div className="home-skeleton-line home-skeleton-line--title" />
                  <div className="home-skeleton-line home-skeleton-line--meta" />
                </div>
                <div className="home-skeleton-btn" />
              </div>
            </li>
          ))}
        </ul>
      ) : templates.length === 0 ? (
        <div className="home-empty">
          <p className="home-empty-icon">🏋️</p>
          <p className="home-empty-text">No workouts yet.</p>
          <p className="home-empty-sub">Pick a Quick Start below or tap <strong>+ New</strong> to build your own.</p>
        </div>
      ) : (
        <ul className="home-list home-list--loaded">
          {templates.map(t => (
            <li key={t.id}>
              <div className="home-card">
                <div className="home-card-info">
                  <p className="home-card-name">{t.name}</p>
                  <p className="home-card-meta">
                    {t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}
                    {fmtLastDone(lastSessionByTemplate[t.id]) && (
                      <span className="home-card-last-done"> · {fmtLastDone(lastSessionByTemplate[t.id])}</span>
                    )}
                  </p>
                </div>
                <div className="home-card-actions">
                  <button className="home-edit-btn" onClick={() => onEdit(t)} aria-label="Edit workout">✏️</button>
                  <button
                    className={`home-start-btn ${startingTemplateId === t.id ? 'home-start-btn--loading' : ''}`}
                    onClick={() => onStart(t)}
                    disabled={!!startingTemplateId || !!startingQuickStart}
                  >
                    {startingTemplateId === t.id
                      ? <span className="home-start-spinner" />
                      : 'Start'}
                  </button>
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
          {starterTemplates.map(starter => {
            const isLoading = startingQuickStart === starter.label
            return (
              <button
                key={starter.label}
                className={`home-quickstart-card${isLoading ? ' home-quickstart-card--loading' : ''}${startingQuickStart && !isLoading ? ' home-quickstart-card--dimmed' : ''}`}
                onClick={() => onQuickStart(starter)}
                disabled={!!startingQuickStart}
              >
                {isLoading
                  ? <span className="qs-spinner" />
                  : <span className="home-quickstart-emoji">{starter.emoji}</span>
                }
                <span className="home-quickstart-name">{starter.label}</span>
                <span className="home-quickstart-desc">{starter.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* New workout choice sheet */}
      {showNewSheet && (
        <div className="home-sheet-overlay" onClick={() => setShowNewSheet(false)}>
          <div className="home-sheet" onClick={e => e.stopPropagation()}>
            <p className="home-sheet-title">New Workout</p>

            <button className="home-sheet-option" onClick={handleNewManual}>
              <div className="home-sheet-option-icon">
                <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="11" y1="5" x2="11" y2="17" />
                  <line x1="5" y1="11" x2="17" y2="11" />
                </svg>
              </div>
              <div className="home-sheet-option-text">
                <span className="home-sheet-option-label">Build it myself</span>
                <span className="home-sheet-option-sub">Pick exercises and set your defaults</span>
              </div>
            </button>

            <button
              className="home-sheet-option"
              onClick={handleNewGenerate}
            >
              <div className="home-sheet-option-icon home-sheet-option-icon--accent">
                <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" />
                </svg>
              </div>
              <div className="home-sheet-option-text">
                <span className="home-sheet-option-label">Generate a plan</span>
                <span className="home-sheet-option-sub">Answer 2 quick questions, get a full split</span>
              </div>
            </button>

            <button className="home-sheet-cancel" onClick={() => setShowNewSheet(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
