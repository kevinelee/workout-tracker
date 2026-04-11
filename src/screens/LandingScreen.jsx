import './LandingScreen.css'

const FEATURES = [
  { icon: '💪', text: 'Log sets, reps, and weight in seconds' },
  { icon: '📈', text: 'Track PRs and progressive overload automatically' },
  { icon: '🔥', text: 'Build streaks and stay consistent' },
  { icon: '🤖', text: 'AI-generated workout plans tailored to you' },
]

export default function LandingScreen({ onGetStarted, onSignIn }) {
  return (
    <div className="landing">
      <div className="landing-body">
        <img src="/avg-logo.png" alt="avg" className="landing-logo" />
        <h1 className="landing-title">Train smarter.<br />Get stronger.</h1>
        <p className="landing-sub">The workout tracker built for people who take their training seriously.</p>

        <ul className="landing-features">
          {FEATURES.map(f => (
            <li key={f.text} className="landing-feature">
              <span className="landing-feature-icon">{f.icon}</span>
              <span className="landing-feature-text">{f.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="landing-actions">
        <button className="landing-cta" onClick={onGetStarted}>
          Get started — it's free
        </button>
        <button className="landing-signin" onClick={onSignIn}>
          Already have an account? Sign in
        </button>
      </div>
    </div>
  )
}
