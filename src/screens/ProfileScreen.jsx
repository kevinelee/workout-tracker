import { useState, useEffect, useRef } from 'react'
import { uploadAvatar } from '../storage'
import { sessionVolume, fmtVolume, fmtDuration } from '../utils/volume'
import { calcStreak } from '../utils/streaks'
import WeightChart from '../components/WeightChart'
import BodyHeatmap from '../components/BodyHeatmap'
import CropModal from '../components/CropModal'
import './ProfileScreen.css'


const KG_TO_LBS  = 2.20462
const LBS_TO_KG  = 1 / KG_TO_LBS
const INCH_TO_CM = 2.54

const GENDER_OPTIONS = [
  { label: 'Male',   value: 'male'   },
  { label: 'Female', value: 'female' },
  { label: 'Other',  value: 'other'  },
]

const ACTIVITY_OPTIONS = [
  { label: 'Sedentary',   value: 'sedentary',  sub: 'Little to no exercise' },
  { label: 'Light',       value: 'light',       sub: '1–3 days / week'       },
  { label: 'Moderate',    value: 'moderate',    sub: '3–5 days / week'       },
  { label: 'Active',      value: 'active',      sub: '6–7 days / week'       },
  { label: 'Very Active', value: 'very_active', sub: 'Twice daily'           },
]

function cmToFtIn(cm) {
  if (cm == null) return { ft: '', in: '' }
  const totalInches = cm / INCH_TO_CM
  const ft = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return { ft: String(ft), in: String(inches) }
}

function ftInToCm(ft, inches) {
  const f = parseFloat(ft) || 0
  const i = parseFloat(inches) || 0
  if (f === 0 && i === 0) return null
  return (f * 12 + i) * INCH_TO_CM
}

export default function ProfileScreen({ profile, sessions, checkIns, settings, authUser, onSaveProfile, bodyWeightLogs, onLogWeight, onDeleteWeightLog, onAvatarUpdate }) {
  const unit       = settings?.unit ?? 'lbs'
  const isImperial = unit === 'lbs'

  const fileInputRef = useRef(null)
  const [avatarUrl,       setAvatarUrl]       = useState(profile?.avatarUrl ?? null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError,     setAvatarError]     = useState(null)
  const [cropFile,        setCropFile]        = useState(null)

  const [displayName,    setDisplayName]    = useState(profile?.displayName ?? '')
  const [heightFt,       setHeightFt]       = useState(() => cmToFtIn(profile?.heightCm).ft)
  const [heightIn,       setHeightIn]       = useState(() => cmToFtIn(profile?.heightCm).in)
  const [heightCm,       setHeightCm]       = useState(() => profile?.heightCm != null ? String(Math.round(profile.heightCm)) : '')
  const [weight,         setWeight]         = useState(() => {
    if (profile?.weightKg == null) return ''
    return isImperial
      ? String(Math.round(profile.weightKg * KG_TO_LBS))
      : String(+(profile.weightKg.toFixed(1)))
  })
  const [age,            setAge]            = useState(profile?.age != null ? String(profile.age) : '')
  const [gender,         setGender]         = useState(profile?.gender ?? null)
  const [activityLevel,  setActivityLevel]  = useState(profile?.activityLevel ?? null)
  const [trackWeight,    setTrackWeight]    = useState(profile?.trackWeight ?? null)

  // Sync when profile loads for the first time (async bootstrap)
  useEffect(() => {
    if (!profile) return
    setAvatarUrl(profile.avatarUrl ?? null)
    setDisplayName(profile.displayName ?? '')
    const ftIn = cmToFtIn(profile.heightCm)

    setHeightFt(ftIn.ft)
    setHeightIn(ftIn.in)
    setHeightCm(profile.heightCm != null ? String(Math.round(profile.heightCm)) : '')
    setWeight(
      profile.weightKg != null
        ? isImperial
          ? String(Math.round(profile.weightKg * KG_TO_LBS))
          : String(+(profile.weightKg.toFixed(1)))
        : ''
    )
    setAge(profile.age != null ? String(profile.age) : '')
    setGender(profile.gender ?? null)
    setActivityLevel(profile.activityLevel ?? null)
    setTrackWeight(profile.trackWeight ?? null)
  }, [profile?.avatarUrl, profile?.displayName, profile?.heightCm, profile?.weightKg, profile?.age, profile?.gender, profile?.activityLevel, profile?.trackWeight])

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCropFile(file)
    e.target.value = ''
  }

  async function handleCropConfirm(croppedFile) {
    setCropFile(null)
    setAvatarUploading(true)
    setAvatarError(null)
    try {
      const url = await uploadAvatar(croppedFile)
      setAvatarUrl(url)
      onAvatarUpdate?.(url)
    } catch (err) {
      console.error('Avatar upload failed:', err)
      setAvatarError('Upload failed. Please try a different image.')
    } finally {
      setAvatarUploading(false)
    }
  }

  function buildPayload(overrides = {}) {
    const heightCmVal = isImperial
      ? ftInToCm(heightFt, heightIn)
      : (heightCm ? parseFloat(heightCm) : null)
    const weightKgVal = weight
      ? (isImperial ? parseFloat(weight) * LBS_TO_KG : parseFloat(weight))
      : null
    return {
      displayName:   displayName  || null,
      heightCm:      heightCmVal  || null,
      weightKg:      weightKgVal  || null,
      age:           age ? parseInt(age, 10) : null,
      gender,
      activityLevel,
      ...overrides,
    }
  }

  function handleBlur() {
    onSaveProfile(buildPayload())
  }

  function handlePillSelect(field, value) {
    const next = { gender, activityLevel, [field]: value }
    if (field === 'gender')        setGender(value)
    if (field === 'activityLevel') setActivityLevel(value)
    onSaveProfile(buildPayload({ [field]: value }))
    // suppress unused variable warning
    void next
  }

  async function handleWeightOptIn(accept) {
    setTrackWeight(accept)
    const payload = buildPayload({ trackWeight: accept })
    onSaveProfile(payload)
    if (accept && payload.weightKg) {
      await onLogWeight(payload.weightKg)
    }
  }

  // ── Lifetime stats ────────────────────────────────────────
  const finished      = (sessions ?? []).filter(s => s.finishedAt)
  const totalSessions = finished.length
  const totalVolLbs   = finished.reduce((sum, s) => sum + sessionVolume(s), 0)
  const totalDuration = finished.reduce((sum, s) => sum + (s.duration ?? 0), 0)
  const streak        = calcStreak(sessions ?? [], checkIns ?? [])

  const initials = (displayName || authUser?.email || '?')
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('')

  return (
    <div className="profile">
      {cropFile && (
        <CropModal
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}

      {/* Header */}
      <div className="profile-header">
        <div className="profile-avatar-wrap">
          <button
            className={`profile-avatar${avatarUploading ? ' profile-avatar--uploading' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile photo"
          >
            {avatarUrl && !avatarUploading
              ? <img src={avatarUrl} alt="Profile" className="profile-avatar-img" onError={() => setAvatarUrl(null)} />
              : avatarUploading
                ? <span className="profile-avatar-spinner" />
                : initials
            }
          </button>
          {!avatarUploading && (
            <span className="profile-avatar-edit" aria-hidden="true">✎</span>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="profile-avatar-input"
          onChange={handleAvatarChange}
        />
        {avatarError && (
          <p className="profile-avatar-error">{avatarError}</p>
        )}
        <div className="profile-identity">
          <input
            className="profile-name-input"
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            onBlur={handleBlur}
          />
          <p className="profile-email">{authUser?.email}</p>
        </div>
      </div>

      {/* Lifetime stats */}
      <section className="profile-section">
        <h3 className="profile-section-title">Lifetime Stats</h3>
        <div className="profile-stats-grid">
          <div className="profile-stat">
            <span className="profile-stat-value">{totalSessions}</span>
            <span className="profile-stat-label">Sessions</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{fmtVolume(Math.round(totalVolLbs))}</span>
            <span className="profile-stat-label">lbs lifted</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{streak}</span>
            <span className="profile-stat-label">Day streak</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{fmtDuration(totalDuration) || '—'}</span>
            <span className="profile-stat-label">Total time</span>
          </div>
        </div>
      </section>

      {/* Muscle activity heatmap */}
      <section className="profile-section">
        <h3 className="profile-section-title">Muscle Activity</h3>
        <BodyHeatmap sessions={sessions ?? []} />
      </section>

      {/* Body metrics */}
      <section className="profile-section">
        <h3 className="profile-section-title">Body Metrics</h3>
        <div className="profile-fields">

          {/* Height */}
          <div className="profile-field">
            <label className="profile-label">Height</label>
            {isImperial ? (
              <div className="profile-height-imperial">
                <div className="profile-input-unit">
                  <input
                    type="number" inputMode="numeric"
                    className="profile-input"
                    placeholder="5" min="1" max="9"
                    value={heightFt}
                    onChange={e => setHeightFt(e.target.value)}
                    onBlur={handleBlur}
                  />
                  <span className="profile-unit">ft</span>
                </div>
                <div className="profile-input-unit">
                  <input
                    type="number" inputMode="numeric"
                    className="profile-input"
                    placeholder="10" min="0" max="11"
                    value={heightIn}
                    onChange={e => setHeightIn(e.target.value)}
                    onBlur={handleBlur}
                  />
                  <span className="profile-unit">in</span>
                </div>
              </div>
            ) : (
              <div className="profile-input-unit">
                <input
                  type="number" inputMode="numeric"
                  className="profile-input"
                  placeholder="175"
                  value={heightCm}
                  onChange={e => setHeightCm(e.target.value)}
                  onBlur={handleBlur}
                />
                <span className="profile-unit">cm</span>
              </div>
            )}
          </div>

          {/* Weight */}
          <div className="profile-field">
            <label className="profile-label">Weight</label>
            <div className="profile-input-unit">
              <input
                type="number" inputMode="decimal"
                className="profile-input"
                placeholder={isImperial ? '165' : '75'}
                value={weight}
                onChange={e => setWeight(e.target.value)}
                onBlur={handleBlur}
              />
              <span className="profile-unit">{isImperial ? 'lbs' : 'kg'}</span>
            </div>
          </div>

          {/* Age */}
          <div className="profile-field">
            <label className="profile-label">Age</label>
            <div className="profile-input-unit">
              <input
                type="number" inputMode="numeric"
                className="profile-input"
                placeholder="25" min="13" max="120"
                value={age}
                onChange={e => setAge(e.target.value)}
                onBlur={handleBlur}
              />
              <span className="profile-unit">yrs</span>
            </div>
          </div>

          {/* Gender */}
          <div className="profile-field profile-field--full">
            <label className="profile-label">Gender</label>
            <div className="profile-pills">
              {GENDER_OPTIONS.map(o => (
                <button
                  key={o.value}
                  className={`profile-pill${gender === o.value ? ' profile-pill--active' : ''}`}
                  onClick={() => handlePillSelect('gender', gender === o.value ? null : o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weight tracking opt-in / chart */}
          {trackWeight === null ? (
            <div className="profile-field profile-field--full profile-weight-optin">
              <p className="profile-weight-optin-title">Track your weight?</p>
              <p className="profile-weight-optin-body">
                See how you progress over time. Private — only visible to you, and always optional.
              </p>
              <div className="profile-weight-optin-actions">
                <button
                  className="profile-weight-optin-btn profile-weight-optin-btn--yes"
                  onClick={() => handleWeightOptIn(true)}
                >
                  Yes, track it
                </button>
                <button
                  className="profile-weight-optin-btn profile-weight-optin-btn--no"
                  onClick={() => handleWeightOptIn(false)}
                >
                  No thanks
                </button>
              </div>
            </div>
          ) : trackWeight === true ? (
            <div className="profile-field profile-field--full">
              <label className="profile-label">Weight Progress</label>
              <WeightChart
                logs={bodyWeightLogs ?? []}
                unit={unit}
                onLog={onLogWeight}
                onDelete={onDeleteWeightLog}
              />
            </div>
          ) : (
            <div className="profile-field profile-field--full profile-weight-disabled">
              <button
                className="profile-weight-enable-btn"
                onClick={() => handleWeightOptIn(true)}
              >
                Enable weight tracking
              </button>
            </div>
          )}

          {/* Activity level */}
          <div className="profile-field profile-field--full">
            <label className="profile-label">Activity Level</label>
            <div className="profile-activity-list">
              {ACTIVITY_OPTIONS.map(o => (
                <button
                  key={o.value}
                  className={`profile-activity-option${activityLevel === o.value ? ' profile-activity-option--active' : ''}`}
                  onClick={() => handlePillSelect('activityLevel', activityLevel === o.value ? null : o.value)}
                >
                  <span className="profile-activity-name">{o.label}</span>
                  <span className="profile-activity-sub">{o.sub}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>
    </div>
  )
}
