import { useState } from 'react'
import { supabase } from '../lib/supabase'
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

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep]       = useState(0)
  const [answers, setAnswers] = useState({})
  const [dir, setDir]         = useState('forward') // 'forward' | 'back'
  const [animKey, setAnimKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

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
    if (isLast) {
      submit()
      return
    }
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
    onComplete({ answers, summary: '' })
  }

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-fitness-profile', {
        body: { answers },
      })
      if (fnError) throw fnError
      onComplete({ answers, summary: data.summary ?? '' })
    } catch (err) {
      console.error('Onboarding submit failed:', err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="onboarding">
        <div className="onboarding-generating">
          <div className="onboarding-spinner" />
          <p className="onboarding-generating-text">Building your profile…</p>
          <button className="onboarding-skip" onClick={skip}>Skip for now</button>
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding">
      {/* Progress dots */}
      <div className="onboarding-dots">
        {QUESTIONS.map((_, i) => (
          <span
            key={i}
            className={`onboarding-dot${i === step ? ' onboarding-dot--active' : i < step ? ' onboarding-dot--done' : ''}`}
          />
        ))}
      </div>

      {/* Question card */}
      <div
        key={animKey}
        className={`onboarding-card onboarding-card--${dir}`}
      >
        <h2 className="onboarding-question">{q.question}</h2>
        {q.multi && (
          <p className="onboarding-hint">Select all that apply</p>
        )}

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

        {error && (
          <>
            <p className="onboarding-error">{error}</p>
            <button className="onboarding-skip" onClick={skip}>Skip for now</button>
          </>
        )}
      </div>

      {/* Actions */}
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
    </div>
  )
}
