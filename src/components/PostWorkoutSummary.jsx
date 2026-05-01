import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { supabase } from '../lib/supabase'
import { sessionVolume, sessionPRCount, volumeChangePercent, fmtVolume, fmtDuration } from '../utils/volume'
import { estimateCalories } from '../utils/calories'
import { defaultExercises } from '../data/exerciseLibrary'
import { getCachedCustomExercises, updateSessionDuration } from '../storage'
import './PostWorkoutSummary.css'

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function PostWorkoutSummary({ session, template, prevSession, onDone, profile, settings }) {
  const unit        = settings?.unit ?? 'lbs'
  const allEx       = [...defaultExercises, ...getCachedCustomExercises()]
  const findEx      = id => allEx.find(e => e.id === id)

  const [aiSummary, setAiSummary] = useState(null)  // null = loading, '' = error/skip
  const [aiError,   setAiError]   = useState(false)
  const [durationSecs, setDurationSecs] = useState(session.duration ?? 0)

  const volume        = sessionVolume(session)
  const prsHit        = sessionPRCount(session)
  const prevVolume    = prevSession ? sessionVolume(prevSession) : null
  const volumePct     = volumeChangePercent(volume, prevVolume)
  const calories      = estimateCalories({ ...session, duration: durationSecs }, profile?.weightKg)
  const completedSets = (session.logs ?? []).reduce((sum, l) => sum + l.sets.filter(s => s.completed).length, 0)
  const totalSets     = (session.logs ?? []).reduce((sum, l) => sum + l.sets.length, 0)
  const isFirstSession = !prevSession
  const [showDurationEdit, setShowDurationEdit] = useState(false)
  const [durationEditH, setDurationEditH] = useState(String(Math.floor((session.duration ?? 0) / 3600)))
  const [durationEditM, setDurationEditM] = useState(String(Math.floor(((session.duration ?? 0) % 3600) / 60)))
  const [durationEditS, setDurationEditS] = useState(String((session.duration ?? 0) % 60))

  function fetchAiSummary() {
    setAiSummary(null)
    setAiError(false)
    const exercises = (session.logs ?? []).map(log => {
      const ex = findEx(log.exerciseId)
      return {
        name:        ex?.name ?? log.exerciseId,
        muscleGroup: ex?.muscleGroup ?? '',
        sets:        log.sets,
      }
    })
    supabase.functions.invoke('generate-workout-summary', {
      body: {
        workoutName:       template.name,
        durationFormatted: fmtDuration(durationSecs || session.duration),
        volume:            fmtVolume(volume),
        prevVolume:        prevVolume != null ? fmtVolume(prevVolume) : null,
        volumePct:         volumePct,
        prsHit,
        completedSets,
        totalSets,
        calories,
        exercises,
        fitnessProfile:  profile?.fitnessProfileSummary ?? null,
        isFirstSession,
        unit,
      },
    })
      .then(({ data, error }) => {
        if (error || !data?.summary) { setAiError(true); return }
        setAiSummary(data.summary)
      })
      .catch(() => setAiError(true))
  }

  useEffect(() => {
    if (prsHit > 0) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 } })
      setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { x: 0.2, y: 0.6 } }), 300)
      setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { x: 0.8, y: 0.6 } }), 500)
    } else if (completedSets > 0) {
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.6 }, scalar: 0.85 })
    }
    fetchAiSummary()
  }, [])

  function handleShare() {
    const text = `Just finished ${template.name}! 💪 ${fmtVolume(volume)} ${unit} volume${prsHit > 0 ? ` · ${prsHit} new PR${prsHit > 1 ? 's' : ''}` : ''} — tracked with session`
    if (navigator.share) {
      navigator.share({ title: 'Workout Complete', text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text)
    }
  }

  const hasPRs    = prsHit > 0
  const isPartial = totalSets > 0 && completedSets < totalSets && completedSets > 0

  return (
    <div className="pws">
      {/* Hero */}
      <div className="pws-hero">
        <div className={`pws-hero-icon ${hasPRs ? 'pws-hero-icon--pr' : ''}`}>
          {hasPRs
            ? <TrophyIcon />
            : <CheckIcon />
          }
        </div>
        <h1 className="pws-hero-name">{template.name}</h1>
        {isPartial && !hasPRs && (
          <p className="pws-hero-tagline">Solid effort — every rep counts.</p>
        )}
        <p className="pws-hero-meta">
          {fmtDate(session.finishedAt)} · {fmtTime(session.startedAt)} – {fmtTime(session.finishedAt)}
        </p>

        {/* Quick stat pills */}
        <div className="pws-pills">
          <button className="pws-pill pws-pill--editable" onClick={() => setShowDurationEdit(true)}>
            {durationSecs > 0 ? fmtDuration(durationSecs) : 'Set duration'} ✎
          </button>
          <span className="pws-pill">{fmtVolume(volume)} {unit}</span>
          <span className="pws-pill">{completedSets}/{totalSets} sets</span>
          {prsHit > 0 && (
            <span className="pws-pill pws-pill--pr"><TrophyIcon />{prsHit} PR{prsHit > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="pws-body">

        {/* AI Summary */}
        <div className="pws-ai-card">
          <span className="pws-ai-label">
            <SparkleIcon /> AI Summary
          </span>
          {aiError ? (
            <div className="pws-ai-error">
              <span className="pws-ai-error-text">Couldn't generate summary</span>
              <button className="pws-ai-retry" onClick={fetchAiSummary}>Retry</button>
            </div>
          ) : aiSummary === null ? (
            <div className="pws-ai-skeleton">
              <div className="pws-ai-skeleton-line" style={{ width: '92%' }} />
              <div className="pws-ai-skeleton-line" style={{ width: '78%' }} />
              <div className="pws-ai-skeleton-line" style={{ width: '55%' }} />
            </div>
          ) : (
            <p className="pws-ai-text">{aiSummary}</p>
          )}
        </div>

        {/* Stats */}
        <div className="pws-stats">
          <StatCard
            label="Volume"
            value={`${fmtVolume(volume)} ${unit}`}
            sub={volumePct !== null
              ? `${volumePct > 0 ? '+' : ''}${Math.round(volumePct)}% vs last`
              : 'First time!'
            }
            accent={volumePct > 0}
          />
          {calories != null
            ? <StatCard label="Calories" value={`~${calories}`} sub="kcal (MET est.)" />
            : <StatCard label="Weight" value="—" sub="add in Profile" dim />
          }
          <StatCard label="Started"  value={fmtTime(session.startedAt)} />
          <StatCard label="Finished" value={fmtTime(session.finishedAt)} />
        </div>

        {/* Exercise log */}
        <div className="pws-exercises">
          <p className="pws-section-label">Exercises</p>
          {(session.logs ?? []).map((log, i) => {
            const ex = findEx(log.exerciseId)
            const done = log.sets.filter(s => s.completed)
            const skipped = log.sets.length - done.length
            const hasPR = done.some(s => s.isPR)
            return (
              <div key={i} className="pws-exercise">
                <div className="pws-exercise-header">
                  <span className="pws-exercise-name">{ex?.name ?? log.exerciseId}</span>
                  {hasPR && <span className="pws-exercise-pr-badge">PR</span>}
                </div>
                <div className="pws-sets">
                  {done.map((s, j) => (
                    <span key={j} className={`pws-set ${s.isPR ? 'pws-set--pr' : ''}`}>
                      {s.weight > 0 ? `${s.weight} × ${s.reps}` : `${s.reps} reps`}
                    </span>
                  ))}
                  {skipped > 0 && (
                    <span className="pws-set pws-set--skipped">{skipped} skipped</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>

      {/* Duration edit modal */}
      {showDurationEdit && (
        <div className="pws-modal-overlay" onClick={() => setShowDurationEdit(false)}>
          <div className="pws-modal" onClick={e => e.stopPropagation()}>
            <p className="pws-modal-title">Set duration</p>
            <p className="pws-modal-body">How long did your workout actually take?</p>
            <div className="pws-duration-inputs">
              <label className="pws-duration-field">
                <input
                  className="pws-duration-input"
                  type="number"
                  min="0"
                  max="23"
                  value={durationEditH}
                  onChange={e => setDurationEditH(e.target.value)}
                  onBlur={e => setDurationEditH(String(Math.max(0, parseInt(e.target.value) || 0)))}
                />
                <span>h</span>
              </label>
              <label className="pws-duration-field">
                <input
                  className="pws-duration-input"
                  type="number"
                  min="0"
                  max="59"
                  value={durationEditM}
                  onChange={e => setDurationEditM(e.target.value)}
                  onBlur={e => setDurationEditM(String(Math.max(0, Math.min(59, parseInt(e.target.value) || 0))))}
                />
                <span>m</span>
              </label>
              <label className="pws-duration-field">
                <input
                  className="pws-duration-input"
                  type="number"
                  min="0"
                  max="59"
                  value={durationEditS}
                  onChange={e => setDurationEditS(e.target.value)}
                  onBlur={e => setDurationEditS(String(Math.max(0, Math.min(59, parseInt(e.target.value) || 0))))}
                />
                <span>s</span>
              </label>
            </div>
            <div className="pws-modal-actions">
              <button className="pws-modal-cancel" onClick={() => setShowDurationEdit(false)}>Cancel</button>
              <button
                className="pws-modal-confirm"
                onClick={async () => {
                  const secs = (parseInt(durationEditH) || 0) * 3600 + (parseInt(durationEditM) || 0) * 60 + (parseInt(durationEditS) || 0)
                  setDurationSecs(secs)
                  setShowDurationEdit(false)
                  if (session.id) await updateSessionDuration(session.id, secs)
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky footer */}
      <div className="pws-footer">
        <button className="pws-share-btn" onClick={handleShare}>Share</button>
        <button className="pws-done-btn" onClick={onDone}>Done</button>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent, dim }) {
  return (
    <div className={`pws-stat ${accent ? 'pws-stat--accent' : ''} ${dim ? 'pws-stat--dim' : ''}`}>
      <p className="pws-stat-value">{value}</p>
      <p className="pws-stat-label">{label}</p>
      {sub && <p className="pws-stat-sub">{sub}</p>}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 14 11 20 23 8" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h12v9a6 6 0 01-12 0V4z" />
      <path d="M8 7H5a3 3 0 003 3M20 7h3a3 3 0 01-3 3" />
      <line x1="14" y1="19" x2="14" y2="23" />
      <line x1="9"  y1="23" x2="19" y2="23" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5z" />
    </svg>
  )
}
