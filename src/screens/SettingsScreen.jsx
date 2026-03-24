import { useState } from 'react'
import { saveSettings, getTemplates, getSessions, getCustomExercises, saveCustomExercise, clearAll } from '../storage'
import { exportJSON, exportCSV } from '../utils/export'
import './SettingsScreen.css'

const REST_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '1m',  value: 60 },
  { label: '90s', value: 90 },
  { label: '2m',  value: 120 },
  { label: '3m',  value: 180 },
]

export default function SettingsScreen({ settings, onSave }) {
  const [s, setS] = useState(settings)
  const [notifStatus, setNotifStatus] = useState(Notification.permission)
  const customExercises = getCustomExercises()

  function update(key, value) {
    const updated = { ...s, [key]: value }
    setS(updated)
    saveSettings(updated)
    onSave(updated)
  }

  async function requestNotifications() {
    const result = await Notification.requestPermission()
    setNotifStatus(result)
  }

  function handleExportJSON() { exportJSON(getSessions(), getTemplates()) }
  function handleExportCSV()  { exportCSV(getSessions()) }

  return (
    <div className="settings">
      <h2 className="settings-page-title">Settings</h2>

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
      <Section title="Controller Side" hint="For M3.5 joystick UI">
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
        {notifStatus === 'granted' ? (
          <p className="settings-note">✓ Notifications enabled</p>
        ) : notifStatus === 'denied' ? (
          <p className="settings-note">Notifications blocked — enable in browser settings.</p>
        ) : (
          <button className="settings-action-btn" onClick={requestNotifications}>
            Enable reminders
          </button>
        )}
      </Section>

      {/* Custom exercises */}
      {customExercises.length > 0 && (
        <Section title="Custom Exercises">
          <ul className="settings-exercise-list">
            {customExercises.map(e => (
              <li key={e.id} className="settings-exercise-item">
                <span>{e.name}</span>
                <span className="settings-exercise-cat">{e.category}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Export */}
      <Section title="Export Data">
        <div className="settings-export-row">
          <button className="settings-action-btn" onClick={handleExportJSON}>Export JSON</button>
          <button className="settings-action-btn" onClick={handleExportCSV}>Export CSV</button>
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone">
        <button
          className="settings-danger-btn"
          onClick={() => { if (window.confirm('Delete ALL data? This cannot be undone.')) { clearAll(); window.location.reload() } }}
        >
          Delete all data
        </button>
      </Section>
    </div>
  )
}

function Section({ title, hint, children }) {
  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <p className="settings-section-title">{title}</p>
        {hint && <p className="settings-section-hint">{hint}</p>}
      </div>
      {children}
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
