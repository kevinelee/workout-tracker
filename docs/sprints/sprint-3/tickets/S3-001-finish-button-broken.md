---
id: S3-001
title: Finish button broken
priority: P0
status: Todo
---

## Problem
The Finish button in the active session view does not work — tapping it has no effect or throws an error, preventing users from completing a workout.

## Expected Behavior
Tapping Finish opens the Finish modal (or completes the session) and persists the session record.

## Likely Cause
Unknown until investigated. Could be a missing handler, a crash in the save logic, or the button being covered by another element.

## Files to Investigate
- `src/App.jsx` — session completion handler
- Active session / current workout component
- Supabase session-save call

## Acceptance Criteria
- Tapping Finish opens the Finish modal or triggers completion flow
- Session is saved to the database
- No console errors on tap
