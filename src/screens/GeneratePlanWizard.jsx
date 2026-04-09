import { useState } from 'react'
import { muscleGroupsForTemplate } from '../utils/workout'
import './GeneratePlanWizard.css'

const DAYS_OPTIONS = [2, 3, 4, 5, 6]

const FOCUS_OPTIONS = [
  { label: 'Push', value: 'Push (chest, shoulders, triceps)' },
  { label: 'Pull', value: 'Pull (back, biceps)' },
  { label: 'Legs', value: 'Legs (quads, hamstrings, glutes)' },
  { label: 'Upper body', value: 'Upper body' },
  { label: 'Core', value: 'Core' },
  { label: 'Full body', value: 'Full body' },
  { label: 'Arms', value: 'Arms (biceps, triceps)' },
  { label: 'Cardio', value: 'Cardio' },
]


export default function GeneratePlanWizard({ onComplete, onBack, onGenerate }) {
  const [step, setStep]     = useState(0) // 0=days, 1=focus
  const [days, setDays]     = useState(null)
  const [focus, setFocus]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const [plan, setPlan]     = useState(null)

  function toggleFocus(val) {
    setFocus(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const templates = await onGenerate({ days, focus })
      if (!templates?.length) throw new Error('empty')
      setPlan(templates)
    } catch {
      setError('Could not generate your plan. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="gpw">
        <div className="gpw-generating">
          <div className="gpw-spinner" />
          <p className="gpw-generating-text">Building your {days}-day plan…</p>
        </div>
      </div>
    )
  }

  // ── Plan preview ─────────────────────────────────────────────────────────
  if (plan) {
    return (
      <div className="gpw">
        <div className="gpw-header">
          <button className="gpw-back" onClick={() => setPlan(null)}>‹</button>
          <h2 className="gpw-title">Your Plan</h2>
          <div className="gpw-header-spacer" />
        </div>

        <div className="gpw-plan-hero">
          <div className="gpw-plan-check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 12 9 17 20 6" />
            </svg>
          </div>
          <p className="gpw-plan-sub">{plan.length} workout{plan.length !== 1 ? 's' : ''} ready to go</p>
        </div>

        <div className="gpw-plan-list">
          {plan.map((t, i) => (
            <div key={i} className="gpw-plan-card">
              <div className="gpw-plan-card-num">{i + 1}</div>
              <div className="gpw-plan-card-body">
                <p className="gpw-plan-card-name">{t.name}</p>
                <p className="gpw-plan-card-meta">
                  {t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}
                  {muscleGroupsForTemplate(t) && <span> · {muscleGroupsForTemplate(t)}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="gpw-error">{error}</p>}

        <div className="gpw-footer">
          <button className="gpw-primary" onClick={() => onComplete(plan)}>
            Add all to my workouts
          </button>
          <button className="gpw-ghost" onClick={() => { setPlan(null); setStep(0); setDays(null); setFocus([]) }}>
            Start over
          </button>
        </div>
      </div>
    )
  }

  // ── Step 0: Days ─────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="gpw">
        <div className="gpw-header">
          <button className="gpw-back" onClick={onBack}>‹</button>
          <h2 className="gpw-title">Generate Plan</h2>
          <div className="gpw-header-spacer" />
        </div>

        <div className="gpw-step-bar">
          <div className="gpw-step-dot gpw-step-dot--active" />
          <div className="gpw-step-line" />
          <div className="gpw-step-dot" />
        </div>

        <div className="gpw-body">
          <p className="gpw-question">How many days per week?</p>
          <div className="gpw-days-grid">
            {DAYS_OPTIONS.map(d => (
              <button
                key={d}
                className={`gpw-day-btn${days === d ? ' gpw-day-btn--active' : ''}`}
                onClick={() => setDays(d)}
              >
                <span className="gpw-day-num">{d}</span>
                <span className="gpw-day-label">day{d !== 1 ? 's' : ''}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="gpw-footer">
          <button className="gpw-primary" disabled={!days} onClick={() => setStep(1)}>
            Continue →
          </button>
        </div>
      </div>
    )
  }

  // ── Step 1: Focus ─────────────────────────────────────────────────────────
  return (
    <div className="gpw">
      <div className="gpw-header">
        <button className="gpw-back" onClick={() => setStep(0)}>‹</button>
        <h2 className="gpw-title">Generate Plan</h2>
        <div className="gpw-header-spacer" />
      </div>

      <div className="gpw-step-bar">
        <div className="gpw-step-dot gpw-step-dot--done" />
        <div className="gpw-step-line gpw-step-line--done" />
        <div className="gpw-step-dot gpw-step-dot--active" />
      </div>

      <div className="gpw-body">
        <p className="gpw-question">What do you want to prioritize?</p>
        <p className="gpw-hint">Select all that apply</p>
        <div className="gpw-focus-grid">
          {FOCUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`gpw-focus-btn${focus.includes(opt.value) ? ' gpw-focus-btn--active' : ''}`}
              onClick={() => toggleFocus(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {error && <p className="gpw-error">{error}</p>}
      </div>

      <div className="gpw-footer">
        <button className="gpw-primary" disabled={focus.length === 0} onClick={generate}>
          Generate my plan
        </button>
      </div>
    </div>
  )
}
