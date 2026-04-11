import { CHANGELOG } from '../data/changelog'
import './WhatsNewModal.css'

const TYPE_LABEL = {
  new:         { text: 'New',    cls: 'wn-badge--new'  },
  fix:         { text: 'Fix',    cls: 'wn-badge--fix'  },
  improvement: { text: 'Update', cls: 'wn-badge--upd'  },
}

export const LATEST_VERSION = CHANGELOG[0]?.version ?? ''

export function hasSeenLatest() {
  return localStorage.getItem('wn-seen') === LATEST_VERSION
}

export function markSeen() {
  localStorage.setItem('wn-seen', LATEST_VERSION)
}

export default function WhatsNewModal({ onClose }) {
  const latest = CHANGELOG[0]
  if (!latest) return null

  function handleClose() {
    markSeen()
    onClose()
  }

  return (
    <div className="wn-backdrop" onClick={handleClose}>
      <div className="wn-sheet" onClick={e => e.stopPropagation()}>
        <div className="wn-handle" />
        <div className="wn-header">
          <p className="wn-eyebrow">What's New</p>
          <p className="wn-version">{latest.version}</p>
          <p className="wn-date">{latest.date}</p>
        </div>

        <ul className="wn-list">
          {latest.items.map((item, i) => {
            const badge = TYPE_LABEL[item.type] ?? TYPE_LABEL.improvement
            return (
              <li key={i} className="wn-item">
                <span className={`wn-badge ${badge.cls}`}>{badge.text}</span>
                <div className="wn-item-body">
                  <p className="wn-item-title">{item.title}</p>
                  {item.desc && <p className="wn-item-desc">{item.desc}</p>}
                </div>
              </li>
            )
          })}
        </ul>

        <button className="wn-close" onClick={handleClose}>Done</button>
      </div>
    </div>
  )
}
