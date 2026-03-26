import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { sessionVolume, sessionPRCount, volumeChangePercent, fmtVolume, fmtDuration, motivationalCopy } from '../utils/volume'
import './PostWorkoutSummary.css'

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function PostWorkoutSummary({ session, template, prevSession, onDone }) {
  const volume = sessionVolume(session)
  const prsHit = sessionPRCount(session)
  const prevVolume = prevSession ? sessionVolume(prevSession) : null
  const volumePct = volumeChangePercent(volume, prevVolume)
  const completedSets = (session.logs ?? []).reduce((sum, log) => sum + log.sets.filter(s => s.completed).length, 0)
  const totalSets = (session.logs ?? []).reduce((sum, log) => sum + log.sets.length, 0)
  const allDone = completedSets === totalSets && totalSets > 0
  const copy = motivationalCopy({ prsHit, volumePct, allDone })

  useEffect(() => {
    if (prsHit > 0) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 } })
      setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { x: 0.2, y: 0.6 } }), 300)
      setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { x: 0.8, y: 0.6 } }), 500)
    }
  }, [])

  function handleShare() {
    const text = `Just finished ${template.name}! 💪 Volume: ${fmtVolume(volume)} lbs${prsHit > 0 ? ` · ${prsHit} new PR${prsHit > 1 ? 's' : ''}` : ''} — tracked with Workout Tracker`
    if (navigator.share) {
      navigator.share({ title: 'Workout Complete', text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text)
    }
  }

  return (
    <div className="summary">
      <div className="summary-card">
        <p className="summary-emoji">{prsHit > 0 ? '🏆' : '💪'}</p>
        <h2 className="summary-title">{template.name}</h2>
        <p className="summary-copy">{copy}</p>

        <div className="summary-stats">
          <Stat label="Volume" value={`${fmtVolume(volume)} lbs`} sub={volumePct !== null ? `${volumePct > 0 ? '+' : ''}${Math.round(volumePct)}% vs last` : 'First time!'} highlight={volumePct > 0} />
          <Stat label="Duration" value={fmtDuration(session.duration)} />
          <Stat label="Sets" value={`${completedSets}/${totalSets}`} />
          {prsHit > 0 && <Stat label="PRs" value={prsHit} highlight />}
          <Stat label="Started" value={fmtTime(session.startedAt)} />
          <Stat label="Finished" value={fmtTime(session.finishedAt)} />
        </div>

        <div className="summary-actions">
          <button className="summary-share-btn" onClick={handleShare}>Share 🔗</button>
          <button className="summary-done-btn" onClick={onDone}>Done</button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, highlight }) {
  return (
    <div className={`summary-stat ${highlight ? 'summary-stat--highlight' : ''}`}>
      <p className="summary-stat-value">{value}</p>
      <p className="summary-stat-label">{label}</p>
      {sub && <p className="summary-stat-sub">{sub}</p>}
    </div>
  )
}
