// Simple SVG icons per muscle group
// Used in exercise search results and exercise list rows

const icons = {
  Chest: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 8 C4 5 7 3 10 4 L12 5 L14 4 C17 3 20 5 20 8 L20 14 C20 17 17 19 14 18 L12 17 L10 18 C7 19 4 17 4 14 Z" />
      <path d="M12 5 L12 17" />
    </svg>
  ),
  Shoulders: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="6" r="2.5" />
      <path d="M5 11 C5 8 8 7 10 8 L12 8.5 L14 8 C16 7 19 8 19 11 L19 14 C19 16 17 17 15 16 L12 15 L9 16 C7 17 5 16 5 14 Z" />
    </svg>
  ),
  Triceps: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M8 4 C6 4 5 6 5 8 L5 16 C5 18 6 20 8 20 L9 20 C10 20 11 19 11 18 L11 6 C11 5 10 4 9 4 Z" />
      <path d="M11 10 C12 8 14 7 16 8 L17 9 C18 10 18 12 17 14 L15 18 C14 19 13 20 12 19 L11 18" />
    </svg>
  ),
  Biceps: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M13 4 C15 4 16 6 16 8 L16 16 C16 18 15 20 13 20 L12 20 C11 20 10 19 10 18 L10 6 C10 5 11 4 12 4 Z" />
      <path d="M10 10 C9 8 7 7 6 8 L5 10 C4 12 5 15 7 17 L9 19 C10 20 11 19 11 18" />
    </svg>
  ),
  Back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 5 C6 5 5 8 5 12 C5 16 6 19 6 19" />
      <path d="M18 5 C18 5 19 8 19 12 C19 16 18 19 18 19" />
      <path d="M6 7 C8 6 10 5.5 12 5.5 C14 5.5 16 6 18 7" />
      <path d="M6 12 C8 11 10 10.5 12 10.5 C14 10.5 16 11 18 12" />
      <path d="M6 17 C8 16 10 15.5 12 15.5 C14 15.5 16 16 18 17" />
    </svg>
  ),
  Quads: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 3 L7 12 L8 20 L10 20 L11 13 L12 13 L13 20 L15 20 L16 12 L14 3 Z" />
      <path d="M9 3 L14 3" />
    </svg>
  ),
  Hamstrings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M10 3 C9 3 8 4 8 5 L7 12 C7 15 8 18 9 20 L11 20 C11 20 11 15 12 12 C13 15 13 20 13 20 L15 20 C16 18 17 15 17 12 L16 5 C16 4 15 3 14 3 Z" />
    </svg>
  ),
  Calves: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 2 C8 5 7 8 8 12 C9 15 9 18 9 21 L11 21 L11 14 C12 14 13 14 13 14 L13 21 L15 21 C15 18 15 15 16 12 C17 8 16 5 15 2 Z" />
    </svg>
  ),
  Abs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="9" y="4" width="6" height="4" rx="1" />
      <rect x="9" y="10" width="6" height="4" rx="1" />
      <rect x="9" y="16" width="6" height="4" rx="1" />
    </svg>
  ),
  Obliques: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M7 5 L10 10 L7 15 L10 20" />
      <path d="M17 5 L14 10 L17 15 L14 20" />
      <path d="M10 10 L14 10" />
      <path d="M10 15 L14 15" />
    </svg>
  ),
  'Full Body': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="4" r="2" />
      <path d="M12 6 L12 14" />
      <path d="M7 9 L17 9" />
      <path d="M12 14 L9 20" />
      <path d="M12 14 L15 20" />
    </svg>
  ),
}

const fallback = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8 L12 13" />
    <circle cx="12" cy="16" r="0.5" fill="currentColor" />
  </svg>
)

export default function MuscleIcon({ muscleGroup, className }) {
  return (
    <span className={className} aria-label={muscleGroup}>
      {icons[muscleGroup] ?? fallback}
    </span>
  )
}
