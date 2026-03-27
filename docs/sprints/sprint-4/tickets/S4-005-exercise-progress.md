# S4-005 — Per-Exercise Progress Charts + Estimated 1RM

**Priority**: P1
**Status**: Todo

## What
In the History tab, users can select any exercise and see a chart of their max weight over time, plus an estimated 1RM line.

## Estimated 1RM Formula (Epley)
```
1RM = weight × (1 + reps / 30)
```
Use the best set from each session (highest estimated 1RM, not necessarily heaviest weight).

## UI
- Add an "Exercise Progress" section to HistoryScreen above the sessions list
- Exercise picker (same pill style as existing filter pills)
- Line chart with two lines:
  - Max weight logged (solid line)
  - Estimated 1RM (dashed line, slightly lighter)
- X axis: date, Y axis: weight in user's unit
- Shows last 12 sessions for that exercise by default

## Data Source
Derived entirely from existing `sessions` data — no new DB queries needed.
Loop sessions → find logs for selected exercise → extract best set per session.

## Notes
- Only show exercises that the user has actually logged
- Skip cardio exercises (no 1RM concept for distance/pace)
- "Need at least 2 sessions" empty state (same as existing VolumeChart)
