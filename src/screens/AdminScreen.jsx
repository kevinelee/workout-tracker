import { useState, useEffect } from 'react'
import { getFeedback, markFeedbackReviewed } from '../storage'
import './AdminScreen.css'

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function AdminScreen() {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getFeedback().then(data => { setItems(data); setLoading(false) })
  }, [])

  async function handleMarkReviewed(id) {
    await markFeedbackReviewed(id)
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'reviewed' } : item))
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
          Inbox
          {newCount > 0 && <span className="admin-new-badge">{newCount} new</span>}
        </h2>
      </div>

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
    </div>
  )
}
