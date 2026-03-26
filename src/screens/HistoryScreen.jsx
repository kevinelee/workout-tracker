import { useState } from 'react'
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

export default function HistoryScreen({ sessions, templates, checkIns, onViewSession }) {
  const streak = calcStreak(sessions, checkIns)
  const finished = sessions.filter(s => s.finishedAt).sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))

  const [filterId,     setFilterId]     = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [dayModal,     setDayModal]     = useState(null) // { date, sessions }

  function templateName(id) {
    return templates.find(t => t.id === id)?.name ?? 'Workout'
  }

  // Templates that actually have finished sessions
  const usedTemplateIds = [...new Set(finished.map(s => s.templateId))]

  function handleFilter(id) {
    setFilterId(id)
    setVisibleCount(PAGE_SIZE)
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
            <p className="history-day-title">{fmtDateLong(dayModal.date)}</p>
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
                return (
                  <li key={s.id}>
                    <button className="history-card" onClick={() => onViewSession(s)}>
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
    </div>
  )
}
