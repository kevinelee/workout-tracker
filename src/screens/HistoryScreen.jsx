import { useState, useRef } from 'react'
import { sessionVolume, sessionPRCount, logVolume, fmtVolume, fmtDuration } from '../utils/volume'
import { estimateCalories } from '../utils/calories'
import { calcStreak } from '../utils/streaks'
import { getCachedCustomExercises } from '../storage'
import { defaultExercises } from '../data/exerciseLibrary'
import VolumeChart from '../components/VolumeChart'
import CalendarHeatmap from '../components/CalendarHeatmap'
import ExerciseProgressChart from '../components/ExerciseProgressChart'
import MuscleVolumeChart from '../components/MuscleVolumeChart'
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

function topExerciseNames(session, n = 3) {
  const logs = session.logs ?? []
  if (logs.length === 0) return []
  const withVol = logs.map(l => ({ name: exerciseName(l.exerciseId), vol: logVolume(l) }))
  const hasVol  = withVol.some(l => l.vol > 0)
  const sorted  = hasVol ? [...withVol].sort((a, b) => b.vol - a.vol) : withVol
  return sorted.slice(0, n).map(l => l.name)
}

function inDateRange(session, range) {
  if (range === 'all') return true
  const d   = new Date(session.finishedAt)
  const now = new Date()
  if (range === 'week') {
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return d >= cutoff
  }
  if (range === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }
  return true
}

export default function HistoryScreen({ sessions, templates, checkIns, settings, profile, onViewSession, onDeleteSession }) {
  const streak = calcStreak(sessions, checkIns)
  const finished = sessions.filter(s => s.finishedAt).sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))

  const [filterId,       setFilterId]       = useState(null)
  const [dateRange,      setDateRange]      = useState('all')
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [visibleCount,   setVisibleCount]   = useState(PAGE_SIZE)
  const [dayModal,       setDayModal]       = useState(null) // { date, sessions }
  const [swipedId,       setSwipedId]       = useState(null)
  const [deleteConfirm, setDeleteConfirm]   = useState(null) // session to confirm delete
  const [isDeleting,    setIsDeleting]      = useState(false)
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

  function handleDateRange(range) {
    setDateRange(range)
    setVisibleCount(PAGE_SIZE)
  }

  function handleExerciseSearch(q) {
    setExerciseSearch(q)
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
    setIsDeleting(true)
    await onDeleteSession(deleteConfirm.id)
    setIsDeleting(false)
    setDeleteConfirm(null)
  }

  let filtered = finished
  if (filterId) filtered = filtered.filter(s => s.templateId === filterId)
  if (dateRange !== 'all') filtered = filtered.filter(s => inDateRange(s, dateRange))
  const q = exerciseSearch.trim().toLowerCase()
  if (q) filtered = filtered.filter(s => s.logs?.some(l => exerciseName(l.exerciseId).toLowerCase().includes(q)))

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

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
        <h3 className="history-section-title">Volume</h3>
        <VolumeChart sessions={finished} />
      </section>

      {/* Exercise progress */}
      <section className="history-section">
        <h3 className="history-section-title">Exercise Progress</h3>
        <ExerciseProgressChart sessions={finished} settings={settings} />
      </section>

      {/* Muscle volume */}
      <section className="history-section">
        <h3 className="history-section-title">Volume by Muscle</h3>
        <MuscleVolumeChart sessions={finished} />
      </section>

      {/* Session list */}
      <section className="history-section">
        <div className="history-sessions-header">
          <h3 className="history-section-title">Sessions</h3>
          {finished.length > 0 && (
            <span className="history-sessions-count">{filtered.length}</span>
          )}
        </div>

        {/* Date range + template filters */}
        {finished.length > 0 && (
          <div className="history-filter-strip">
            {['all', 'week', 'month'].map(r => (
              <button
                key={r}
                className={`history-filter-pill ${dateRange === r ? 'history-filter-pill--active' : ''}`}
                onClick={() => handleDateRange(r)}
              >
                {r === 'all' ? 'All Time' : r === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
            {usedTemplateIds.length > 1 && (
              <>
                <span className="history-filter-divider" />
                <button
                  className={`history-filter-pill ${filterId === null ? 'history-filter-pill--active' : ''}`}
                  onClick={() => handleFilter(null)}
                >
                  All Workouts
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
              </>
            )}
          </div>
        )}

        {/* Exercise search */}
        {finished.length > 0 && (
          <div className="history-search-wrap">
            <input
              className="history-search-input"
              type="text"
              placeholder="Search by exercise…"
              value={exerciseSearch}
              onChange={e => handleExerciseSearch(e.target.value)}
            />
            {exerciseSearch && (
              <button className="history-search-clear" onClick={() => handleExerciseSearch('')} aria-label="Clear">✕</button>
            )}
          </div>
        )}

        {finished.length === 0 ? (
          <p className="history-empty">No sessions yet. Finish a workout to see it here.</p>
        ) : filtered.length === 0 ? (
          <p className="history-empty">No sessions match your filters.</p>
        ) : (
          <>
            <ul className="history-list" key={`${filterId}-${dateRange}-${exerciseSearch}`}>
              {visible.map(s => {
                const vol      = sessionVolume(s)
                const prs      = sessionPRCount(s)
                const cals     = estimateCalories(s, profile?.weightKg)
                const topEx    = topExerciseNames(s)
                const isOpen   = swipedId === s.id
                const volUnit  = settings?.unit ?? 'lbs'
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
                          {fmtDate(s.finishedAt)} · {fmtDuration(s.duration)}
                          {vol > 0 && ` · ${fmtVolume(vol)} ${volUnit}`}
                          {prs > 0 && <span className="history-pr-tag"> · 🏆 {prs} PR</span>}
                          {cals != null && <span className="history-cal-tag"> · 🔥 {cals} kcal</span>}
                        </p>
                        {topEx.length > 0 && (
                          <p className="history-card-exercises">{topEx.join(' · ')}</p>
                        )}
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
        <div className="history-delete-backdrop" onClick={() => { if (!isDeleting) setDeleteConfirm(null) }}>
          <div className="history-delete-modal" onClick={e => e.stopPropagation()}>
            <p className="history-delete-title">Delete "{templateName(deleteConfirm.templateId)}"?</p>
            <p className="history-delete-sub">This can't be undone.</p>
            <div className="history-delete-actions">
              <button className="history-delete-cancel" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>Keep</button>
              <button className="history-delete-confirm" onClick={handleDeleteConfirmed} disabled={isDeleting}>
                {isDeleting ? <span className="history-delete-spinner" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
