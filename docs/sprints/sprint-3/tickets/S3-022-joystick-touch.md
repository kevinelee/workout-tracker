---
id: S3-022
title: Improve joystick touch UX
priority: P3
status: Deferred
---

## Problem
The joystick control (if present for navigating values) has touch UX issues — exact problem TBD, but reported as needing work.

## Expected Behavior
Joystick responds accurately and smoothly to touch input with no drift, mis-fires, or dead zones.

## Notes
Investigate the joystick component's touch event handling. Check for:
- Missing `touch-action: none` causing scroll conflict
- `pointermove` vs `touchmove` inconsistencies
- Incorrect coordinate calculation relative to the element

## Files Affected
- Joystick component

## Acceptance Criteria
- Joystick tracks finger position accurately
- No unintended scroll or selection while using joystick
- Works on both iOS Safari and Chrome
