# S5-004 — Workout History Improvements

**Priority**: P1
**Status**: Todo

## What
Overhaul the History tab to surface more useful metrics and make past sessions easier to browse and analyze.

## Features

### Session Cards — richer metadata
- Show top 3 exercises by volume on each history card
- Show PR badge count directly on the card
- Show calorie estimate on card (if weight set)

### Filters & Search
- Filter by workout template (already exists, keep)
- Filter by date range: This Week / This Month / All Time
- Search sessions by exercise name (find all sessions containing "Bench Press")

### Personal Records screen
- Dedicated PR list: all exercises with their current max weight + date achieved
- Sorted by most recent PR first
- Tap an exercise to jump to its progress chart

### Session streak & consistency metrics
- Weekly summary bar: how many days trained this week vs target
- Monthly volume trend (compare this month vs last month)

## Notes
- All derived from existing sessions data, no new DB tables
- PR data already in prMap on each session
