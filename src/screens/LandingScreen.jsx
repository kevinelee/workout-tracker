import './LandingScreen.css'

function IconClipboardCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2"/>
      <path d="M9 4a1 1 0 011-1h4a1 1 0 011 1v1H9V4z"/>
      <polyline points="9 12 11 14 15 10"/>
      <line x1="9" y1="17" x2="14" y2="17"/>
    </svg>
  )
}

function IconTrophy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h10v8a5 5 0 01-10 0V3z"/>
      <path d="M7 6H4a2 2 0 000 4h3"/>
      <path d="M17 6h3a2 2 0 010 4h-3"/>
      <line x1="12" y1="16" x2="12" y2="19"/>
      <line x1="8" y1="19" x2="16" y2="19"/>
    </svg>
  )
}

function IconSparkle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l1.8 5.4L19.2 9l-5.4 1.8L12 16.2l-1.8-5.4L4.8 9l5.4-1.8L12 2z"/>
      <path d="M19 14l.9 2.7 2.7.9-2.7.9L19 21l-.9-2.7L15.4 17.6l2.7-.9L19 14z"/>
      <path d="M5 3l.6 1.8L7.4 5.4 5.6 6 5 7.8l-.6-1.8L2.6 5.4l1.8-.6L5 3z"/>
    </svg>
  )
}

function IconTrendingUp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 18 8 12 13 15 21 6"/>
      <line x1="3" y1="21" x2="21" y2="21"/>
      <line x1="3" y1="3" x2="3" y2="21"/>
    </svg>
  )
}

function IconDumbbell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="12" x2="16" y2="12"/>
      <rect x="4" y="8.5" width="4" height="7" rx="1.5"/>
      <rect x="16" y="8.5" width="4" height="7" rx="1.5"/>
    </svg>
  )
}

function IconFlame() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c0 4.5-5 7-5 11a5 5 0 0010 0c0-4-5-6.5-5-11z"/>
      <path d="M12 12c0 2.5-2 3.5-2 5a2 2 0 004 0c0-1.5-2-2.5-2-5z"/>
    </svg>
  )
}

const FEATURES = [
  { Icon: IconClipboardCheck, title: 'Log in seconds',       desc: 'Tap to complete sets, auto-fill weights from last time, and built-in rest timers — built for the gym floor.' },
  { Icon: IconTrophy,         title: 'Automatic PRs',        desc: 'Personal records tracked as you log. Watch your all-time bests climb over time.' },
  { Icon: IconSparkle,        title: 'AI-generated plans',   desc: 'Answer 2 questions and get a full training split tailored to your goals and schedule.' },
  { Icon: IconTrendingUp,     title: 'Deep analytics',       desc: 'Volume charts, exercise progress graphs, and a workout heatmap so you always see the trend.' },
  { Icon: IconDumbbell,       title: 'Muscle tracking',      desc: "Body-mapped muscle volume shows which groups you've been hitting — and what you're skipping." },
  { Icon: IconFlame,          title: 'Streaks & goals',      desc: 'Set a weekly training target, build streaks, and get AI-powered weekly recaps to stay consistent.' },
]

export default function LandingScreen({ onGetStarted, onSignIn }) {
  return (
    <div className="landing">
      <div className="landing-scroll">
        <div className="landing-hero">
          <img src="/session.png" alt="session" className="landing-logo" />
          <h1 className="landing-title">Train smarter.<br />Get stronger.</h1>
          <p className="landing-sub">The workout tracker built for people who take their training seriously.</p>
        </div>

        <div className="landing-features-grid">
          {FEATURES.map(({ Icon, title, desc }) => (
            <div key={title} className="landing-feature-card">
              <span className="landing-feature-icon"><Icon /></span>
              <p className="landing-feature-title">{title}</p>
              <p className="landing-feature-desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="landing-actions">
        <button className="landing-cta" onClick={onGetStarted}>
          Get started free
        </button>
        <button className="landing-signin" onClick={onSignIn}>
          Already have an account? Sign in
        </button>
      </div>
    </div>
  )
}
