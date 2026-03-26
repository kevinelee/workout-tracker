# S2-006 — Persistent "Current Session" Tab During Active Workout

**Priority**: High
**Status**: Todo

## Problem
When a user is mid-session and accidentally taps the back button (or navigates away), their session progress is lost. There's no way to return to an in-progress workout.

## Solution
- Lift active session state up to `App.jsx`
- When a session is active, show a fourth nav tab: "Session" (e.g. 🏃 icon)
- Tapping Back from the session screen returns to home WITHOUT destroying the session — the session stays alive in state
- The "Session" tab re-opens the active session at exactly where the user left off
- When the session is finished or explicitly abandoned (new "Abandon" button), clear the active session state

## Behavior
- `NAV_TABS` gains a conditional `session` tab that only appears when `activeSession !== null`
- The tab shows the session name and a small progress indicator (e.g. "3/12 sets")
- Tapping "Back" from SessionScreen no longer destroys session; it asks "Go to home? Session will still be running." or just silently keeps state
- "Abandon session" button available from within the session or from the session tab

## Files Affected
- `src/App.jsx`
- `src/screens/SessionScreen.jsx`
- `src/App.css`
