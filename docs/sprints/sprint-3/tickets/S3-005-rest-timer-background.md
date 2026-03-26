---
id: S3-005
title: Rest timer pauses when app is backgrounded
priority: P0
status: Todo
---

## Problem
The rest timer only counts down while the web page is open and visible. Switching away from the tab or locking the phone pauses the timer, so users return to find it stuck.

## Expected Behavior
The rest timer continues to count down regardless of whether the page is visible, and the completion alert fires when the user returns (or via a notification if possible).

## Solution
- Store `timerStartedAt` (absolute timestamp) in state/localStorage rather than counting down an interval.
- On each tick (or on `visibilitychange` resume), compute `elapsed = Date.now() - timerStartedAt` and derive remaining time from that.
- When remaining time ≤ 0 on resume, immediately trigger the "timer done" state (flash, sound, etc.).
- Web Push Notification for timer end is a stretch goal.

## Files Affected
- Rest timer component / hook
- `visibilitychange` event handling

## Acceptance Criteria
- Locking phone for 90 s during a 90 s rest returns to a completed timer
- Timer does not drift visibly during normal use
