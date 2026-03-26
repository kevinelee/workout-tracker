# S2-003 — Long-Press + Button for Fast Weight Increment

**Priority**: Medium
**Status**: Todo

## Problem
The + button for lbs/kg currently increments by 5 in the builder (SetRow) and by 5 in the session (SessionSetRow). This makes it awkward to fine-tune weights. Users want:
- Single tap = +1 (precise control)
- Hold = rapid acceleration (skip large distances quickly)

## Solution
Change single-press increment to 1. Add long-press logic: after ~400ms hold, start an interval that fires every 80ms. After another ~1s of holding, speed up further (every 40ms).

## Behavior
- Tap: +1 / -1
- Hold 400ms: begin rapid fire at 80ms interval
- Hold 1.4s total: accelerate to 40ms interval
- Releasing pointer cancels the interval immediately
- Applies to both weight + and − buttons in SetRow and SessionSetRow
- Reps keeps single-step only (no long-press needed)

## Implementation Notes
- Use `onPointerDown` / `onPointerUp` / `onPointerLeave` to handle start/stop
- Store interval ref in `useRef` inside the button or parent component
- Wrap in a reusable `<HoldButton>` component to avoid duplicating logic

## Files Affected
- `src/components/HoldButton.jsx` (new)
- `src/components/SetRow.jsx`
- `src/components/SessionSetRow.jsx`
