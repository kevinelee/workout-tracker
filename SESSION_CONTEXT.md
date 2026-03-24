# SESSION CONTEXT — workout-tracker

> Paste this file into a new Claude session and say "continue project" to resume instantly.

---

## Project
**Name**: workout-tracker
**Goal**: Mobile-friendly workout tracking app with fast UI for logging sets, reps, weight. Side project with future monetization intent.
**Repo**: https://github.com/[your-username]/workout-tracker ← update after init
**Stack**: Vite + React (JavaScript), localStorage for persistence (Supabase in M6)

---

## Current Milestone
**M1 — Project Setup + Data Model** 🔄 IN PROGRESS
**Branch**: `feat/project-setup`

### Remaining Tasks
- [ ] Scaffold with `npm create vite@latest`
- [ ] Define data model (Exercise, WorkoutTemplate, Session, SessionLog)
- [ ] Build `storage.js` utility
- [ ] Basic app shell
- [ ] Commit + push to GitHub

---

## Key Decisions Made
- **Vite + React** (JS for now, can migrate to TS later)
- **localStorage first**, Supabase backend in M6 (keeps early development fast)
- **PWA in M5** — installable on phone, offline-capable
- **Monetization target**: cloud sync + premium features behind auth (M6)
- **No constraints yet** — CORS, API keys, offline all deferred

---

## Milestone Roadmap
| # | Milestone | Status |
|---|-----------|--------|
| M0 | Project Planning | ✅ DONE |
| M1 | Setup + Data Model | 🔄 IN PROGRESS |
| M2 | Workout Builder UI | ⬜ PENDING |
| M3 | Session Tracker | ⬜ PENDING |
| M4 | Progress & History | ⬜ PENDING |
| M5 | Mobile Polish + PWA | ⬜ PENDING |
| M6 | Backend + Auth | ⬜ PENDING |

---

## Known Issues / Blockers
- None yet

---

## To Resume
Paste this file into a new Claude session and say: **"continue project"**
