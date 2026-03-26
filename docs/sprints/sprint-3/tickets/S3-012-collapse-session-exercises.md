---
id: S3-012
title: Collapse individual exercises in current workout
priority: P2
status: Todo
---

## Problem
When a workout has many exercises, the current session view becomes very long and hard to navigate. There's no way to collapse completed exercises out of the way.

## Expected Behavior
- Each exercise card in the session has a collapse/expand toggle (chevron).
- Collapsed state shows only the exercise name and completion count (e.g. "Bench Press — 3/4 sets").
- Expanded state shows the full set list as today.
- Completed exercises auto-collapse by default (optional, consider as enhancement).

## Files Affected
- Exercise card component in active session view

## Acceptance Criteria
- Each exercise can be individually collapsed/expanded
- Collapsed card shows summary info (name + set progress)
- State resets to expanded when session is resumed
