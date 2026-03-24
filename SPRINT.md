# SPRINT — workout-tracker

> Track workouts and sessions with a fast, mobile-friendly UI. Side project, greenfield, Vite + React.

---

## Current Session
**Milestone**: M1 — Project Setup + Data Model
**Focus**: Scaffold Vite + React, define data model, wire up localStorage persistence
**Branch**: `feat/project-setup`

---

## Milestones

### ✅ M0 — Project Planning
- [x] Intake interview complete
- [x] SPRINT.md generated
- [x] SESSION_CONTEXT.md generated

---

### 🔄 M1 — Project Setup + Data Model
**Goal**: Working Vite + React app with a defined data shape and localStorage persistence

**Tasks**:
- [ ] Scaffold with `npm create vite@latest` (React + JS or TS)
- [ ] Define data model: `Exercise`, `WorkoutTemplate`, `Session`, `SessionLog`
- [ ] Build a `storage.js` utility (get/set/clear via localStorage)
- [ ] Basic app shell (header, nav placeholder, empty home screen)
- [ ] Commit and push to GitHub

**Acceptance Criteria**:
- App runs locally with `npm run dev`
- Can manually save/load a workout object via console
- Repo is live on GitHub

**Estimated Sessions**: 1–2

---

### ⬜ M2 — Workout Builder UI
**Goal**: User can create and manage workout templates with a fast, touch-friendly UI

**Tasks**:
- [ ] List of saved workout templates on home screen
- [ ] Create/edit workout form (name + exercises)
- [ ] Add/remove exercises from a workout
- [ ] Duplicate exercise row
- [ ] Increment/decrement sets, reps, weight inline
- [ ] Save template to localStorage

**Acceptance Criteria**:
- Can create a named workout with multiple exercises
- All quick-edit actions (increment, decrement, duplicate, delete) work on one tap
- Data persists on page refresh

**Estimated Sessions**: 2–3

---

### ⬜ M3 — Session Tracker (Active Workout)
**Goal**: User can run a live workout session from a template and log actual performance

**Tasks**:
- [ ] "Start workout" button loads a session from a template
- [ ] Per-set checkboxes (mark a set as done)
- [ ] Override reps/weight per set during session
- [ ] Timer (optional: rest timer between sets)
- [ ] "Finish workout" saves completed session to history

**Acceptance Criteria**:
- A full workout can be started, logged set-by-set, and saved
- Session stores date, duration, and all sets completed

**Estimated Sessions**: 2–3

---

### ⬜ M4 — Progress & History View
**Goal**: User can see past sessions and track improvement over time

**Tasks**:
- [ ] Session history list (sorted by date)
- [ ] Session detail view (exercises + sets logged)
- [ ] Per-exercise progress: weight/reps over time
- [ ] Simple line chart (Recharts or Chart.js)

**Acceptance Criteria**:
- Can view all past sessions
- Can see how a specific exercise has trended over the last N sessions

**Estimated Sessions**: 2

---

### ⬜ M5 — Mobile Polish + PWA
**Goal**: App feels native on mobile and can be installed to home screen

**Tasks**:
- [ ] Responsive layout (mobile-first)
- [ ] Large tap targets, swipe gestures where useful
- [ ] PWA manifest + service worker (Vite PWA plugin)
- [ ] Test on iOS Safari + Android Chrome
- [ ] App icon + splash screen

**Acceptance Criteria**:
- Installable on phone home screen
- Works fully offline (reads/writes localStorage without internet)
- UI is comfortable to use one-handed at the gym

**Estimated Sessions**: 2

---

### ⬜ M6 — Backend + Auth (Future / Monetization Prep)
**Goal**: Cloud sync and user accounts to support a paid service

**Tasks**:
- [ ] Choose backend (Supabase recommended — free tier, auth built-in, Postgres)
- [ ] User sign-up/login
- [ ] Sync localStorage data to cloud on login
- [ ] Basic subscription model (free vs. premium tiers)

**Acceptance Criteria**:
- User data persists across devices
- Architecture is in place to gate features behind a paywall

**Estimated Sessions**: 4–6

---

## Git Conventions

### Branch Naming
```
feat/short-description    ← new features
fix/short-description     ← bug fixes
chore/short-description   ← setup, deps, config
refactor/short-description
```

### Commit Format
```
type(scope): short description

Examples:
feat(builder): add duplicate exercise button
fix(storage): handle missing localStorage key
chore(deps): add recharts for progress charts
```

### Workflow (per milestone)
1. Create branch from `main`: `git checkout -b feat/your-feature`
2. Commit small and often (every logical unit of work)
3. When milestone is done: open PR → merge → delete branch
4. Never commit directly to `main`

---

## Notes
- Future monetization: keep data model clean and cloud-sync-ready from M1
- Stack: Vite + React (JS to start, migrate to TS later if needed)
- Hosting options when ready: Vercel (free), Netlify, or Expo (if going native)
