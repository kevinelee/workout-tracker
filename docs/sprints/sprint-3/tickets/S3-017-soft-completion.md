---
id: S3-017
title: Soft completion: minimum sets as goal, extra credit beyond
priority: P2
status: Todo
---

## Problem
The current model treats the set count as a fixed target. In reality, a user might have a minimum (e.g. 3 sets) but happily do more. There's no way to express "at least N sets."

## Expected Behavior
- Each exercise has a minimum set count (the goal) and no hard maximum.
- Sets up to the minimum are shown as "required."
- Sets beyond the minimum are shown as "bonus" or "extra credit" with a distinct visual treatment.
- The exercise is considered complete once the minimum is met; additional sets are always welcome.
- The Finish flow reflects whether all exercises hit their minimum.

## Files Affected
- Exercise schema (add `min_sets` or repurpose `target_sets`)
- Set row UI in active session
- Finish/completion flow

## Acceptance Criteria
- Exercise shows as complete once minimum sets are done
- User can log additional sets beyond the minimum
- Extra sets are visually differentiated (e.g. "bonus" label or different color)
- Finish modal reflects completion status based on minimums
