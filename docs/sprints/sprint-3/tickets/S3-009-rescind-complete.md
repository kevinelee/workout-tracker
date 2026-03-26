---
id: S3-009
title: Ability to rescind / undo a completed set
priority: P1
status: Done
---

## Problem
Once a set is marked complete, there's no way to undo it. Accidental taps or wrong values mean the user is stuck with bad data.

## Expected Behavior
- A completed set row has an undo / rescind affordance (e.g. long-press, swipe, or a small × icon).
- Rescinding a set returns it to the "pending" state with its previous weight/reps values intact.
- The set count updates accordingly.

## Files Affected
- Set row component in active session
- Session state management

## Acceptance Criteria
- Completed set can be rescinded back to pending state
- Weight and reps values are preserved after rescind
- Set counter / progress reflects the change immediately
