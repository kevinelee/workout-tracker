import { useState, useEffect } from 'react'
import { getCachedCustomExercises, getCustomExercises, saveCustomExercise, deleteCustomExercise, clearAll } from '../storage'
import { exportJSON, exportCSV } from '../utils/export'
import { updatePassword, supabase, callFunction } from '../lib/supabase'
import FeedbackModal from '../components/FeedbackModal'
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

const SCHEME_OPTIONS = [
  { label: 'Default', value: 'default' },
  { label: '⬛ Amoled', value: 'amoled' },
  { label: '🩷 Pink',   value: 'pink' },
  { label: '🔵 Blue',   value: 'blue' },
]

const MODE_OPTIONS = [
  { label: '☀️ Light', value: 'light' },
  { label: '🌙 Dark',  value: 'dark' },
]

const notifSupported = typeof Notification !== 'undefined'

export default function SettingsScreen({ settings, onSave, sessions, templates, onSignOut, authUser, onRecalibrate, onShowWhatsNew, appVersion, onBack }) {
  const [s, setS] = useState(settings)
  const [notifStatus, setNotifStatus] = useState(notifSupported ? Notification.permission : 'unsupported')
  const [customExercises, setCustomExercises] = useState(() => getCachedCustomExercises())
  const [confirmDeleteExercise, setConfirmDeleteExercise] = useState(null)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false)
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState(null)
  const [exerciseEditMode, setExerciseEditMode] = useState(false)
  const [editExercise, setEditExercise] = useState(null) // exercise being edited, or null
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editMuscleGroup, setEditMuscleGroup] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [feedbackModal, setFeedbackModal] = useState(null) // 'bug' | 'feedback' | null
  const [pwNew, setPwNew]         = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwError, setPwError]     = useState(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      if (feedbackModal)              { setFeedbackModal(null); return }
      if (editExercise)               { setEditExercise(null); return }
      if (confirmDeleteExercise !== null) { setConfirmDeleteExercise(null); return }
      if (confirmSignOut)             { setConfirmSignOut(false); return }
      if (confirmDeleteAccount)       { setConfirmDeleteAccount(false); return }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [feedbackModal, editExercise, confirmDeleteExercise, confirmSignOut, confirmDeleteAccount])

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)
    if (pwNew.length < 6) { setPwError('Password must be at least 6 characters.'); return }
    if (pwNew !== pwConfirm) { setPwError('Passwords do not match.'); return }
    setPwLoading(true)
    const { error } = await updatePassword(pwNew)
    setPwLoading(false)
    if (error) { setPwError(error.message); return }
    setPwSuccess(true)
    setPwNew('')
    setPwConfirm('')
  }

  async function handleDeleteAccount() {
    setDeleteAccountLoading(true)
    setDeleteAccountError(null)
    try {
      const { error } = await callFunction('delete-account', {})
      if (error) throw error
      // Edge function deleted the auth user; sign out client-side
      await clearAll()
      window.location.reload()
    } catch (err) {
      setDeleteAccountError(err?.message ?? 'Something went wrong. Please try again.')
      setDeleteAccountLoading(false)
    }
  }

  async function handleDeleteExercise(id) {
    await deleteCustomExercise(id)
    setCustomExercises(getCachedCustomExercises())
    setConfirmDeleteExercise(null)
  }

  function openEditExercise(exercise) {
    setEditExercise(exercise)
    setEditName(exercise.name)
    setEditCategory(exercise.category)
    setEditMuscleGroup(exercise.muscleGroup ?? '')
  }

  async function handleSaveEditExercise() {
    if (!editExercise || !editName.trim()) return
    setEditSaving(true)
    await saveCustomExercise({
      id:          editExercise.id,
      name:        editName.trim(),
      category:    editCategory,
      muscleGroup: editMuscleGroup.trim(),
    })
    await getCustomExercises()
    setCustomExercises(getCachedCustomExercises())
    setEditExercise(null)
    setEditSaving(false)
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
      <div className="settings-header">
        {onBack && (
          <button className="settings-back-btn" onClick={onBack}>‹ Back</button>
        )}
        <h2 className="settings-page-title">Settings</h2>
      </div>

      {/* Theme */}
      <Section title="Appearance">
        <div className="seg-group">
          <span className="seg-group-label">Color</span>
          <SegmentedControl
            options={SCHEME_OPTIONS}
            value={s.colorScheme ?? 'default'}
            onChange={v => update('colorScheme', v)}
          />
        </div>
        <div className="seg-group">
          <span className="seg-group-label">Mode</span>
          <SegmentedControl
            options={MODE_OPTIONS}
            value={s.themeMode ?? 'dark'}
            onChange={v => update('themeMode', v)}
          />
        </div>
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
                  <>
                    <button className="settings-exercise-edit" onClick={() => openEditExercise(e)} aria-label="Edit">✎</button>
                    <button className="settings-exercise-delete" onClick={() => setConfirmDeleteExercise(e.id)} aria-label="Delete">✕</button>
                  </>
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

      {/* Edit exercise modal */}
      {editExercise && (
        <div className="sheet-backdrop" onClick={() => !editSaving && setEditExercise(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="sheet-title">Edit Exercise</p>
            <div className="settings-edit-exercise-form">
              <label className="settings-edit-exercise-label">Name</label>
              <input
                className="settings-edit-exercise-input"
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Exercise name"
                autoFocus
              />
              <label className="settings-edit-exercise-label">Category</label>
              <div className="settings-edit-exercise-cats">
                {['Push', 'Pull', 'Legs', 'Core', 'Cardio', 'Stretch'].map(cat => (
                  <button
                    key={cat}
                    className={`settings-edit-exercise-cat-btn${editCategory === cat ? ' settings-edit-exercise-cat-btn--active' : ''}`}
                    onClick={() => setEditCategory(cat)}
                    type="button"
                  >{cat}</button>
                ))}
              </div>
              <label className="settings-edit-exercise-label">Muscle Group</label>
              <input
                className="settings-edit-exercise-input"
                type="text"
                value={editMuscleGroup}
                onChange={e => setEditMuscleGroup(e.target.value)}
                placeholder="e.g. Chest, Biceps, Quads"
              />
            </div>
            <div className="sheet-confirm-actions">
              <button className="sheet-confirm-cancel" onClick={() => setEditExercise(null)} disabled={editSaving}>Cancel</button>
              <button className="sheet-confirm-ok" onClick={handleSaveEditExercise} disabled={editSaving || !editName.trim()}>
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile */}
      <Section title="Profile">
        <button className="settings-action-btn" onClick={onRecalibrate}>
          Recalibrate fitness profile
        </button>
      </Section>

      {/* Support */}
      <Section title="Support">
        <div className="settings-export-row">
          <button className="settings-action-btn" onClick={() => setFeedbackModal('bug')}>
            🐛 Report a Bug
          </button>
          <button className="settings-action-btn" onClick={() => setFeedbackModal('feedback')}>
            💬 Share Feedback
          </button>
        </div>
        {onShowWhatsNew && (
          <button className="settings-action-btn settings-whats-new-btn" onClick={onShowWhatsNew}>
            What's New
          </button>
        )}
      </Section>

      {/* Legal */}
      <Section title="Legal">
        <div className="settings-export-row">
          <a className="settings-action-btn settings-legal-link" href="/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          <a className="settings-action-btn settings-legal-link" href="/terms" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>
        </div>
      </Section>

      {/* Account */}
      <Section title="Account">
        <p className="settings-account-email">{authUser?.email}</p>
        <form className="settings-pw-form" onSubmit={handleChangePassword}>
          <input
            className="settings-pw-input"
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            minLength={6}
            value={pwNew}
            onChange={e => { setPwNew(e.target.value); setPwSuccess(false); setPwError(null) }}
          />
          <input
            className="settings-pw-input"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            minLength={6}
            value={pwConfirm}
            onChange={e => { setPwConfirm(e.target.value); setPwSuccess(false); setPwError(null) }}
          />
          {pwError   && <p className="settings-pw-error">{pwError}</p>}
          {pwSuccess && <p className="settings-pw-success">Password updated.</p>}
          <button className="settings-action-btn" type="submit" disabled={pwLoading || !pwNew || !pwConfirm}>
            {pwLoading ? 'Updating…' : 'Change password'}
          </button>
        </form>
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone">
        <button className="settings-signout-btn" onClick={() => setConfirmSignOut(true)}>
          Sign out
        </button>
        <button
          className="settings-danger-btn"
          onClick={() => { if (window.confirm('Delete ALL local data? This cannot be undone.')) { clearAll().then(() => window.location.reload()) } }}
        >
          Clear local data
        </button>
        <button
          className="settings-danger-btn"
          onClick={() => setConfirmDeleteAccount(true)}
        >
          Delete account
        </button>
      </Section>

      {/* Delete account confirm */}
      {confirmDeleteAccount && (
        <div className="sheet-backdrop" onClick={() => !deleteAccountLoading && setConfirmDeleteAccount(false)}>
          <div className="sheet sheet--confirm" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="sheet-title">Delete account?</p>
            <p className="sheet-confirm-body">
              This permanently deletes your account and all your data — workouts, history, settings, everything. This cannot be undone.
            </p>
            {deleteAccountError && <p className="settings-pw-error" style={{ padding: '0 4px' }}>{deleteAccountError}</p>}
            <div className="sheet-confirm-actions">
              <button
                className="sheet-confirm-cancel"
                onClick={() => setConfirmDeleteAccount(false)}
                disabled={deleteAccountLoading}
              >
                Cancel
              </button>
              <button
                className="sheet-confirm-ok"
                onClick={handleDeleteAccount}
                disabled={deleteAccountLoading}
              >
                {deleteAccountLoading ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Feedback / bug report modal */}
      {feedbackModal && (
        <FeedbackModal
          authUser={authUser}
          defaultType={feedbackModal}
          onClose={() => setFeedbackModal(null)}
        />
      )}

      {appVersion && (
        <p className="settings-version">{appVersion}</p>
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
