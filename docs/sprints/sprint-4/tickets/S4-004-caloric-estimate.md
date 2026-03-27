# S4-004 — Caloric Burn Estimate Per Workout

**Priority**: P1
**Status**: Todo

## What
Show an estimated calorie burn on the session summary screen and in session history cards.

## Formula
MET-based estimation:
```
calories = MET × weight_kg × duration_hours
```

MET values by exercise category:
- Strength training (Push/Pull/Legs/Core): MET 5.0
- Cardio (running pace): MET 9.0
- Cardio (cycling): MET 7.5
- Cardio (rowing): MET 7.0
- Mixed session: weighted average of MET values by exercise count

## Session MET Calculation
1. Look at all exercises in the session
2. Map each exercise's category to a MET value
3. Average the METs across all exercises
4. Apply formula with user's weight and session duration

## Display
- Session summary (finish modal): "~320 kcal burned"
- SessionDetailScreen: show alongside duration
- Requires user to have body weight set — if not, show "Add your weight in Profile for calorie estimates"

## Notes
- MET is a rough estimate, not medical-grade
- Add a small disclaimer: "Estimate based on MET values"
- Falls back gracefully if no weight is on file
