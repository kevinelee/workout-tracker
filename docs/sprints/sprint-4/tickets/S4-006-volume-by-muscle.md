# S4-006 — Volume Trends by Muscle Group

**Priority**: P2
**Status**: Todo

## What
Bar chart in the History tab showing total volume (lbs) per muscle group over a time range (this week / last 4 weeks / all time).

## UI
- Horizontal bar chart (easier to read long muscle group names on mobile)
- Time range toggle: "This Week" / "Last 4 Weeks" / "All Time"
- Bars sorted by volume descending
- Color-coded by category (Push = blue, Pull = purple, Legs = green, Core = yellow, Cardio = orange)

## Data Derivation
For each finished session in range:
1. For each log → look up exercise's muscleGroup
2. Sum volume (weight × reps) for completed sets
3. Group by muscleGroup

## Notes
- Uses existing `muscleGroup` field on every exercise (built-in + custom)
- "Full Body" cardio exercises count toward a "Cardio" bucket, not individual muscle groups
- No new DB queries — derived from sessions already in state
