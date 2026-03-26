# S2-007 — Session State Survives Phone Sleep / Backgrounding

**Priority**: High
**Status**: Todo

## Problem
When the phone screen locks or the browser tab is backgrounded, the JavaScript `setInterval` for the elapsed timer pauses or becomes unreliable. On return, the timer is wrong and in some browsers the entire React state may be wiped.

## Solution
Persist the active session to localStorage continuously so it can be restored:
- On session start, write initial state to `wt:activeSession` in localStorage
- On every set completion or meaningful change, update `wt:activeSession`
- Store `sessionStartedAt` as an ISO timestamp; on restore, compute elapsed from wall clock (`Date.now() - sessionStartedAt`) rather than relying on the interval count
- On `visibilitychange` (page becomes visible again), recalculate elapsed from the stored timestamp
- On session finish or abandon, clear `wt:activeSession`
- On app load, check for a stale `wt:activeSession` — if found, offer to resume or discard

## Files Affected
- `src/storage.js` (new `getActiveSession` / `saveActiveSession` / `clearActiveSession`)
- `src/screens/SessionScreen.jsx`
- `src/App.jsx`
