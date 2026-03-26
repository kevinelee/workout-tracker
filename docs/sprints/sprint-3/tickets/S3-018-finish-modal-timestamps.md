---
id: S3-018
title: Show time started and completed in Finish modal
priority: P2
status: Todo
---

## Problem
The Finish modal doesn't show when the workout started or ended, so users lose that context once they complete a session.

## Expected Behavior
The Finish modal displays:
- Started at: e.g. "10:32 AM"
- Finished at: e.g. "11:14 AM"
- Total duration: e.g. "42 min"

## Files Affected
- Session state (must store `startedAt` timestamp)
- Finish modal component

## Acceptance Criteria
- Finish modal shows start time, end time, and duration
- Times are human-readable (no epoch timestamps shown to user)
- Duration is calculated correctly
