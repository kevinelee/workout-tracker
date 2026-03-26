import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { defaultExercises } from '../data/exerciseLibrary'
import { getCachedCustomExercises } from '../storage'
import { buildVolumeChartData, fmtVolume } from '../utils/volume'
import './VolumeChart.css'

function getExercisesWithHistory(sessions) {
  const ids = new Set()
  for (const s of sessions) {
    for (const log of s.logs ?? []) ids.add(log.exerciseId)
  }
  const all = [...defaultExercises, ...getCachedCustomExercises()]
  return all.filter(e => ids.has(e.id))
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{label}</p>
      <p className="chart-tooltip-value">{fmtVolume(payload[0].value)} lbs</p>
    </div>
  )
}

export default function VolumeChart({ sessions }) {
  const exercises = getExercisesWithHistory(sessions)
  const [selectedId, setSelectedId] = useState(exercises[0]?.id ?? null)

  if (exercises.length === 0) {
    return <p className="chart-empty">Complete sessions to see progress charts.</p>
  }

  const data = selectedId ? buildVolumeChartData(selectedId, sessions) : []

  return (
    <div className="volume-chart">
      <div className="chart-picker">
        {exercises.map(e => (
          <button
            key={e.id}
            className={`chart-pill ${selectedId === e.id ? 'chart-pill--active' : ''}`}
            onClick={() => setSelectedId(e.id)}
          >
            {e.name}
          </button>
        ))}
      </div>

      {data.length < 2 ? (
        <p className="chart-empty">Need at least 2 sessions to show a trend.</p>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#2e303a" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => fmtVolume(v)} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#c084fc"
              strokeWidth={2}
              dot={{ fill: '#c084fc', r: 4, strokeWidth: 0 }}
              activeDot={{ fill: '#c084fc', r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
