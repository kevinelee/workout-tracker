---
id: S3-003
title: Hold/long-press selects text instead of firing action
priority: P0
status: Todo
---

## Problem
Long-pressing a button (e.g. the + weight button) triggers the browser's native text selection / callout instead of the intended long-press action. The feature appears completely broken on iOS Safari.

## Expected Behavior
Long-pressing a button fires the held action (fast increment, etc.) with no text selection or magnifier appearing.

## Solution
Add the following CSS to all interactive buttons and touch targets that have long-press behavior:
```css
user-select: none;
-webkit-user-select: none;
touch-action: none; /* or manipulation */
```
Also ensure the `touchstart`/`pointerdown` handler calls `e.preventDefault()` where appropriate, and that `context-menu` events are suppressed on those elements.

## Files Affected
- Long-press button component(s) / `useLongPress` hook
- Global button styles or Tailwind config

## Acceptance Criteria
- Holding + on a weight input increments rapidly without selecting text
- No iOS magnifier or callout appears on long-press
- Short tap still works normally
