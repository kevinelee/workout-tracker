# S2-005 — Fix Delete Workout Bug + Confirmation Modal

**Priority**: High
**Status**: Todo

## Problem
Two issues:
1. Deleting a workout from the builder calls `deleteTemplate()` in storage then calls `onBack()` (which is `goHome()`). But `goHome()` does not call `refreshData()`, so the templates list in React state is stale — the deleted card still appears on the home screen until the user refreshes the page.
2. There's no "are you sure?" confirmation before deletion, making it easy to accidentally delete a workout.

## Root Cause
In `App.jsx`, only `handleSaveTemplate` calls `refreshData()` before navigating home. Delete just calls `goHome()` directly via `onBack`.

## Solution
1. Add `onDelete` prop to `WorkoutBuilderScreen` in `App.jsx` that calls `refreshData()` then `goHome()`.
2. Add a simple confirmation modal in `WorkoutBuilderScreen` — show it when Delete is tapped, confirm/cancel before calling `onDelete`.

## Files Affected
- `src/App.jsx`
- `src/screens/WorkoutBuilderScreen.jsx`
- `src/screens/WorkoutBuilderScreen.css`
