# S5-002 — Cardio Exercise Field Labels

**Priority**: P1
**Status**: Todo

## What
Cardio exercises (Treadmill, Rowing Machine, Bike, etc.) currently show a single field labeled "min". This should reflect the exercise type more accurately:
- Distance-based (Treadmill, Bike): show "miles" or "km" based on unit setting
- Time-based (Rowing Machine, Jump Rope, Stair Climber): show "min"

## Fix
Add a `cardioUnit` property to cardio exercises in exerciseLibrary.js ('distance' | 'time').
In SetRow, use `unit` prop to show 'mi'/'km' vs 'min'.
Pass unit setting down through SessionScreen and ExerciseRow.
