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
  const [face, setFace]         = useState('front')
  const [selected, setSelected] = useState(null)

  const volumes = calcVolumes(sessions, RANGES[rangeIdx].days)
  const regionVols = Object.fromEntries(
    Object.keys(REGIONS).map(k => [
      k,
      REGIONS[k].groups.reduce((s, g) => s + (volumes[g] ?? 0), 0),
    ])
  )
  const maxVol = Math.max(...Object.values(regionVols), 1)

  // Returns SVG props for a given region id
  function rp(id) {
    const { view } = REGIONS[id]
    const visible     = view === 'both' || view === face
    const vol         = regionVols[id] ?? 0
    const highlighted = visible && vol > 0
    const isSelected  = selected === id && visible
    const opVal       = highlighted ? 0.18 + (vol / maxVol) * 0.82 : 0
    return {
      fill:        highlighted ? 'var(--accent)' : 'var(--surface-2)',
      fillOpacity: highlighted ? opVal : 1,
      stroke:      isSelected  ? 'var(--accent)' : 'none',
      strokeWidth: isSelected  ? 1.5 : 0,
      onClick:     visible ? () => setSelected(s => s === id ? null : id) : undefined,
      style:       { cursor: visible ? 'pointer' : 'default' },
    }
  }

  const sel = selected &&
    (REGIONS[selected].view === 'both' || REGIONS[selected].view === face)
    ? selected : null

  return (
    <div className="bhm">
      {/* Time range */}
      <div className="bhm-row">
        {RANGES.map((r, i) => (
          <button
            key={r.label}
            className={`history-filter-pill${rangeIdx === i ? ' history-filter-pill--active' : ''}`}
            onClick={() => { setRangeIdx(i); setSelected(null) }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Front / Back toggle */}
      <div className="bhm-row">
        <button
          className={`bhm-face-btn${face === 'front' ? ' bhm-face-btn--on' : ''}`}
          onClick={() => { setFace('front'); setSelected(null) }}
        >
          Front
        </button>
        <button
          className={`bhm-face-btn${face === 'back' ? ' bhm-face-btn--on' : ''}`}
          onClick={() => { setFace('back'); setSelected(null) }}
        >
          Back
        </button>
      </div>

      {/* Selected region info */}
      <div className="bhm-info-row">
        {sel ? (
          <>
            <span className="bhm-info-name">{REGIONS[sel].label}</span>
            <span className="bhm-info-vol">
              {regionVols[sel]
                ? `${fmtVolume(Math.round(regionVols[sel]))} lbs`
                : 'No activity'}
            </span>
          </>
        ) : (
          <span className="bhm-info-hint">Tap a muscle to see volume</span>
        )}
      </div>

      {/* SVG body — same geometry front/back, region IDs swap */}
      <svg viewBox="0 0 100 220" className="bhm-svg" aria-label="Muscle activity heatmap">
        {/* Head + neck (non-interactive) */}
        <ellipse cx="50" cy="15" rx="11" ry="12" fill="var(--surface-2)" />
        <rect x="45" y="25" width="10" height="9" rx="3" fill="var(--surface-2)" />
        {/* Forearms (non-interactive) */}
        <rect x="8"  y="86" width="11" height="24" rx="5" fill="var(--surface-2)" />
        <rect x="81" y="86" width="11" height="24" rx="5" fill="var(--surface-2)" />

        {/* Shoulders — visible in both views */}
        <g {...rp('shoulders')}>
          <ellipse cx="22" cy="44" rx="13" ry="8" />
          <ellipse cx="78" cy="44" rx="13" ry="8" />
        </g>

        {/* Upper torso: chest (front) / back (back) */}
        <g {...(face === 'front' ? rp('chest') : rp('back'))}>
          <path d="M33,34 L67,34 L65,72 L35,72 Z" />
        </g>

        {/* Upper arms: biceps (front) / triceps (back) */}
        <g {...(face === 'front' ? rp('biceps') : rp('triceps'))}>
          <rect x="8"  y="50" width="11" height="36" rx="5" />
          <rect x="81" y="50" width="11" height="36" rx="5" />
        </g>

        {/* Lower torso: abs (front) / glutes (back) */}
        <g {...(face === 'front' ? rp('abs') : rp('glutes'))}>
          <rect x="34" y="72" width="32" height="36" rx="4" />
        </g>

        {/* Upper legs: quads (front) / hamstrings (back) */}
        <g {...(face === 'front' ? rp('quads') : rp('hamstrings'))}>
          <rect x="34" y="112" width="14" height="44" rx="6" />
          <rect x="52" y="112" width="14" height="44" rx="6" />
        </g>

        {/* Calves — visible in both views */}
        <g {...rp('calves')}>
          <rect x="35" y="160" width="12" height="36" rx="6" />
          <rect x="53" y="160" width="12" height="36" rx="6" />
        </g>
      </svg>
    </div>
  )
}
