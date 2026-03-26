---
id: S3-008
title: Add or remove exercises from current workout session
priority: P1
status: Done
---

## Problem
Once a workout session is started, there's no way to add a new exercise or remove one that was included by mistake. This forces users to either abandon the session or track things elsewhere.

## Expected Behavior
- An "Add exercise" button in the current session view opens a picker to add an exercise from the library.
- Each exercise in the session has a remove/delete option (with confirmation).
- Added exercises append to the bottom of the session list.
- Removed exercises (with no completed sets) are deleted outright; removing one with completed sets should confirm first.

## Files Affected
- Current session / active workout component
- Exercise picker / search component
- Session state management

## Acceptance Criteria
- User can add an exercise mid-session and log sets against it
- User can remove an exercise mid-session (with confirmation if sets were logged)
- Session save/finish correctly reflects the final exercise list
