import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { defaultExercises } from '../data/exerciseLibrary'
import { getCachedCustomExercises } from '../storage'
import './ExerciseProgressChart.css'

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Epley formula: best set is the one with highest estimated 1RM
function epley(weight, reps) {
  if (!reps || reps <= 1) return weight
  return weight * (1 + reps / 30)
}

function buildChartData(exerciseId, sessions) {
  const points = []

  // sessions are newest-first; iterate all, collect matching logs
  for (const session of sessions) {
    if (!session.finishedAt) continue
    const log = session.logs?.find(l => l.exerciseId === exerciseId)
    if (!log) continue

    const done = log.sets.filter(s => s.completed && s.weight > 0 && s.reps > 0)
    if (done.length === 0) continue

    let maxWeight = 0
    let best1RM = 0
    for (const s of done) {
      if (s.weight > maxWeight) maxWeight = s.weight
      const rm = epley(s.weight, s.reps)
      if (rm > best1RM) best1RM = rm
    }

    points.push({
      date:      fmtDate(session.finishedAt),
      maxWeight: +maxWeight.toFixed(1),
      est1RM:    +best1RM.toFixed(1),
    })
  }

  // Points are newest-first; reverse to chronological, take last 12
  return points.reverse().slice(-12)
}

function getStrengthExercisesWithHistory(sessions) {
  const usedIds = new Set()
  for (const s of sessions) {
    for (const log of s.logs ?? []) usedIds.add(log.exerciseId)
  }

  const all = [...defaultExercises, ...getCachedCustomExercises()]
  return all.filter(e => usedIds.has(e.id) && e.category !== 'Cardio' && e.category !== 'Stretch')
}

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  const maxW = payload.find(p => p.dataKey === 'maxWeight')
  const rm   = payload.find(p => p.dataKey === 'est1RM')
  return (
    <div className="epc-tooltip">
      <p className="epc-tooltip-date">{label}</p>
      {maxW && <p className="epc-tooltip-row"><span>Max weight</span><strong>{maxW.value} {unit}</strong></p>}
      {rm   && <p className="epc-tooltip-row"><span>Est. 1RM</span><strong>{rm.value} {unit}</strong></p>}
    </div>
  )
}

export default function ExerciseProgressChart({ sessions, settings, initialId }) {
  const unit = settings?.unit ?? 'lbs'
  const exercises = getStrengthExercisesWithHistory(sessions)
  const defaultId = (initialId && exercises.find(e => e.id === initialId))
    ? initialId
    : exercises[0]?.id ?? null
  const [selectedId, setSelectedId] = useState(defaultId)

  if (exercises.length === 0) {
    return <p className="epc-empty">Complete sessions to see per-exercise progress.</p>
  }

  const data = selectedId ? buildChartData(selectedId, sessions) : []

  return (
    <div className="epc">
      {/* Exercise picker */}
      <div className="epc-picker">
        {exercises.map(e => (
          <button
            key={e.id}
            className={`history-filter-pill${selectedId === e.id ? ' history-filter-pill--active' : ''}`}
            onClick={() => setSelectedId(e.id)}
          >
            {e.name}
          </button>
        ))}
      </div>

      {data.length < 2 ? (
        <p className="epc-empty">Need at least 2 logged sessions to show a trend.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--text)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'var(--text)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip unit={unit} />} />
              <Line
                type="monotone"
                dataKey="maxWeight"
                name="Max weight"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ fill: 'var(--accent)', r: 4, strokeWidth: 0 }}
                activeDot={{ fill: 'var(--accent)', r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="est1RM"
                name="Est. 1RM"
                stroke="var(--accent-border)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ fill: 'var(--accent-border)', r: 3, strokeWidth: 0 }}
                activeDot={{ fill: 'var(--accent-border)', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="epc-legend">
            <span className="epc-legend-item epc-legend-item--solid">Max weight</span>
            <span className="epc-legend-item epc-legend-item--dashed">Est. 1RM (Epley)</span>
          </div>
        </>
      )}
    </div>
  )
}
