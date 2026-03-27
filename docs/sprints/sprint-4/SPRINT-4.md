# Sprint 4 — Profile, Analytics & Progress Tracking

**Date**: 2026-03-27
**Branch**: `main`
**Status**: In Progress

## Goal

Build a Profile tab and a full analytics layer — all rule-based, no API cost. Users can log their body metrics, see their weight trend, get caloric estimates per workout, and drill into per-exercise strength progress, volume trends, and a body part heatmap.

---

## Tickets

### P0 — Foundation (must ship first, everything else depends on it)

| ID | Title | Status |
|----|-------|--------|
| [S4-001](tickets/S4-001-profile-schema.md) | Schema migration: profiles + body_weight_logs | Todo |
| [S4-002](tickets/S4-002-profile-tab.md) | Profile tab: height, weight, age, gender input | Todo |

### P1 — Core Analytics

| ID | Title | Status |
|----|-------|--------|
| [S4-003](tickets/S4-003-weight-tracker.md) | Body weight log + progress graph | Todo |
| [S4-004](tickets/S4-004-caloric-estimate.md) | Caloric burn estimate per workout | Todo |
| [S4-005](tickets/S4-005-exercise-progress.md) | Per-exercise progress charts (weight over time + est. 1RM) | Todo |

### P2 — Volume & Muscle Analytics

| ID | Title | Status |
|----|-------|--------|
| [S4-006](tickets/S4-006-volume-by-muscle.md) | Volume trends by muscle group (bar chart) | Todo |
| [S4-007](tickets/S4-007-body-heatmap.md) | Body part heatmap (muscle activation visual) | Todo |

### P3 — Carry-over from Sprint 3

| ID | Title | Status |
|----|-------|--------|
| [S3-022](../sprint-3/tickets/S3-022-joystick-touch.md) | Improve joystick touch UX | Deferred |
| [S3-016](../sprint-3/tickets/S3-016-session-in-db.md) | Track current session state in DB | Deferred — schema migration |

---

## Build Order

```
S4-001 (schema) → S4-002 (profile tab) → S4-003 (weight tracker) → S4-004 (calories)
                                        → S4-005 (exercise charts)
                                        → S4-006 (volume by muscle)
                                        → S4-007 (heatmap)
```

---

## Technical Notes

- **No new dependencies** — Recharts v3.8.0 already installed, all charts use it
- **Exercises already have `muscleGroup`** — heatmap and volume-by-muscle are clean
- **Caloric estimate formula**: MET-based (MET × weight_kg × duration_hours)
  - MET values: Strength training ≈ 3.5–6, Cardio ≈ 6–10
- **Estimated 1RM formula**: Epley — `weight × (1 + reps/30)`
- **Profiles table** already exists in Supabase, just needs new columns
- **body_weight_logs** is a new table to create

---

## Sprint Acceptance Criteria

- User can enter and save height, weight, age, gender in Profile tab
- User can log body weight entries and see a line graph over time
- Every finished session shows a caloric burn estimate
- History screen shows per-exercise strength chart for any exercise
- Volume by muscle group chart renders correctly with existing session data
- Body part heatmap shows relative activation for the current week
