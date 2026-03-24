import './HomeScreen.css'

export default function HomeScreen({ templates, onNew, onEdit, onStart }) {
  return (
    <div className="home">
      <div className="home-header">
        <h2 className="home-title">My Workouts</h2>
        <button className="home-new-btn" onClick={onNew}>+ New</button>
      </div>

      {templates.length === 0 ? (
        <div className="home-empty">
          <p className="home-empty-icon">🏋️</p>
          <p className="home-empty-text">No workouts yet.</p>
          <p className="home-empty-sub">Tap <strong>+ New</strong> to build your first one.</p>
        </div>
      ) : (
        <ul className="home-list">
          {templates.map(t => (
            <li key={t.id}>
              <div className="home-card">
                <div className="home-card-info">
                  <p className="home-card-name">{t.name}</p>
                  <p className="home-card-meta">
                    {t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="home-card-actions">
                  <button
                    className="home-edit-btn"
                    onClick={() => onEdit(t)}
                    aria-label="Edit workout"
                  >
                    ✏️
                  </button>
                  <button
                    className="home-start-btn"
                    onClick={() => onStart(t)}
                  >
                    Start
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
