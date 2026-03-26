# Sprint 3 — Bug Fixes, Core UX & Feature Depth

**Date**: 2026-03-26
**Branch**: `feat/sprint-3`
**Status**: Planning

## Goal
Address real-world gym usage feedback: fix broken core flows (finish, settings, hold, double-save, background timer), resolve layout and input issues, then layer in meaningful new features (add/remove exercises mid-session, rescind sets, cardio units, session tracking, soft completion, weight graph).

---

## Tickets

### P0 — Critical Bugs

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| [S3-001](tickets/S3-001-finish-button-broken.md) | Finish button broken | P0 | Done |
| [S3-002](tickets/S3-002-settings-broken.md) | Settings page broken | P0 | Done |
| [S3-003](tickets/S3-003-hold-selects-text.md) | Hold/long-press selects text instead of firing action | P0 | Done |
| [S3-004](tickets/S3-004-double-save-debounce.md) | Rapid double-tap creates duplicate saves | P0 | Done |
| [S3-005](tickets/S3-005-rest-timer-background.md) | Rest timer pauses when app is backgrounded | P0 | Done |

### P1 — High Priority

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| [S3-006](tickets/S3-006-safe-area-bottom.md) | Buttons too close to bottom bezel / covered by iOS bar | P1 | Done |
| [S3-007](tickets/S3-007-keyboard-ux-new-workout.md) | Keyboard UX when creating a new workout | P1 | Done |
| [S3-008](tickets/S3-008-add-remove-session-exercise.md) | Add or remove exercises from current workout session | P1 | Done |
| [S3-009](tickets/S3-009-rescind-complete.md) | Ability to rescind / undo a completed set | P1 | Done |

### P2 — Medium

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| [S3-010](tickets/S3-010-weight-slider-overflow.md) | Weight slider/bar bleeding off the page | P2 | Done |
| [S3-011](tickets/S3-011-cardio-units.md) | Different units for cardio (distance, pace, calories) | P2 | Done |
| [S3-012](tickets/S3-012-collapse-session-exercises.md) | Collapse individual exercises in current workout | P2 | Done |
| [S3-013](tickets/S3-013-scroll-complete-highlight.md) | Complete button nearest timer modal highlights during scroll | P2 | Done |
| [S3-014](tickets/S3-014-timer-flash.md) | Screen flash / alert when rest timer ends | P2 | Done |
| [S3-015](tickets/S3-015-button-feedback.md) | More user feedback on button press (haptics + visual) | P2 | Done |
| [S3-016](tickets/S3-016-session-in-db.md) | Track current session state in DB | P2 | Deferred — needs schema migration |
| [S3-017](tickets/S3-017-soft-completion.md) | Soft completion: minimum sets as goal, extra credit beyond | P2 | Done |
| [S3-018](tickets/S3-018-finish-modal-timestamps.md) | Show time started and completed in Finish modal | P2 | Done |

| [S3-024](tickets/S3-024-workout-start-loading.md) | Workout start button loading indicator | P1 | Done |
| [S3-025](tickets/S3-025-finish-button-spinner.md) | Finish button spinner instead of "Saving…" text | P1 | Done |

### P3 — Low / Enhancements

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| [S3-019](tickets/S3-019-my-exercises-collapse.md) | My Exercises title card with collapse chevron | P3 | Done |
| [S3-020](tickets/S3-020-drag-drop-reorder.md) | Drag and drop to reorder workout exercises | P3 | Done |
| [S3-021](tickets/S3-021-edit-gear-my-exercises.md) | Edit gear icon in top-right of My Exercises | P3 | Done |
| [S3-022](tickets/S3-022-joystick-touch.md) | Improve joystick touch UX | P3 | Deferred |
| [S3-023](tickets/S3-023-weight-tracker-graph.md) | Weight tracker and progress graph | P3 | Todo |

---

## Sprint Acceptance Criteria
- Finish button completes and persists a session correctly
- Settings page is fully functional
- Long-press fires actions without triggering text selection
- Tapping save/complete rapidly never creates duplicates
- Rest timer counts down while app is backgrounded
- All interactive buttons are above the iOS safe area
- Keyboard dismisses cleanly when creating a workout
- Exercises can be added/removed mid-session
- Completed sets can be rescinded
