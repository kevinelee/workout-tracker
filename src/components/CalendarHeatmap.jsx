import { useEffect, useRef } from 'react'
import { buildHeatmapData } from '../utils/streaks'
import './CalendarHeatmap.css'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// Fixed window, not adaptive — this used to grow with account age (up to 16
// weeks), which meant older accounts got a denser, more cramped grid over
// time instead of a stable one. Cells are now fixed-size (see .css), so a
// longer history scrolls horizontally instead of squeezing more columns in.
const WEEKS = 12

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function CalendarHeatmap({ sessions, checkIns, onDayClick }) {
  const scrollRef = useRef(null)
  const hasActivity = sessions.length > 0 || checkIns.length > 0

  // Default the horizontal scroll to the right edge, so today is visible on
  // load and older weeks are the thing you scroll back to, not the reverse.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [hasActivity])

  if (!hasActivity) {
    return (
      <div className="heatmap-empty">
        <p className="heatmap-empty-text">Log your first workout to start tracking your streak</p>
      </div>
    )
  }

  const data = buildHeatmapData(sessions, checkIns, WEEKS)

  const startPad = parseLocalDate(data[0]?.date).getDay()
  const cells = [...Array(startPad).fill(null), ...data]
  const cols = Math.ceil(cells.length / 7)

  const monthLabels = []
  let prevMonth = null
  for (let c = 0; c < cols; c++) {
    const col = cells.slice(c * 7, c * 7 + 7)
    const firstCell = col.find(Boolean)
    if (!firstCell) continue
    const month = parseLocalDate(firstCell.date).getMonth()
    if (month !== prevMonth) {
      monthLabels.push({ col: c, label: MONTHS[month] })
      prevMonth = month
    }
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
      <div className="heatmap-row">
        <div className="heatmap-fixed">
          <span className="heatmap-months-spacer" />
          <div className="heatmap-days">
            {DAYS.map((d, i) => <span key={i} className="heatmap-day-label">{d}</span>)}
          </div>
        </div>
        <div className="heatmap-scroll" ref={scrollRef}>
          <div className="heatmap-months-row" style={{ gridTemplateColumns: `repeat(${cols}, var(--heatmap-cell))` }}>
            {monthLabels.map(({ col, label }) => (
              <span key={col} className="heatmap-month-label" style={{ gridColumn: col + 1 }}>{label}</span>
            ))}
          </div>
          <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${cols}, var(--heatmap-cell))` }}>
            {cells.map((cell, i) =>
              cell === null ? (
                <span key={i} className="heatmap-cell heatmap-cell--empty" />
              ) : (
                <span
                  key={i}
                  className={`heatmap-cell ${cell.active ? 'heatmap-cell--active' : ''}`}
                  title={cell.date}
                  onClick={() => handleClick(cell)}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
