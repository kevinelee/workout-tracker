---
id: S3-020
title: Drag and drop to reorder workout exercises
priority: P3
status: Done
---

## Problem
The order of exercises in a workout template is fixed after creation. Users need a way to reorder without deleting and re-adding.

## Expected Behavior
- In workout edit mode, each exercise row has a drag handle.
- Dragging reorders exercises in the list.
- New order is saved to the workout template.

## Solution
Consider using `@dnd-kit/core` or a similar touch-friendly drag-and-drop library.

## Files Affected
- Workout edit / exercise list component
- Workout schema (add `order` / `position` field to exercise rows)

## Acceptance Criteria
- Exercises can be reordered via drag on touch devices
- Order persists after saving
- Drag handle is clearly visible and touch-friendly
