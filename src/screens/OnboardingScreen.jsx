import { useState } from 'react'
import { supabase, callFunction } from '../lib/supabase'
import { defaultExercises } from '../data/exerciseLibrary'
import { muscleGroupsForTemplate } from '../utils/workout'
import './OnboardingScreen.css'

const QUESTIONS = [
  {
    id: 'goal',
    question: "What's your main fitness goal?",
    multi: false,
    options: [
      { label: 'Build muscle', value: 'Build muscle' },
      { label: 'Lose weight', value: 'Lose weight' },
      { label: 'Get stronger', value: 'Get stronger' },
      { label: 'Improve endurance', value: 'Improve endurance' },
      { label: 'Stay healthy & active', value: 'Stay healthy & active' },
    ],
  },
  {
    id: 'experience',
    question: 'How long have you been lifting?',
    multi: false,
    options: [
      { label: 'Just starting out', value: 'Just starting out (beginner)' },
      { label: 'Under a year', value: 'Under 1 year of experience' },
      { label: '1–3 years', value: '1–3 years of experience (intermediate)' },
      { label: '3+ years', value: '3+ years of experience (advanced)' },
    ],
  },
  {
    id: 'frequency',
    question: 'How many days per week can you train?',
    multi: false,
    options: [
      { label: '2–3 days', value: '2–3 days per week' },
      { label: '4–5 days', value: '4–5 days per week' },
      { label: '6+ days', value: '6+ days per week' },
    ],
  },
  {
    id: 'equipment',
    question: 'What equipment do you have access to?',
    multi: true,
    options: [
      { label: 'Full commercial gym', value: 'Full commercial gym' },
      { label: 'Barbell & rack', value: 'Barbell & rack' },
      { label: 'Dumbbells & cables', value: 'Dumbbells & cables' },
      { label: 'Bodyweight only', value: 'Bodyweight only' },
    ],
  },
  {
    id: 'focus',
    question: 'Which areas do you want to focus on?',
    multi: true,
    options: [
      { label: 'Upper body', value: 'Upper body' },
      { label: 'Lower body', value: 'Lower body' },
      { label: 'Core', value: 'Core' },
      { label: 'Full body', value: 'Full body' },
    ],
  },
]

const exerciseLibrary = defaultExercises.map(e => ({
  id: e.id, name: e.name, category: e.category, muscleGroup: e.muscleGroup,
}))


export default function OnboardingScreen({ onComplete, unit = 'lbs' }) {
  const [step, setStep]               = useState(0)
  const [answers, setAnswers]         = useState({})
  const [dir, setDir]                 = useState('forward')
  const [animKey, setAnimKey]         = useState(0)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [planTemplates, setPlanTemplates] = useState(null) // null = not generated yet

  const q = QUESTIONS[step]
  const isLast = step === QUESTIONS.length - 1

  const current = answers[q.id]
  const hasAnswer = q.multi
    ? Array.isArray(current) && current.length > 0
    : current != null

  function toggle(value) {
    if (q.multi) {
      setAnswers(prev => {
        const arr = Array.isArray(prev[q.id]) ? prev[q.id] : []
        return {
          ...prev,
          [q.id]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
        }
      })
    } else {
      setAnswers(prev => ({ ...prev, [q.id]: value }))
    }
  }

  function next() {
    if (!hasAnswer) return
    if (isLast) { submit(); return }
    setDir('forward')
    setAnimKey(k => k + 1)
    setStep(s => s + 1)
  }

  function back() {
    if (step === 0) return
    setDir('back')
    setAnimKey(k => k + 1)
    setStep(s => s - 1)
  }

  function skip() {
    onComplete({ answers, summary: '', templates: [] })
  }

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      await supabase.auth.refreshSession()

      const [profileRes, planRes] = await Promise.all([
        callFunction('generate-fitness-profile', { answers }),
        callFunction('generate-workout-plan', { mode: 'split', answers, exerciseLibrary, unit }),
      ])

      if (profileRes.error) throw profileRes.error

      const summary   = profileRes.data?.summary ?? ''
      const templates = planRes.data?.templates ?? []

      setLoading(false)
      setPlanTemplates({ summary, templates })
    } catch (err) {
      console.error('Onboarding submit failed:', err)
      setLoading(false)
      setError('Could not generate your profile. You can skip for now.')
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="onboarding">
        <div className="onboarding-generating">
          <div className="onboarding-spinner" />
          <p className="onboarding-generating-text">Building your plan…</p>
        </div>
      </div>
    )
  }

  // ── Plan preview ─────────────────────────────────────────────────────────
  if (planTemplates) {
    const { summary, templates } = planTemplates
    return (
      <div className="onboarding onboarding--plan">
        <div className="ob-plan-hero">
          <div className="ob-plan-check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 12 9 17 20 6" />
            </svg>
          </div>
          <h2 className="ob-plan-title">Your plan is ready</h2>
          {templates.length > 0 && (
            <p className="ob-plan-sub">{templates.length} workout{templates.length !== 1 ? 's' : ''} tailored to your goals</p>
          )}
        </div>

        {templates.length > 0 ? (
          <div className="ob-plan-list">
            {templates.map((t, i) => (
              <div key={i} className="ob-plan-card">
                <p className="ob-plan-card-name">{t.name}</p>
                <p className="ob-plan-card-meta">
                  {t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}
                  {muscleGroupsForTemplate(t) && <span> · {muscleGroupsForTemplate(t)}</span>}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="ob-plan-empty">Plan generation failed — you can build your own workouts anytime.</p>
        )}

        <div className="onboarding-actions">
          {templates.length > 0 ? (
            <button
              className="onboarding-continue"
              onClick={() => onComplete({ answers, summary, templates })}
            >
              Add to My Workouts
            </button>
          ) : (
            <button
              className="onboarding-continue"
              onClick={() => onComplete({ answers, summary, templates: [] })}
            >
              Continue
            </button>
          )}
        </div>
        <button className="onboarding-skip" onClick={() => onComplete({ answers, summary, templates: [] })}>
          Skip for now
        </button>
      </div>
    )
  }

  // ── Questions ────────────────────────────────────────────────────────────
  return (
    <div className="onboarding">
      <div className="onboarding-dots">
        {QUESTIONS.map((_, i) => (
          <span
            key={i}
            className={`onboarding-dot${i === step ? ' onboarding-dot--active' : i < step ? ' onboarding-dot--done' : ''}`}
          />
        ))}
      </div>

      <div key={animKey} className={`onboarding-card onboarding-card--${dir}`}>
        <h2 className="onboarding-question">{q.question}</h2>
        {q.multi && <p className="onboarding-hint">Select all that apply</p>}

        <div className="onboarding-options">
          {q.options.map(opt => {
            const selected = q.multi
              ? Array.isArray(current) && current.includes(opt.value)
              : current === opt.value
            return (
              <button
                key={opt.value}
                className={`onboarding-option${selected ? ' onboarding-option--selected' : ''}`}
                onClick={() => toggle(opt.value)}
              >
                <span className="onboarding-option-check">
                  {selected && (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 8 6.5 11.5 13 4.5" />
                    </svg>
                  )}
                </span>
                {opt.label}
              </button>
            )
          })}
        </div>

        {error && <p className="onboarding-error">{error}</p>}
      </div>

      <div className="onboarding-actions">
        {step > 0 && (
          <button className="onboarding-back" onClick={back}>Back</button>
        )}
        <button
          className="onboarding-continue"
          onClick={next}
          disabled={!hasAnswer}
        >
          {isLast ? 'Finish' : 'Continue'}
        </button>
      </div>
      {(step === 0 || isLast || error) && (
        <button className="onboarding-skip" onClick={skip}>
          Skip for now{step === 0 && <span className="onboarding-skip-sub">You can set this up in your profile later.</span>}
        </button>
      )}
    </div>
  )
}
