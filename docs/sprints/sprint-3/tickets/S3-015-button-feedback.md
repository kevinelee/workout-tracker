---
id: S3-015
title: More user feedback on button press (haptics + visual)
priority: P2
status: Todo
---

## Problem
Buttons lack tactile and visual feedback on press, making the app feel unresponsive — especially on mobile where there's no cursor hover state.

## Expected Behavior
- Tapping any primary action button triggers a brief haptic pulse.
- Buttons show a clear pressed/active visual state (scale down, color shift, or ripple).

## Solution
- `navigator.vibrate(10)` on touchstart for light tap feedback.
- Add `active:scale-95 transition-transform` (Tailwind) to button classes for a subtle press animation.
- Ensure `:active` pseudo-class styles are defined for touch devices (`:active` works on mobile, `:hover` does not without a mouse).

## Files Affected
- Shared button component or global button styles
- Primary action buttons throughout the app

## Acceptance Criteria
- Tapping a button gives immediate visual feedback (scale or color)
- Haptic pulse fires on tap (where supported)
- Feedback is subtle — not distracting
