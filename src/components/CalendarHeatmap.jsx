import { buildHeatmapData } from '../utils/streaks'
import './CalendarHeatmap.css'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MAX_WEEKS = 16
const MIN_WEEKS = 4

// Parse 'YYYY-MM-DD' as local date to avoid UTC midnight timezone shift
function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function adaptiveWeeks(sessions, checkIns) {
  const all = [
    ...sessions.map(s => s.startedAt).filter(Boolean),
    ...checkIns,
  ]
  if (!all.length) return MIN_WEEKS
  const earliest = all.reduce((min, d) => (d < min ? d : min))
  const msPerWeek = 7 * 24 * 3600 * 1000
  const weeks = Math.ceil((Date.now() - new Date(earliest).getTime()) / msPerWeek)
  return Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, weeks))
}

export default function CalendarHeatmap({ sessions, checkIns, onDayClick }) {
  const hasActivity = sessions.length > 0 || checkIns.length > 0

  if (!hasActivity) {
    return (
      <div className="heatmap-empty">
        <p className="heatmap-empty-text">Log your first workout to start tracking your streak</p>
      </div>
    )
  }

  const weeks = adaptiveWeeks(sessions, checkIns)
  const data = buildHeatmapData(sessions, checkIns, weeks)

  // Pad front so first day aligns to correct weekday column (parse as local to avoid UTC offset bug)
  const startPad = parseLocalDate(data[0]?.date).getDay()

  // Build weeks array: array of 7-day chunks
  const cells = [...Array(startPad).fill(null), ...data]
  const weekChunks = []
  for (let i = 0; i < cells.length; i += 7) {
    weekChunks.push(cells.slice(i, i + 7))
  }

  function handleClick(cell) {
    if (!cell?.active || !onDayClick) return
    const daySessions = sessions.filter(s => {
      if (!s.startedAt) return false
      const d = new Date(s.startedAt)
      const local = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      return local === cell.date
    })
    onDayClick(cell.date, daySessions)
  }

  return (
    <div className="heatmap">
      <div className="heatmap-days">
        {DAYS.map((d, i) => <span key={i} className="heatmap-day-label">{d}</span>)}
      </div>
      <div className="heatmap-grid">
        {weekChunks.map((week, wi) => (
          <div key={wi} className="heatmap-week">
            {week.map((cell, di) =>
              cell === null ? (
                <span key={di} className="heatmap-cell heatmap-cell--empty" />
              ) : (
                <span
                  key={di}
                  className={`heatmap-cell ${cell.active ? 'heatmap-cell--active' : ''}`}
                  title={cell.date}
                  onClick={() => handleClick(cell)}
                />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
