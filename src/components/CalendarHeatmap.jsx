import { buildHeatmapData } from '../utils/streaks'
import './CalendarHeatmap.css'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKS = 16

export default function CalendarHeatmap({ sessions, checkIns }) {
  const data = buildHeatmapData(sessions, checkIns, WEEKS)

  // Pad front so first day aligns to correct weekday column
  const firstDay = new Date(data[0]?.date)
  const startPad = firstDay.getDay() // 0=Sun

  // Build weeks array: array of 7-day chunks
  const cells = [...Array(startPad).fill(null), ...data]
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  return (
    <div className="heatmap">
      <div className="heatmap-days">
        {DAYS.map((d, i) => <span key={i} className="heatmap-day-label">{d}</span>)}
      </div>
      <div className="heatmap-grid">
        {weeks.map((week, wi) => (
          <div key={wi} className="heatmap-week">
            {week.map((cell, di) =>
              cell === null ? (
                <span key={di} className="heatmap-cell heatmap-cell--empty" />
              ) : (
                <span
                  key={di}
                  className={`heatmap-cell ${cell.active ? 'heatmap-cell--active' : ''}`}
                  title={cell.date}
                />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
