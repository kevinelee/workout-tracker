import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { defaultExercises } from '../data/exerciseLibrary'
import { getCachedCustomExercises } from '../storage'
import { fmtVolume } from '../utils/volume'
import './MuscleVolumeChart.css'

// Map muscleGroup → category for color coding
const MUSCLE_CATEGORY = {
  Chest:      'Push',
  Shoulders:  'Push',
  Triceps:    'Push',
  Back:       'Pull',
  Biceps:     'Pull',
  Quads:      'Legs',
  Hamstrings: 'Legs',
  Calves:     'Legs',
  Abs:        'Core',
  Obliques:   'Core',
  Cardio:     'Cardio', // remapped from Full Body
}

const CATEGORY_COLOR = {
  Push:   '#60a5fa',
  Pull:   '#c084fc',
  Legs:   '#4ade80',
  Core:   '#facc15',
  Cardio: '#fb923c',
}

const RANGES = [
  { label: 'This Week',    days: 7  },
  { label: '4 Weeks',      days: 28 },
  { label: 'All Time',     days: null },
]

function buildData(sessions, days) {
  const cutoff = days ? new Date(Date.now() - days * 86_400_000) : null
  const all = [...defaultExercises, ...getCachedCustomExercises()]
  const totals = {}

  for (const session of sessions) {
    if (cutoff && new Date(session.finishedAt) < cutoff) continue
    for (const log of session.logs ?? []) {
      const ex = all.find(e => e.id === log.exerciseId)
      if (!ex) continue
      // Remap cardio "Full Body" to its own bucket
      const group = ex.muscleGroup === 'Full Body' ? 'Cardio' : ex.muscleGroup
      const vol = log.sets
        .filter(s => s.completed)
        .reduce((sum, s) => sum + s.weight * s.reps, 0)
      totals[group] = (totals[group] ?? 0) + vol
    }
  }

  return Object.entries(totals)
    .map(([group, volume]) => ({
      group,
      volume: Math.round(volume),
      color: CATEGORY_COLOR[MUSCLE_CATEGORY[group]] ?? '#9ca3af',
    }))
    .sort((a, b) => b.volume - a.volume)
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { group, volume } = payload[0].payload
  return (
    <div className="mvc-tooltip">
      <p className="mvc-tooltip-group">{group}</p>
      <p className="mvc-tooltip-value">{fmtVolume(volume)} lbs</p>
    </div>
  )
}

export default function MuscleVolumeChart({ sessions }) {
  const [rangeIdx, setRangeIdx] = useState(1) // default: 4 weeks
  const { days } = RANGES[rangeIdx]
  const data = buildData(sessions, days)

  return (
    <div className="mvc">
      {/* Range toggle */}
      <div className="mvc-range-strip">
        {RANGES.map((r, i) => (
          <button
            key={r.label}
            className={`history-filter-pill${rangeIdx === i ? ' history-filter-pill--active' : ''}`}
            onClick={() => setRangeIdx(i)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <p className="mvc-empty">No sessions in this range yet.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={Math.max(140, data.length * 38)}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 0, bottom: 4 }}
            >
              <XAxis
                type="number"
                tick={{ fill: 'var(--text)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => fmtVolume(v)}
              />
              <YAxis
                type="category"
                dataKey="group"
                width={82}
                tick={{ fill: 'var(--text)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="volume" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mvc-legend">
            {Object.entries(CATEGORY_COLOR).map(([cat, color]) => (
              <span key={cat} className="mvc-legend-item">
                <span className="mvc-legend-dot" style={{ background: color }} />
                {cat}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
