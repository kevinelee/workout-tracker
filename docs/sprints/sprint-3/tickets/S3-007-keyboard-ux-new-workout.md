---
id: S3-007
title: Keyboard UX when creating a new workout
priority: P1
status: Done
---

## Problem
The keyboard experience when creating a new workout is described as "really ass" — likely the keyboard overlaps inputs, doesn't dismiss cleanly, or the layout doesn't scroll to keep the focused input visible.

## Expected Behavior
- When a text input is focused, the view scrolls so the input is visible above the keyboard.
- The keyboard can be dismissed by tapping outside or pressing Done.
- After submitting a field, focus moves logically to the next field.
- The keyboard does not obscure the Save/Create button.

## Solution
- Use `inputmode` attributes to summon the right keyboard type (text, numeric, etc.).
- Ensure the create form is inside a scrollable container.
- Add a `Done` button to the iOS keyboard via `returnKeyType="done"` or similar.
- Consider a "tap outside to dismiss" overlay handler.

## Files Affected
- New workout / create workout form component

## Acceptance Criteria
- All form fields are reachable and visible while the keyboard is open
- Keyboard dismisses on Done or outside tap
- Save button is always accessible
