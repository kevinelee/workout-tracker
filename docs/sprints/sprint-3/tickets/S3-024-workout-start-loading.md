---
id: S3-024
title: Workout start button loading indicator
priority: P1
status: Done
---

## Problem
Tapping "Start" on a workout has a noticeable async delay (fetching PRs) with no feedback. The user doesn't know if their tap registered or if something broke.

## Expected Behavior
- The tapped Start button immediately shows a spinner and becomes disabled.
- Other Start buttons are also disabled during this period to prevent double-starts.
- Once the session loads, the screen transitions normally.

## Solution
- Add `startingTemplateId` state in App.jsx; set it at the top of `doStartSession`, clear it after `setActiveSession`.
- Pass it to HomeScreen; show a spinner on the matching button.

## Files Affected
- `src/App.jsx`
- `src/screens/HomeScreen.jsx`
- `src/screens/HomeScreen.css`

## Acceptance Criteria
- Tapping Start immediately gives visual feedback (spinner in button)
- Button can't be double-tapped
- Other Start buttons are disabled while loading
