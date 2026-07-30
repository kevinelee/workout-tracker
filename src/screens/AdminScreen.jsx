import { useState, useEffect, useRef } from 'react'
import { getFeedback, markFeedbackReviewed, archiveFeedback, getAdminActivity, getAdminStats, getAdminUserStats, getAdminUserSessions, adminTerminateSession } from '../storage'
import { defaultExercises } from '../data/exerciseLibrary'

const EXERCISE_MAP = Object.fromEntries(defaultExercises.map(e => [e.id, e.name]))
function exName(id) { return EXERCISE_MAP[id] ?? id }
import { CHANGELOG } from '../data/changelog'
import './AdminScreen.css'

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

const TYPE_META = {
  new:         { label: '✦ New',        color: 'new'         },
  fix:         { label: '🐛 Fix',        color: 'fix'         },
  improvement: { label: '↑ Improvement', color: 'improvement' },
}

function FeedbackModal({ item, onClose, onMarkReviewed, onArchive }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-meta">
            <span className={`admin-item-type admin-item-type--${item.type}`}>
              {item.type === 'bug' ? '🐛 Bug' : '💬 Feedback'}
            </span>
            {item.status === 'new' && <span className="admin-item-new-dot">NEW</span>}
          </div>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="admin-modal-info">
          <span className="admin-item-email">{item.user_email ?? 'unknown'}</span>
          <span className="admin-item-date">{fmtDate(item.created_at)}</span>
        </div>

        <p className="admin-modal-message">{item.message}</p>

        <div className="admin-modal-footer">
          {item.status !== 'archived' && (
            <button className="admin-modal-btn admin-modal-btn--archive" onClick={() => { onArchive(item.id); onClose() }}>
              Archive
            </button>
          )}
          {item.status === 'new' && (
            <button className="admin-modal-btn admin-modal-btn--resolve" onClick={() => { onMarkReviewed(item.id); onClose() }}>
              Mark as Reviewed
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const SWIPE_THRESHOLD = 80
const AXIS_LOCK_THRESHOLD = 8

function SwipeToArchive({ onArchive, children }) {
  const [offsetX, setOffsetX] = useState(0)
  const [swiped, setSwiped]   = useState(false)
  const startX = useRef(null)
  const startY = useRef(null)
  const tracking = useRef(false)
  const axis = useRef(null)

  function onTouchStart(e) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    tracking.current = true
    axis.current = null
  }

  function onTouchMove(e) {
    if (!tracking.current) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    if (axis.current === null) {
      if (Math.abs(dx) < AXIS_LOCK_THRESHOLD && Math.abs(dy) < AXIS_LOCK_THRESHOLD) return
      // Bias toward vertical: scrolling is the primary gesture on this list,
      // so only lock to a horizontal swipe when it's clearly dominant —
      // otherwise a slightly diagonal scroll-start falsely reveals Archive.
      axis.current = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y'
    }
    if (axis.current !== 'x') return

    if (dx < 0) setOffsetX(Math.max(dx, -SWIPE_THRESHOLD * 1.5))
  }

  function onTouchEnd() {
    tracking.current = false
    if (axis.current === 'x' && offsetX <= -SWIPE_THRESHOLD) {
      setSwiped(true)
      setOffsetX(-SWIPE_THRESHOLD * 1.5)
      setTimeout(() => onArchive(), 280)
    } else {
      setOffsetX(0)
    }
    axis.current = null
  }

  function onTouchCancel() {
    // iOS fires touchcancel instead of touchend when it hands the gesture
    // off to native scrolling mid-drag. Without resetting here, offsetX
    // stays stuck non-zero and the red Archive panel is left permanently
    // exposed behind the card.
    tracking.current = false
    axis.current = null
    setOffsetX(0)
  }

  return (
    <div className="swipe-wrap">
      <div className="swipe-reveal"><span>Archive</span></div>
      <div
        className={`swipe-content${swiped ? ' swipe-content--out' : ''}`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        {children}
      </div>
    </div>
  )
}

function fmtRelative(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const THREE_HOURS = 3 * 60 * 60

function fmtDuration(seconds) {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function fmtElapsedLive(startedAt) {
  if (!startedAt) return null
  const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  return { secs, label: fmtDuration(secs) }
}

function SessionExerciseRow({ ex }) {
  const allDone = ex.setsCompleted > 0 && ex.setsCompleted >= ex.setsTotal
  return (
    <div className={`ud-exercise-row${allDone ? ' ud-exercise-row--done' : ''}`}>
      <span className="ud-exercise-name">{exName(ex.exerciseId)}</span>
      {ex.setsTotal > 0 && (
        <span className="ud-exercise-sets">
          {ex.setsCompleted}/{ex.setsTotal}
          {allDone && <span className="ud-check">✓</span>}
        </span>
      )}
    </div>
  )
}

function SessionCard({ session, liveStartedAt }) {
  const [elapsed, setElapsed] = useState(null)
  const isActive = session.status === 'active'

  useEffect(() => {
    if (!isActive || !liveStartedAt) return
    function tick() { setElapsed(fmtElapsedLive(liveStartedAt)) }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isActive, liveStartedAt])

  const label = session.templateName ?? 'Custom workout'
  const date  = new Date(session.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const dur   = isActive
    ? (elapsed?.label ?? '—')
    : fmtDuration(session.durationSeconds)

  return (
    <div className={`ud-session-card${isActive ? ' ud-session-card--active' : ''}`}>
      <div className="ud-session-header">
        {isActive && <span className="ud-live-dot">●</span>}
        <span className="ud-session-name">{label}</span>
        <span className="ud-session-meta">{isActive ? `${dur} in` : `${date} · ${dur}`}</span>
      </div>
      {session.exercises.length > 0 ? (
        <div className="ud-exercise-list">
          {session.exercises.map(ex => (
            <SessionExerciseRow key={ex.exerciseId} ex={ex} />
          ))}
        </div>
      ) : (
        <p className="ud-no-exercises">No exercises logged yet</p>
      )}
    </div>
  )
}

function UserDetailModal({ user, onClose, onTerminate }) {
  const [stats,    setStats]    = useState(null)
  const [sessions, setSessions] = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      getAdminUserStats(user.userId),
      getAdminUserSessions(user.userId, 5),
    ])
      .then(([s, sess]) => { setStats(s); setSessions(sess); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user.userId])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const activeSession = sessions?.find(s => s.status === 'active')
  const recentSessions = sessions?.filter(s => s.status !== 'active') ?? []
  const isOverLimit = activeSession &&
    (Date.now() - new Date(activeSession.startedAt).getTime()) >= THREE_HOURS * 1000

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal admin-user-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <span className="admin-modal-user-name">{user.displayName || 'Unknown'}</span>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /></div>
        ) : (
          <>
            <div className="admin-user-stats">
              <div className="admin-stat">
                <span className="admin-stat-value">{stats?.total_sessions ?? 0}</span>
                <span className="admin-stat-label">Workouts</span>
              </div>
              <div className="admin-stat">
                <span className="admin-stat-value">{fmtDuration(stats?.total_duration_seconds)}</span>
                <span className="admin-stat-label">Total time</span>
              </div>
            </div>

            <div className="ud-sessions-scroll">
              {activeSession && (
                <>
                  <p className="ud-section-label">Active session</p>
                  <SessionCard
                    session={activeSession}
                    liveStartedAt={activeSession.startedAt}
                  />
                </>
              )}
              {recentSessions.length > 0 && (
                <>
                  <p className="ud-section-label">Recent</p>
                  {recentSessions.map(s => (
                    <SessionCard key={s.id} session={s} liveStartedAt={null} />
                  ))}
                </>
              )}
              {!activeSession && recentSessions.length === 0 && (
                <p className="ud-empty">No sessions yet</p>
              )}
            </div>

            {user.hasActiveNow && (
              <div className="admin-user-modal-footer">
                {isOverLimit && (
                  <p className="admin-overtime-warning">Session exceeds 3 hours</p>
                )}
                <button
                  className={`admin-terminate-btn${isOverLimit ? ' admin-terminate-btn--urgent' : ''}`}
                  onClick={() => { onTerminate(user.activeSessionId, user.userId); onClose() }}
                >
                  End session
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatsRow({ stats }) {
  if (!stats) return null
  return (
    <div className="activity-stats-row">
      <div className="activity-stat-pill">
        <span className="activity-stat-value">{stats.totalUsers}</span>
        <span className="activity-stat-label">Users</span>
      </div>
      <div className="activity-stat-pill">
        <span className="activity-stat-value">{stats.sessionsToday}</span>
        <span className="activity-stat-label">Today</span>
      </div>
      <div className="activity-stat-pill">
        <span className="activity-stat-value">{stats.sessionsThisWeek}</span>
        <span className="activity-stat-label">This week</span>
      </div>
    </div>
  )
}

function ActivityTab() {
  const [users, setUsers]           = useState([])
  const [stats, setStats]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([getAdminActivity(), getAdminStats()])
      .then(([data, s]) => {
        setUsers(data)
        setStats(s)
        setLoading(false)
        if (data.length === 0) setError('No users found. Verify admin RLS policies on sessions and profiles.')
      })
      .catch(err => { setError(`Could not load activity: ${err?.message ?? err}. Check admin RLS policies.`); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function handleTerminate(sessionId, userId) {
    await adminTerminateSession(sessionId)
    setUsers(prev => prev.map(u =>
      u.userId === userId
        ? { ...u, hasActiveNow: false, activeSessionId: null }
        : u
    ))
  }

  if (loading) return <div className="admin-loading"><div className="admin-spinner" /></div>

  const live     = users.filter(u => u.hasActiveNow)
  const today    = users.filter(u => !u.hasActiveNow && u.workedOutToday)
  const recent   = users.filter(u => !u.hasActiveNow && !u.workedOutToday && u.lastActive)
  const inactive = users.filter(u => !u.lastActive)

  return (
    <div className="activity-feed">
      <div className="activity-feed-header">
        <StatsRow stats={stats} />
        <button className="activity-refresh-btn" onClick={load}>↻ Refresh</button>
      </div>
      {error && <p className="admin-empty">{error}</p>}

      {live.length > 0 && (
        <>
          <p className="activity-section-label">Live now — {live.length}</p>
          <ul className="activity-list">
            {live.map(u => <ActivityRow key={u.userId} user={u} onSelect={setSelectedUser} onTerminate={handleTerminate} />)}
          </ul>
        </>
      )}
      {today.length > 0 && (
        <>
          <p className="activity-section-label">Done today — {today.length}</p>
          <ul className="activity-list">
            {today.map(u => <ActivityRow key={u.userId} user={u} onSelect={setSelectedUser} onTerminate={handleTerminate} />)}
          </ul>
        </>
      )}
      {recent.length > 0 && (
        <>
          <p className="activity-section-label">Recent — last 30 days</p>
          <ul className="activity-list">
            {recent.map(u => <ActivityRow key={u.userId} user={u} onSelect={setSelectedUser} onTerminate={handleTerminate} />)}
          </ul>
        </>
      )}
      {inactive.length > 0 && (
        <>
          <p className="activity-section-label">No sessions yet — {inactive.length}</p>
          <ul className="activity-list">
            {inactive.map(u => <ActivityRow key={u.userId} user={u} onSelect={setSelectedUser} onTerminate={handleTerminate} />)}
          </ul>
        </>
      )}

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onTerminate={handleTerminate}
        />
      )}
    </div>
  )
}

function ActivityRow({ user, onSelect, onTerminate }) {
  const [imgFailed, setImgFailed] = useState(false)
  const initial = user.displayName ? user.displayName[0].toUpperCase() : '?'

  return (
    <li className="activity-row" onClick={() => onSelect(user)}>
      <div className="activity-avatar">
        {user.avatarUrl && !imgFailed
          ? <img src={user.avatarUrl} alt={initial} className="activity-avatar-img" onError={() => setImgFailed(true)} />
          : initial
        }
      </div>
      <div className="activity-info">
        <div className="activity-name-row">
          <span className="activity-name">{user.displayName || 'Unknown'}</span>
          {user.hasActiveNow && <span className="activity-badge activity-badge--active">● Live</span>}
          {user.workedOutToday && !user.hasActiveNow && (
            <span className="activity-badge activity-badge--done">✓ Done today</span>
          )}
          {user.abandonedSessions > 0 && (
            <span className="activity-badge activity-badge--abandoned">{user.abandonedSessions} abandoned</span>
          )}
        </div>
        <span className="activity-meta">
          Last active {fmtRelative(user.lastActive)}
          {user.workedOutToday && user.todaySessions > 1 && ` · ${user.todaySessions} sessions today`}
        </span>
      </div>
    </li>
  )
}

export default function AdminScreen({ onReviewed }) {
  const [tab, setTab]         = useState('inbox') // 'inbox' | 'activity' | 'changelog'
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getFeedback().then(data => { setItems(data); setLoading(false) })
  }, [])

  async function handleMarkReviewed(id) {
    await markFeedbackReviewed(id)
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'reviewed' } : item))
    onReviewed?.()
  }

  async function handleArchive(id) {
    await archiveFeedback(id)
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'archived' } : item))
  }

  const newCount = items.filter(i => i.status === 'new').length

  const filtered = items.filter(i => {
    if (filter === 'archived')   return i.status === 'archived'
    if (i.status === 'archived') return false
    if (filter === 'new')        return i.status === 'new'
    if (filter === 'bug')        return i.type === 'bug'
    if (filter === 'feedback')   return i.type === 'feedback'
    return true
  })

  // Keep selected in sync if its status changed
  const selectedItem = selected ? items.find(i => i.id === selected) ?? null : null

  return (
    <div className="admin">
      <div className="admin-header">
        <h2 className="admin-title">
          {tab === 'inbox' ? 'Inbox' : tab === 'activity' ? 'Activity' : 'Patch Notes'}
          {tab === 'inbox' && newCount > 0 && <span className="admin-new-badge">{newCount} new</span>}
        </h2>
      </div>

      {/* Top-level tab switcher */}
      <div className="admin-tabs">
        <button className={`admin-tab-btn${tab === 'inbox'     ? ' admin-tab-btn--active' : ''}`} onClick={() => setTab('inbox')}>Inbox</button>
        <button className={`admin-tab-btn${tab === 'activity'  ? ' admin-tab-btn--active' : ''}`} onClick={() => setTab('activity')}>Activity</button>
        <button className={`admin-tab-btn${tab === 'changelog' ? ' admin-tab-btn--active' : ''}`} onClick={() => setTab('changelog')}>Patch Notes</button>
      </div>

      {tab === 'activity' ? (
        <ActivityTab />
      ) : tab === 'changelog' ? (
        <div className="admin-changelog">
          {CHANGELOG.map(release => (
            <div key={release.version} className="admin-release">
              <div className="admin-release-header">
                <span className="admin-release-version">{release.version}</span>
                <span className="admin-release-date">{release.date}</span>
              </div>
              <ul className="admin-release-list">
                {release.items.map((item, i) => (
                  <li key={i} className="admin-cl-item">
                    <span className={`admin-cl-type admin-cl-type--${item.type}`}>
                      {TYPE_META[item.type]?.label ?? item.type}
                    </span>
                    <div className="admin-cl-body">
                      <p className="admin-cl-title">{item.title}</p>
                      <p className="admin-cl-desc">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="admin-filters">
            {[
              { id: 'all',      label: 'All' },
              { id: 'new',      label: 'New' },
              { id: 'bug',      label: '🐛 Bugs' },
              { id: 'feedback', label: '💬 Feedback' },
              { id: 'archived', label: 'Archived' },
            ].map(f => (
              <button
                key={f.id}
                className={`admin-filter-btn${filter === f.id ? ' admin-filter-btn--active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="admin-loading"><div className="admin-spinner" /></div>
          ) : filtered.length === 0 ? (
            <p className="admin-empty">Nothing here yet.</p>
          ) : (
            <ul className="admin-list">
              {filtered.map(item => (
                <li key={item.id}>
                <SwipeToArchive onArchive={() => handleArchive(item.id)}>
                <div
                  className={`admin-item${item.status === 'new' ? ' admin-item--new' : ''}`}
                  onClick={() => setSelected(item.id)}
                >
                  <div className="admin-item-header">
                    <span className={`admin-item-type admin-item-type--${item.type}`}>
                      {item.type === 'bug' ? '🐛 Bug' : '💬 Feedback'}
                    </span>
                    {item.status === 'new' && <span className="admin-item-new-dot">NEW</span>}
                    <span className="admin-item-date">{fmtDate(item.created_at)}</span>
                  </div>
                  <p className="admin-item-message">{item.message}</p>
                  <div className="admin-item-footer">
                    <span className="admin-item-email">{item.user_email ?? 'unknown'}</span>
                    <div className="admin-item-actions" onClick={e => e.stopPropagation()}>
                      {item.status === 'new' && (
                        <button className="admin-resolve-btn" onClick={() => handleMarkReviewed(item.id)}>
                          Mark reviewed
                        </button>
                      )}
                      {item.status !== 'archived' && (
                        <button className="admin-archive-btn" onClick={() => handleArchive(item.id)}>
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                </SwipeToArchive>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {selectedItem && (
        <FeedbackModal
          item={selectedItem}
          onClose={() => setSelected(null)}
          onMarkReviewed={handleMarkReviewed}
          onArchive={handleArchive}
        />
      )}
    </div>
  )
}
