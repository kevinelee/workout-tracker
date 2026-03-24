# SPRINT — workout-tracker

> Track workouts and sessions with a fast, mobile-friendly UI. Side project, greenfield, Vite + React.

---

## Current Session
**Milestone**: M2 — Exercise Library + Workout Builder
**Focus**: Exercise search/autocomplete, workout template creation, per-set +/- input
**Branch**: `feat/workout-builder`

---

## Milestones

### ✅ M0 — Project Planning
- [x] Intake interview complete
- [x] SPRINT.md generated
- [x] SESSION_CONTEXT.md generated

---

### ✅ M1 — Project Setup + Data Model
**Goal**: Working Vite + React app with a defined data shape and localStorage persistence

**Tasks**:
- [ ] Scaffold with `npm create vite@latest` (React + JS or TS)
- [ ] Define data model: `Exercise`, `ExerciseLibrary`, `WorkoutTemplate`, `Session`, `SessionLog`
  - `Exercise`: id, name, category (Push/Pull/Legs/Core/Cardio), muscleGroup, svgIcon, isCustom
  - `WorkoutTemplate`: id, name, exercises[], createdAt
  - `Session`: id, templateId, startedAt, finishedAt, duration, logs[]
  - `SessionLog`: exerciseId, sets[], notes
  - `Set`: reps, weight, completed, isPR
- [ ] Seed a small predefined exercise library (5–10 exercises per category)
- [ ] Build a `storage.js` utility (get/set/clear via localStorage)
- [ ] Basic app shell (header, nav placeholder, empty home screen)
- [ ] Commit and push to GitHub

**Acceptance Criteria**:
- App runs locally with `npm run dev`
- Can manually save/load a workout object via console
- Repo is live on GitHub

**Estimated Sessions**: 1–2

---

### 🔄 M2 — Exercise Library + Workout Builder
**Goal**: User can browse exercises, build workout templates, and manage them with a fast, touch-friendly UI

**Tasks**:
- [ ] Predefined exercise library with SVG muscle-group icons
- [ ] Search/autocomplete dropdown to find exercises fast
- [ ] Custom exercise creation (name, category, muscle group)
- [ ] Exercise tagged by category: Push, Pull, Legs, Core, Cardio
- [ ] List of saved workout templates on home screen
- [ ] Create/edit workout form (name + exercises)
- [ ] Add/remove exercises from a template
- [ ] Per-set rows with quick +/- buttons (avoid keyboard for numbers)
- [ ] Notes field per exercise (collapsed by default, expandable)
- [ ] Save template to localStorage

**Acceptance Criteria**:
- Can search and add exercises from library or create custom ones
- Can create a named workout with multiple exercises and sets
- All quick-edit actions (increment, decrement, add/remove) work on one tap
- Data persists on page refresh

**Estimated Sessions**: 2–3

---

### ⬜ M3 — Session Tracker (Active Workout)
**Goal**: User can run a live workout session from a template and log actual performance

**Tasks**:
- [ ] "Start workout" button loads a session from a template
- [ ] "Copy Last Session" — one tap pre-fills all exercises, sets, reps, and weight from previous session
- [ ] Per-set rows with tap-to-complete checkmark (satisfying animation)
- [ ] Override reps/weight per set inline during session (no keyboard — +/- only)
- [ ] Rest timer between sets (configurable duration)
- [ ] PR detection — flag when a new personal record is hit mid-session
- [ ] "Finish workout" saves completed session to history with date + duration

**Acceptance Criteria**:
- A full workout can be started, logged set-by-set, and saved
- Session stores date, duration, and all sets completed
- Copy Last Session pre-fills correctly from most recent matching session
- PRs are detected and flagged in real time

**Estimated Sessions**: 2–3

---

### ⬜ M3.5 — Pseudo-Controller (Joystick UI)
**Goal**: Floating game-controller-style input so the user never has to reach across the screen

**Tasks**:
- [ ] Floating controller anchored bottom-left or bottom-right (user preference)
- [ ] Directional controls: navigate between exercises and sets
- [ ] Face buttons: log set, undo, quick increment weight/reps
- [ ] Minimal thumb movement — all actions reachable without repositioning hand
- [ ] Haptic-style visual feedback on tap (pulse animation)
- [ ] Toggle controller on/off in settings

**Acceptance Criteria**:
- Full session can be logged using only the controller
- Controller side preference persists in settings
- Visual feedback is immediate and satisfying on every tap

**Estimated Sessions**: 2

---

### ⬜ M4 — Progress, PRs & Motivation
**Goal**: User can see past sessions, track improvement, and feel celebrated for hitting PRs

**Tasks**:
- [ ] Session history list (sorted by date)
- [ ] Session detail view (exercises + sets logged)
- [ ] Per-exercise volume chart over time (sets × reps × weight) — Recharts or Chart.js
- [ ] % volume increase/decrease vs last session shown inline
- [ ] PR badge system — highlights when a new personal record is hit
- [ ] PR celebration animation (confetti, badge pop, optional sound)
- [ ] Post-workout summary card — total volume, PRs hit, vs last session
- [ ] Milestone streaks — "5 sessions in a row" type badges
- [ ] Encouraging micro-copy throughout ("Nice — up 8% from last week!")
- [ ] Weekly/monthly summary view

**Acceptance Criteria**:
- Can view all past sessions and drill into any session
- PR badge pops with animation when hit
- Post-workout summary shows key stats vs last session
- Volume chart renders for any exercise with history

**Estimated Sessions**: 3

---

### ⬜ M5 — Check-In, Streaks & Accountability
**Goal**: Keep users coming back with streak tracking, check-ins, and optional social accountability

**Tasks**:
- [ ] One-tap workout check-in ("I showed up today")
- [ ] Personal streak tracker with calendar heatmap view
- [ ] Milestone streak badges ("5 in a row", "30-day streak", etc.)
- [ ] Optional buddy/share mode — send post-workout summary to a friend
- [ ] Scheduled reminder notifications (web push or native if PWA)
- [ ] Toggle check-in and accountability features on/off in settings

**Acceptance Criteria**:
- Check-in works with one tap and is reflected in streak immediately
- Heatmap shows accurate history across weeks/months
- Notifications prompt user at scheduled time (if enabled)

**Estimated Sessions**: 2

---

### ⬜ M6 — Settings, Polish + PWA
**Goal**: App feels native on mobile, is installable, and fully configurable

**Tasks**:
- [ ] Settings screen:
  - Controller side preference (left / right)
  - Unit preference (lbs / kg)
  - Dark mode (default on — optimized for gym lighting)
  - Default rest timer duration
  - Toggle check-in / accountability on or off
  - Manage custom exercises and templates
- [ ] Responsive layout (mobile-first, usable on desktop)
- [ ] Large tap targets throughout — designed for sweaty hands
- [ ] High contrast dark UI
- [ ] Smooth transitions — never feels slow or janky
- [ ] SVG muscle-group icons for fast visual scanning
- [ ] PWA manifest + service worker (Vite PWA plugin)
- [ ] Test on iOS Safari + Android Chrome
- [ ] App icon + splash screen

**Acceptance Criteria**:
- Installable on phone home screen
- Works fully offline (reads/writes localStorage without internet)
- UI is comfortable to use one-handed at the gym
- All settings persist across sessions

**Estimated Sessions**: 2–3

---

### ⬜ M7 — Backend + Auth (Future / Monetization Prep)
**Goal**: Cloud sync and user accounts to support a paid service

**Tasks**:
- [ ] Choose backend (Supabase recommended — free tier, auth built-in, Postgres)
- [ ] User sign-up/login
- [ ] Sync localStorage data to cloud on login
- [ ] Basic subscription model (free vs. premium tiers)
- [ ] Export data — CSV or JSON so users never feel locked in

**Acceptance Criteria**:
- User data persists across devices
- Architecture is in place to gate features behind a paywall
- Data export works and produces valid CSV/JSON

**Estimated Sessions**: 4–6

---

## Backlog / Radar
Features worth building eventually — not yet scheduled into a milestone:

- **Plate calculator** — given a target weight, show what plates to load on the bar (tiny feature, massive gym utility)
- **Warmup set suggestions** — auto-suggest warmup ramp based on working weight
- **Body weight logging** — optional tracking, ties into volume progress context
- **Progress ring / XP bar** — fills as you complete sets in a session

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
- UX principle: keyboard appears as rarely as possible — design for sweaty gym hands
- Dark mode is the default; high contrast is a hard requirement
