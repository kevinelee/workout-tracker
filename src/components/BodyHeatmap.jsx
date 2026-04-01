import { useState } from 'react'
import { defaultExercises } from '../data/exerciseLibrary'
import { getCachedCustomExercises } from '../storage'
import { fmtVolume } from '../utils/volume'
import './BodyHeatmap.css'

const RANGES = [
  { label: 'This Week', days: 7   },
  { label: '4 Weeks',   days: 28  },
  { label: 'All Time',  days: null },
]

// view: 'front' | 'back' | 'both'
const REGIONS = {
  chest:      { label: 'Chest',      groups: ['Chest'],           view: 'front' },
  shoulders:  { label: 'Shoulders',  groups: ['Shoulders'],       view: 'both'  },
  biceps:     { label: 'Biceps',     groups: ['Biceps'],          view: 'front' },
  triceps:    { label: 'Triceps',    groups: ['Triceps'],         view: 'back'  },
  abs:        { label: 'Abs / Core', groups: ['Abs', 'Obliques'], view: 'front' },
  back:       { label: 'Back',       groups: ['Back'],            view: 'back'  },
  quads:      { label: 'Quads',      groups: ['Quads'],           view: 'front' },
  hamstrings: { label: 'Hamstrings', groups: ['Hamstrings'],      view: 'back'  },
  glutes:     { label: 'Glutes',     groups: ['Glutes'],          view: 'back'  },
  calves:     { label: 'Calves',     groups: ['Calves'],          view: 'both'  },
}

function calcVolumes(sessions, days) {
  const cutoff = days ? new Date(Date.now() - days * 86_400_000) : null
  const all = [...defaultExercises, ...getCachedCustomExercises()]
  const totals = {}
  for (const session of sessions) {
    if (!session.finishedAt) continue
    if (cutoff && new Date(session.finishedAt) < cutoff) continue
    for (const log of session.logs ?? []) {
      const ex = all.find(e => e.id === log.exerciseId)
      if (!ex) continue
      const vol = log.sets
        .filter(s => s.completed)
        .reduce((sum, s) => sum + s.weight * s.reps, 0)
      totals[ex.muscleGroup] = (totals[ex.muscleGroup] ?? 0) + vol
    }
  }
  return totals
}

export default function BodyHeatmap({ sessions }) {
  const [rangeIdx, setRangeIdx] = useState(0)

  const volumes = calcVolumes(sessions, RANGES[rangeIdx].days)
  const regionVols = Object.fromEntries(
    Object.keys(REGIONS).map(k => [
      k,
      REGIONS[k].groups.reduce((s, g) => s + (volumes[g] ?? 0), 0),
    ])
  )
  const maxVol = Math.max(...Object.values(regionVols), 1)

  return (
    <div className="bhm">
      {/* Time range */}
      <div className="bhm-row">
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

      {/* Muscle group list */}
      <div className="bhm-list">
        {Object.entries(REGIONS).map(([id, { label }]) => {
          const vol = regionVols[id] ?? 0
          const pct = vol > 0 ? Math.round(0.18 * 100 + (vol / maxVol) * 0.82 * 100) : 0
          return (
            <div key={id} className="bhm-muscle-row">
              <span className="bhm-muscle-label">{label}</span>
              <div className="bhm-bar-track">
                <div className="bhm-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="bhm-muscle-vol">
                {vol > 0 ? fmtVolume(Math.round(vol)) : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
