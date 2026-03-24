import { sessionVolume, sessionPRCount, fmtVolume, fmtDuration } from '../utils/volume'
import { calcStreak } from '../utils/streaks'
import { getCheckIns } from '../storage'
import VolumeChart from '../components/VolumeChart'
import CalendarHeatmap from '../components/CalendarHeatmap'
import './HistoryScreen.css'

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function HistoryScreen({ sessions, templates, onViewSession }) {
  const checkIns = getCheckIns()
  const streak = calcStreak(sessions, checkIns)
  const finished = sessions.filter(s => s.finishedAt).sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))

  function templateName(id) {
    return templates.find(t => t.id === id)?.name ?? 'Workout'
  }

  return (
    <div className="history">
      {/* Streak banner */}
      <div className="history-streak-banner">
        <span className="history-streak-fire">🔥</span>
        <div>
          <p className="history-streak-count">{streak} day streak</p>
          <p className="history-streak-sub">{streak === 0 ? 'Start a session to begin your streak' : 'Keep it going!'}</p>
        </div>
      </div>

      {/* Heatmap */}
      <section className="history-section">
        <h3 className="history-section-title">Activity</h3>
        <CalendarHeatmap sessions={finished} checkIns={checkIns} />
      </section>

      {/* Volume chart */}
      <section className="history-section">
        <h3 className="history-section-title">Progress</h3>
        <VolumeChart sessions={finished} />
      </section>

      {/* Session list */}
      <section className="history-section">
        <h3 className="history-section-title">Sessions</h3>
        {finished.length === 0 ? (
          <p className="history-empty">No sessions yet. Finish a workout to see it here.</p>
        ) : (
          <ul className="history-list">
            {finished.map(s => {
              const vol = sessionVolume(s)
              const prs = sessionPRCount(s)
              return (
                <li key={s.id}>
                  <button className="history-card" onClick={() => onViewSession(s)}>
                    <div className="history-card-info">
                      <p className="history-card-name">{templateName(s.templateId)}</p>
                      <p className="history-card-meta">
                        {fmtDate(s.finishedAt)} · {fmtDuration(s.duration)} · {fmtVolume(vol)} lbs
                        {prs > 0 && <span className="history-pr-tag"> · 🏆 {prs} PR</span>}
                      </p>
                    </div>
                    <span className="history-card-arrow">›</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
