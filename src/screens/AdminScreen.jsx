import { useState, useEffect, useRef } from 'react'
import { getFeedback, markFeedbackReviewed, archiveFeedback, getAdminActivity, getAdminUserStats, adminTerminateSession } from '../storage'
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

function SwipeToArchive({ onArchive, children }) {
  const [offsetX, setOffsetX] = useState(0)
  const [swiped, setSwiped]   = useState(false)
  const startX = useRef(null)
  const tracking = useRef(false)

  function onTouchStart(e) {
    startX.current = e.touches[0].clientX
    tracking.current = true
  }

  function onTouchMove(e) {
    if (!tracking.current) return
    const dx = e.touches[0].clientX - startX.current
    if (dx < 0) setOffsetX(Math.max(dx, -SWIPE_THRESHOLD * 1.5))
  }

  function onTouchEnd() {
    tracking.current = false
    if (offsetX <= -SWIPE_THRESHOLD) {
      setSwiped(true)
      setOffsetX(-SWIPE_THRESHOLD * 1.5)
      setTimeout(() => onArchive(), 280)
    } else {
      setOffsetX(0)
    }
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

function UserDetailModal({ user, onClose, onTerminate }) {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [elapsed, setElapsed] = useState(null)

  useEffect(() => {
    getAdminUserStats(user.userId)
      .then(s => { setStats(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user.userId])

  // Live-update elapsed for active session
  useEffect(() => {
    if (!stats?.current_session_started_at) return
    function tick() { setElapsed(fmtElapsedLive(stats.current_session_started_at)) }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [stats?.current_session_started_at])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const isOverLimit = elapsed?.secs >= THREE_HOURS

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
          <div className="admin-user-stats">
            <div className="admin-stat">
              <span className="admin-stat-value">{stats?.total_sessions ?? 0}</span>
              <span className="admin-stat-label">Workouts</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-value">{fmtDuration(stats?.total_duration_seconds)}</span>
              <span className="admin-stat-label">Total time</span>
            </div>
            {user.hasActiveNow && (
              <div className={`admin-stat${isOverLimit ? ' admin-stat--warn' : ''}`}>
                <span className="admin-stat-value">{elapsed?.label ?? '—'}</span>
                <span className="admin-stat-label">Current session</span>
              </div>
            )}
          </div>
        )}

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
      </div>
    </div>
  )
}

function ActivityTab() {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    getAdminActivity()
      .then(data => {
        setUsers(data)
        setLoading(false)
        if (data.length === 0) setError('No activity in the last 7 days. If you expect data, verify admin RLS policies on sessions and profiles.')
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

  const today = users.filter(u => u.workedOutToday)
  const rest  = users.filter(u => !u.workedOutToday)

  return (
    <div className="activity-feed">
      <button className="activity-refresh-btn" onClick={load}>↻ Refresh</button>
      {error && <p className="admin-empty">{error}</p>}
      {today.length > 0 && (
        <>
          <p className="activity-section-label">Worked out today — {today.length}</p>
          <ul className="activity-list">
            {today.map(u => <ActivityRow key={u.userId} user={u} onSelect={setSelectedUser} onTerminate={handleTerminate} />)}
          </ul>
        </>
      )}
      {rest.length > 0 && (
        <>
          <p className="activity-section-label">Recent — last 7 days</p>
          <ul className="activity-list">
            {rest.map(u => <ActivityRow key={u.userId} user={u} onSelect={setSelectedUser} onTerminate={handleTerminate} />)}
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
