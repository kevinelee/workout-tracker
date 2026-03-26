---
id: S3-019
title: My Exercises title card with collapse chevron
priority: P3
status: Done
---

## Problem
The My Exercises section has no header-level control to collapse the entire list, which can make the home/exercises screen feel cluttered.

## Expected Behavior
- A title bar for "My Exercises" has a chevron icon on the right.
- Tapping the title bar collapses/expands the full exercise list.
- Collapsed state persists across navigations (local state is fine).

## Files Affected
- My Exercises / exercise library component

## Acceptance Criteria
- Tapping the My Exercises header collapses/expands the list
- Chevron rotates to indicate state
- Animation is smooth
