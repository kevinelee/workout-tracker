# S2-002 — Tap Number to Type Value Directly

**Priority**: High
**Status**: Todo

## Problem
Reps and weight values can only be changed with the +/- stepper buttons. If a user wants to jump from 95 lbs to 225 lbs, they have to tap + many times. Typing it directly is much faster.

## Solution
Make the displayed number value tappable. Tapping it opens an inline number input (native numeric keyboard on mobile). Confirming or blurring the input commits the value.

## Behavior
- Tapping the number replaces the static `<span>` with a `<input type="number">` focused and selected
- On blur or Enter key: commit the value (clamp to min 0, round to integer)
- On Escape: revert to original value
- Applies to both SetRow (builder) and SessionSetRow (active session)
- Completed sets in session remain read-only (no tap-to-edit)

## Files Affected
- `src/components/SetRow.jsx`
- `src/components/SessionSetRow.jsx`
