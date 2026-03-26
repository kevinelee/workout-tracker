# Sprint 2 — UX Polish & Session Reliability

**Date**: 2026-03-24
**Branch**: `feat/sprint-2-ux`
**Status**: Complete

## Goal
Improve day-to-day usability: onboarding for new users, better number input controls, layout bug fixes, reliable session state that survives navigation and phone sleep.

---

## Tickets

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| [S2-001](tickets/S2-001-boilerplate-workouts.md) | Boilerplate starter workouts for new users | High | Done |
| [S2-002](tickets/S2-002-tap-to-edit-number.md) | Tap number to type value directly | High | Done |
| [S2-003](tickets/S2-003-long-press-weight-increment.md) | Long-press + button for fast weight increment | Medium | Done |
| [S2-004](tickets/S2-004-duration-layout-fix.md) | Fix Rest Timer segmented control layout | Low | Done |
| [S2-005](tickets/S2-005-delete-workout-fix.md) | Fix delete workout bug + add confirmation modal | High | Done |
| [S2-006](tickets/S2-006-active-session-nav.md) | Persistent "Current Session" tab during active workout | High | Done |
| [S2-007](tickets/S2-007-session-survives-sleep.md) | Session state survives phone sleep / backgrounding | High | Done |

---

## Acceptance Criteria (Sprint Level)
- New user sees starter templates they can immediately use
- Numbers can be tapped to type a value, not just stepped
- Holding + on weight increments rapidly after a short delay
- Rest timer options display without layout issues
- Deleting a workout shows a confirmation and actually removes the card from home
- Navigating away from an active session doesn't lose progress; a tab to return is visible
- Locking phone mid-session and returning resumes with correct elapsed time and set data
