import { useState, useRef, useEffect } from 'react'
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

function buildPRList(sessions) {
  const prMap = {}
  const ordered = [...sessions]
    .filter(s => s.finishedAt)
    .sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt))
  for (const session of ordered) {
    for (const log of session.logs ?? []) {
      for (const set of log.sets) {
        if (!set.completed || !set.weight || set.weight <= 0) continue
        const prev = prMap[log.exerciseId]
        if (!prev || set.weight > prev.maxWeight) {
          prMap[log.exerciseId] = { maxWeight: set.weight, date: session.finishedAt }
        }
      }
    }
  }
  return Object.entries(prMap)
    .map(([exerciseId, { maxWeight, date }]) => ({
      exerciseId,
      name: exerciseName(exerciseId),
      maxWeight,
      date,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
}

// weekStartDay: 0 = Sunday, 1 = Monday (matches JS Date.getDay())
function getThisWeekDays(sessions, weekStartDay = 1) {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const daysSinceStart = ((today.getDay() - weekStartDay) + 7) % 7
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - daysSinceStart)
  weekStart.setHours(0, 0, 0, 0)

  const trainedDates = new Set()
  for (const s of sessions) {
    if (!s.finishedAt) continue
    const d = new Date(s.finishedAt)
    if (d >= weekStart) trainedDates.add(d.toISOString().slice(0, 10))
  }

  const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const dStr = d.toISOString().slice(0, 10)
    return {
      label:    DOW_LABELS[d.getDay()],
      active:   trainedDates.has(dStr),
      isToday:  dStr === todayStr,
      isFuture: dStr > todayStr,
    }
  })
  return { days, count: trainedDates.size }
}

function getMonthlyVolumes(sessions) {
  const now = new Date()
  const thisY = now.getFullYear(), thisM = now.getMonth()
  const lastDate = new Date(thisY, thisM - 1, 1)
  const lastY = lastDate.getFullYear(), lastM = lastDate.getMonth()
  let thisVol = 0, lastVol = 0
  for (const s of sessions) {
    if (!s.finishedAt) continue
    const d = new Date(s.finishedAt)
    if (d.getFullYear() === thisY && d.getMonth() === thisM) thisVol += sessionVolume(s)
    else if (d.getFullYear() === lastY && d.getMonth() === lastM) lastVol += sessionVolume(s)
  }
  return { thisVol, lastVol }
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

  const [filterId,           setFilterId]           = useState(null)
  const [dateRange,          setDateRange]          = useState('all')
  const [exerciseSearch,     setExerciseSearch]     = useState('')
  const [visibleCount,       setVisibleCount]       = useState(PAGE_SIZE)
  const [dayModal,           setDayModal]           = useState(null)
  const [swipedId,           setSwipedId]           = useState(null)
  const [deleteConfirm,      setDeleteConfirm]      = useState(null)
  const [isDeleting,         setIsDeleting]         = useState(false)
  const [showAllPRs,         setShowAllPRs]         = useState(false)
  const [progressExerciseId, setProgressExerciseId] = useState(null)
  const touchStartRef  = useRef(null)
  const progressRef    = useRef(null)

  const prList          = buildPRList(finished)
  const weekStartDay    = profile?.weekStartDay ?? 1
  const targetDays      = profile?.targetDaysPerWeek ?? 3
  const weekActivity    = getThisWeekDays(finished, weekStartDay)
  const monthlyVols     = getMonthlyVolumes(finished)
  const unit            = settings?.unit ?? 'lbs'

  useEffect(() => {
    if (!progressExerciseId) return
    const timer = setTimeout(() => {
      progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => clearTimeout(timer)
  }, [progressExerciseId])

  function handlePRTap(exerciseId) {
    setProgressExerciseId(exerciseId)
  }

  function templateName(id) {
    return templates?.find(t => t.id === id)?.name ?? 'Workout'
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
    try {
      await onDeleteSession(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete session:', err)
    } finally {
      setIsDeleting(false)
    }
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

      {/* Consistency */}
      {finished.length > 0 && (
        <section className="history-section">
          <h3 className="history-section-title">Consistency</h3>
          <div className="history-consistency">
            <div className="history-week-dots">
              {weekActivity.days.map((day, i) => (
                <div key={i} className="history-week-day">
                  <div className={[
                    'history-week-dot',
                    day.active    ? 'history-week-dot--active'  : '',
                    day.isToday   ? 'history-week-dot--today'   : '',
                    day.isFuture  ? 'history-week-dot--future'  : '',
                  ].filter(Boolean).join(' ')} />
                  <span className="history-week-label">{day.label}</span>
                </div>
              ))}
            </div>
            <div className="history-consistency-meta">
              <span className={weekActivity.count >= targetDays ? 'history-vol-up' : ''}>
                {weekActivity.count} / {targetDays} days this week
                {weekActivity.count >= targetDays ? ' ✓' : ''}
              </span>
              {monthlyVols.lastVol > 0 && (
                <span className={monthlyVols.thisVol >= monthlyVols.lastVol ? 'history-vol-up' : 'history-vol-down'}>
                  {monthlyVols.thisVol >= monthlyVols.lastVol ? '↑' : '↓'}{' '}
                  {Math.abs(Math.round((monthlyVols.thisVol - monthlyVols.lastVol) / monthlyVols.lastVol * 100))}% vs last month
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Personal Records */}
      {prList.length > 0 && (
        <section className="history-section">
          <h3 className="history-section-title">Personal Records</h3>
          <ul className="history-pr-list">
            {(showAllPRs ? prList : prList.slice(0, 5)).map(pr => (
              <li key={pr.exerciseId}>
                <button className="history-pr-row" onClick={() => handlePRTap(pr.exerciseId)}>
                  <div className="history-pr-info">
                    <span className="history-pr-name">{pr.name}</span>
                    <span className="history-pr-date">{fmtDate(pr.date)}</span>
                  </div>
                  <span className="history-pr-weight">{pr.maxWeight} {unit}</span>
                  <span className="history-card-arrow">›</span>
                </button>
              </li>
            ))}
          </ul>
          {prList.length > 5 && (
            <button className="history-load-more" onClick={() => setShowAllPRs(v => !v)}>
              {showAllPRs ? 'Show fewer' : `Show all ${prList.length} records`}
            </button>
          )}
        </section>
      )}

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
      <section className="history-section" ref={progressRef}>
        <h3 className="history-section-title">Exercise Progress</h3>
        <ExerciseProgressChart
          key={progressExerciseId ?? 'default'}
          sessions={finished}
          settings={settings}
          initialId={progressExerciseId}
        />
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
                          {vol > 0 && ` · ${fmtVolume(vol)} ${unit}`}
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
