import { useState, useEffect } from 'react'
import { getFeedback, markFeedbackReviewed } from '../storage'
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

export default function AdminScreen({ onReviewed }) {
  const [tab, setTab]       = useState('inbox') // 'inbox' | 'changelog'
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getFeedback().then(data => { setItems(data); setLoading(false) })
  }, [])

  async function handleMarkReviewed(id) {
    await markFeedbackReviewed(id)
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'reviewed' } : item))
    onReviewed?.()
  }

  const newCount = items.filter(i => i.status === 'new').length

  const filtered = items.filter(i => {
    if (filter === 'new')      return i.status === 'new'
    if (filter === 'bug')      return i.type === 'bug'
    if (filter === 'feedback') return i.type === 'feedback'
    return true
  })

  return (
    <div className="admin">
      <div className="admin-header">
        <h2 className="admin-title">
          {tab === 'inbox' ? 'Inbox' : 'Patch Notes'}
          {tab === 'inbox' && newCount > 0 && <span className="admin-new-badge">{newCount} new</span>}
        </h2>
      </div>

      {/* Top-level tab switcher */}
      <div className="admin-tabs">
        <button className={`admin-tab-btn${tab === 'inbox'     ? ' admin-tab-btn--active' : ''}`} onClick={() => setTab('inbox')}>Inbox</button>
        <button className={`admin-tab-btn${tab === 'changelog' ? ' admin-tab-btn--active' : ''}`} onClick={() => setTab('changelog')}>Patch Notes</button>
      </div>

      {tab === 'changelog' ? (
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
            <li key={item.id} className={`admin-item${item.status === 'new' ? ' admin-item--new' : ''}`}>
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
                {item.status === 'new' && (
                  <button className="admin-resolve-btn" onClick={() => handleMarkReviewed(item.id)}>
                    Mark reviewed
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
        </>
      )}
    </div>
  )
}
