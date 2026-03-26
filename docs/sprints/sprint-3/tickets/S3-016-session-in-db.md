---
id: S3-016
title: Track current session state in DB
priority: P2
status: Todo
---

## Problem
The active workout session is only held in local/memory state. If the user force-quits the app or the PWA is evicted from memory, the in-progress session is lost.

## Expected Behavior
- Session state (exercises, sets logged, timer, start time) is persisted to Supabase as the user progresses.
- On app load, if an incomplete session exists in the DB, it is restored.
- Completing or abandoning the session clears the in-progress record.

## Solution
- Create a `sessions` table (or reuse one) with an `in_progress` boolean and a JSON blob or related `session_sets` rows.
- Write to DB on each set completion and on session start.
- On app boot, query for any `in_progress = true` sessions for the current user and restore state.

## Files Affected
- Supabase schema (new migration)
- Session state management / hooks
- App bootstrap / auth flow

## Acceptance Criteria
- Force-quitting mid-session and reopening restores the session
- Completed sessions are no longer marked in-progress
- No duplicate sessions created on restore
