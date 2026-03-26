import { useState, useRef } from 'react'
import { sessionVolume, sessionPRCount, fmtVolume, fmtDuration } from '../utils/volume'
import { calcStreak } from '../utils/streaks'
import { getCachedCustomExercises } from '../storage'
import { defaultExercises } from '../data/exerciseLibrary'
import VolumeChart from '../components/VolumeChart'
import CalendarHeatmap from '../components/CalendarHeatmap'
import './HistoryScreen.css'

const PAGE_SIZE = 10

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtDateLong(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

function exerciseName(id) {
  return defaultExercises.find(e => e.id === id)?.name
    ?? getCachedCustomExercises().find(e => e.id === id)?.name
    ?? id
}

export default function HistoryScreen({ sessions, templates, checkIns, onViewSession, onDeleteSession }) {
  const streak = calcStreak(sessions, checkIns)
  const finished = sessions.filter(s => s.finishedAt).sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))

  const [filterId,     setFilterId]     = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [dayModal,     setDayModal]     = useState(null) // { date, sessions }
  const [swipedId,     setSwipedId]     = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // session to confirm delete
  const touchStartRef = useRef(null)

  function templateName(id) {
    return templates.find(t => t.id === id)?.name ?? 'Workout'
  }

  // Templates that actually have finished sessions
  const usedTemplateIds = [...new Set(finished.map(s => s.templateId))]

  function handleFilter(id) {
    setFilterId(id)
    setVisibleCount(PAGE_SIZE)
  }

  function handleTouchStart(e, id) {
    touchStartRef.current = { x: e.touches[0].clientX, id }
  }

  function handleTouchEnd(e, id) {
    if (!touchStartRef.current || touchStartRef.current.id !== id) return
    const delta = touchStartRef.current.x - e.changedTouches[0].clientX
    if (delta > 60) setSwipedId(id)
    else if (delta < -20) setSwipedId(null)
    touchStartRef.current = null
  }

  async function handleDeleteConfirmed() {
    if (!deleteConfirm) return
    await onDeleteSession(deleteConfirm.id)
    setDeleteConfirm(null)
  }

  const filtered = filterId ? finished.filter(s => s.templateId === filterId) : finished
  const visible  = filtered.slice(0, visibleCount)
  const hasMore  = visibleCount < filtered.length

  return (
    <div className="history">
      {/* Streak banner */}
      <div className="history-streak-banner">
        <span className="history-streak-fire">🔥</span>
        <div>
          <p className="history-streak-count">{streak} day streak</p>
          <p className="history-streak-sub">{streak === 0 ? 'Start a session to begin your streak' : 'Keep it going!'}</p>
        </div>
      </div>

      {/* Heatmap */}
      <section className="history-section">
        <h3 className="history-section-title">Activity</h3>
        <CalendarHeatmap sessions={finished} checkIns={checkIns} onDayClick={(date, s) => setDayModal({ date, sessions: s })} />
      </section>

      {/* Day modal */}
      {dayModal && (
        <div className="history-day-backdrop" onClick={() => setDayModal(null)}>
          <div className="history-day-modal" onClick={e => e.stopPropagation()}>
            <div className="history-day-handle" />
            <div className="history-day-header">
              <p className="history-day-title">{fmtDateLong(dayModal.date)}</p>
              <button className="history-day-close" onClick={() => setDayModal(null)} aria-label="Close">✕</button>
            </div>
            {dayModal.sessions.map(s => (
              <button key={s.id} className="history-day-card" onClick={() => { setDayModal(null); onViewSession(s) }}>
                <div>
                  <p className="history-day-card-name">{templateName(s.templateId)}</p>
                  <p className="history-day-card-exercises">
                    {s.logs?.map(l => exerciseName(l.exerciseId)).join(' · ')}
                  </p>
                </div>
                <span className="history-day-card-arrow">›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Volume chart */}
      <section className="history-section">
        <h3 className="history-section-title">Progress</h3>
        <VolumeChart sessions={finished} />
      </section>

      {/* Session list */}
      <section className="history-section">
        <div className="history-sessions-header">
          <h3 className="history-section-title">Sessions</h3>
          {finished.length > 0 && (
            <span className="history-sessions-count">{filtered.length}</span>
          )}
        </div>

        {/* Filter pills */}
        {usedTemplateIds.length > 1 && (
          <div className="history-filter-strip">
            <button
              className={`history-filter-pill ${filterId === null ? 'history-filter-pill--active' : ''}`}
              onClick={() => handleFilter(null)}
            >
              All
            </button>
            {usedTemplateIds.map(id => (
              <button
                key={id}
                className={`history-filter-pill ${filterId === id ? 'history-filter-pill--active' : ''}`}
                onClick={() => handleFilter(id)}
              >
                {templateName(id)}
              </button>
            ))}
          </div>
        )}

        {finished.length === 0 ? (
          <p className="history-empty">No sessions yet. Finish a workout to see it here.</p>
        ) : filtered.length === 0 ? (
          <p className="history-empty">No sessions for this workout.</p>
        ) : (
          <>
            <ul className="history-list" key={filterId ?? 'all'}>
              {visible.map(s => {
                const vol = sessionVolume(s)
                const prs = sessionPRCount(s)
                const isOpen = swipedId === s.id
                return (
                  <li
                    key={s.id}
                    className={`history-swipe-item${isOpen ? ' history-swipe-item--open' : ''}`}
                    onTouchStart={e => handleTouchStart(e, s.id)}
                    onTouchEnd={e => handleTouchEnd(e, s.id)}
                  >
                    <div className="history-swipe-actions">
                      <button
                        className="history-swipe-delete"
                        onClick={() => { setDeleteConfirm(s); setSwipedId(null) }}
                      >
                        Delete
                      </button>
                    </div>
                    <button
                      className="history-card"
                      onClick={() => { if (isOpen) { setSwipedId(null); return }; onViewSession(s) }}
                    >
                      <div className="history-card-info">
                        <p className="history-card-name">{templateName(s.templateId)}</p>
                        <p className="history-card-meta">
                          {fmtDate(s.finishedAt)} · {fmtDuration(s.duration)} · {fmtVolume(vol)} lbs
                          {prs > 0 && <span className="history-pr-tag"> · 🏆 {prs} PR</span>}
                        </p>
                      </div>
                      <span className="history-card-arrow">›</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {hasMore && (
              <button className="history-load-more" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}>
                Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
              </button>
            )}
          </>
        )}
      </section>
      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="history-delete-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="history-delete-modal" onClick={e => e.stopPropagation()}>
            <p className="history-delete-title">Delete "{templateName(deleteConfirm.templateId)}"?</p>
            <p className="history-delete-sub">This can't be undone.</p>
            <div className="history-delete-actions">
              <button className="history-delete-cancel" onClick={() => setDeleteConfirm(null)}>Keep</button>
              <button className="history-delete-confirm" onClick={handleDeleteConfirmed}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
