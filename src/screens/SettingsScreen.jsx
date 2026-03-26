import { useState } from 'react'
import { getCachedCustomExercises, deleteCustomExercise, clearAll } from '../storage'
import { exportJSON, exportCSV } from '../utils/export'
import './SettingsScreen.css'

const REST_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '1m',  value: 60 },
  { label: '90s', value: 90 },
  { label: '2m',  value: 120 },
  { label: '3m',  value: 180 },
]

const THEME_OPTIONS = [
  { label: '🌙 Dark',   value: 'dark' },
  { label: '☀️ Light',  value: 'light' },
  { label: '⬛ Amoled', value: 'amoled' },
]

const notifSupported = typeof Notification !== 'undefined'

export default function SettingsScreen({ settings, onSave, sessions, templates, onSignOut }) {
  const [s, setS] = useState(settings)
  const [notifStatus, setNotifStatus] = useState(notifSupported ? Notification.permission : 'unsupported')
  const [customExercises, setCustomExercises] = useState(() => getCachedCustomExercises())
  const [confirmDeleteExercise, setConfirmDeleteExercise] = useState(null)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [exerciseEditMode, setExerciseEditMode] = useState(false)

  async function handleDeleteExercise(id) {
    await deleteCustomExercise(id)
    setCustomExercises(getCachedCustomExercises())
    setConfirmDeleteExercise(null)
  }

  function update(key, value) {
    const updated = { ...s, [key]: value }
    setS(updated)
    onSave(updated)
  }

  async function requestNotifications() {
    if (!notifSupported) return
    const result = await Notification.requestPermission()
    setNotifStatus(result)
  }

  function handleExportJSON() { exportJSON(sessions, templates) }
  function handleExportCSV()  { exportCSV(sessions) }

  return (
    <div className="settings">
      <h2 className="settings-page-title">Settings</h2>

      {/* Theme */}
      <Section title="Appearance">
        <SegmentedControl
          options={THEME_OPTIONS}
          value={s.theme ?? 'dark'}
          onChange={v => update('theme', v)}
        />
      </Section>

      {/* Units */}
      <Section title="Units">
        <SegmentedControl
          options={[{ label: 'lbs', value: 'lbs' }, { label: 'kg', value: 'kg' }]}
          value={s.unit}
          onChange={v => update('unit', v)}
        />
      </Section>

      {/* Rest timer */}
      <Section title="Default Rest Timer">
        <SegmentedControl
          options={REST_OPTIONS}
          value={s.restTimerDuration}
          onChange={v => update('restTimerDuration', v)}
        />
      </Section>

      {/* Controller side */}
      <Section title="Dominant Hand">
        <SegmentedControl
          options={[{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }]}
          value={s.controllerSide}
          onChange={v => update('controllerSide', v)}
        />
      </Section>

      {/* Check-in */}
      <Section title="Check-In">
        <Toggle
          label="Show check-in on Home"
          value={s.checkInEnabled}
          onChange={v => update('checkInEnabled', v)}
        />
      </Section>

      {/* Notifications */}
      <Section title="Reminders">
        {!notifSupported ? (
          <p className="settings-note">Notifications not supported in this browser.</p>
        ) : notifStatus === 'granted' ? (
          <p className="settings-note">✓ Notifications enabled</p>
        ) : notifStatus === 'denied' ? (
          <p className="settings-note">Notifications blocked — enable in browser settings.</p>
        ) : (
          <button className="settings-action-btn" onClick={requestNotifications}>
            Enable reminders
          </button>
        )}
      </Section>

      {/* My Exercises */}
      <Section
        title="My Exercises"
        collapsible
        action={
          customExercises.length > 0 ? (
            <button
              className={`settings-gear-btn${exerciseEditMode ? ' settings-gear-btn--active' : ''}`}
              onClick={() => setExerciseEditMode(m => !m)}
              aria-label={exerciseEditMode ? 'Done editing' : 'Edit exercises'}
            >
              {exerciseEditMode ? 'Done' : '⚙️'}
            </button>
          ) : null
        }
      >
        {customExercises.length > 0 ? (
          <ul className="settings-exercise-list">
            {customExercises.map(e => (
              <li key={e.id} className="settings-exercise-item">
                <span>{e.name}</span>
                <span className="settings-exercise-cat">{e.category}</span>
                {exerciseEditMode && (
                  <button className="settings-exercise-delete" onClick={() => setConfirmDeleteExercise(e.id)} aria-label="Delete">✕</button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="settings-note">No custom exercises yet. Add one from the exercise search in any workout.</p>
        )}
      </Section>

      {/* Export */}
      <Section title="Export Data">
        <div className="settings-export-row">
          <button className="settings-action-btn" onClick={handleExportJSON}>Export JSON</button>
          <button className="settings-action-btn" onClick={handleExportCSV}>Export CSV</button>
        </div>
      </Section>

      {/* Confirm delete exercise */}
      {confirmDeleteExercise !== null && (
        <div className="sheet-backdrop" onClick={() => setConfirmDeleteExercise(null)}>
          <div className="sheet sheet--confirm" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="sheet-title">Delete Exercise?</p>
            <p className="sheet-confirm-body">This will remove the exercise from your custom list. It won't affect past sessions.</p>
            <div className="sheet-confirm-actions">
              <button className="sheet-confirm-cancel" onClick={() => setConfirmDeleteExercise(null)}>Cancel</button>
              <button className="sheet-confirm-ok" onClick={() => handleDeleteExercise(confirmDeleteExercise)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <Section title="Danger Zone">
        <button className="settings-signout-btn" onClick={() => setConfirmSignOut(true)}>
          Sign out
        </button>
        <button
          className="settings-danger-btn"
          onClick={() => { if (window.confirm('Delete ALL data? This cannot be undone.')) { clearAll().then(() => window.location.reload()) } }}
        >
          Delete all data
        </button>
      </Section>

      {/* Sign-out confirm */}
      {confirmSignOut && (
        <div className="sheet-backdrop" onClick={() => setConfirmSignOut(false)}>
          <div className="sheet sheet--confirm" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="sheet-title">Sign out?</p>
            <p className="sheet-confirm-body">Your data is saved to your account. You'll need to sign in again to access it.</p>
            <div className="sheet-confirm-actions">
              <button className="sheet-confirm-cancel" onClick={() => setConfirmSignOut(false)}>Cancel</button>
              <button className="sheet-confirm-ok" onClick={onSignOut}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, hint, children, collapsible, action }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="settings-section">
      <div
        className={`settings-section-header${collapsible || action ? ' settings-section-header--row' : ''}`}
        onClick={collapsible ? () => setCollapsed(c => !c) : undefined}
        style={collapsible ? { cursor: 'pointer' } : undefined}
      >
        <div>
          <p className="settings-section-title">{title}</p>
          {hint && <p className="settings-section-hint">{hint}</p>}
        </div>
        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
        {collapsible && (
          <span className={`settings-section-chevron${collapsed ? ' settings-section-chevron--collapsed' : ''}`}>›</span>
        )}
      </div>
      {!collapsed && children}
    </div>
  )
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="seg-control">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`seg-btn ${value === opt.value ? 'seg-btn--active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="toggle-row">
      <span className="toggle-label">{label}</span>
      <button
        className={`toggle ${value ? 'toggle--on' : ''}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
      >
        <span className="toggle-thumb" />
      </button>
    </label>
  )
}
