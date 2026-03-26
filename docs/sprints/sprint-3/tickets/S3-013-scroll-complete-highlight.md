---
id: S3-013
title: Complete button nearest timer modal highlights during scroll
priority: P2
status: Todo
---

## Problem
When the rest timer modal is visible and the user scrolls the underlying content, the Complete button closest to the modal position becomes highlighted/focused unintentionally.

## Expected Behavior
Scrolling does not trigger hover/focus/active states on buttons beneath the modal. The modal should fully intercept pointer events.

## Solution
- Ensure the timer modal overlay has `pointer-events: all` and the background content has `pointer-events: none` while the modal is open.
- Prevent scroll on the body while the modal is active (`overflow: hidden` on body).
- Check that no `:hover` CSS is triggering from scroll proximity.

## Files Affected
- Rest timer modal component
- Modal overlay / backdrop styles

## Acceptance Criteria
- Scrolling while the timer modal is open does not highlight any buttons behind it
- Modal overlay fully captures pointer events
