---
id: S3-011
title: Different units for cardio exercises
priority: P2
status: Todo
---

## Problem
Cardio exercises (running, cycling, rowing, etc.) need different tracking fields than strength exercises. Currently the app likely only shows weight/reps, which doesn't make sense for cardio.

## Expected Behavior
Cardio exercises support relevant fields such as:
- Duration (minutes/seconds)
- Distance (miles or km, user-selectable unit)
- Pace (min/mile or min/km)
- Calories (optional)

Non-cardio exercises are unaffected.

## Solution
- Add an `exercise_type` field to exercises (strength vs cardio).
- Conditionally render the appropriate input fields based on type.
- Store unit preference (imperial/metric) in user settings.

## Files Affected
- Exercise schema / Supabase table
- Exercise input component in active session
- My Exercises / exercise creation form

## Acceptance Criteria
- Cardio exercises show duration/distance/pace fields instead of weight/reps
- Unit (miles vs km) is configurable in settings
- Existing strength exercises are unaffected
