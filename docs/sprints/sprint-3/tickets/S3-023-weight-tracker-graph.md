---
id: S3-023
title: Weight tracker and progress graph
priority: P3
status: Todo
---

## Problem
There's no way to track body weight over time or visualize progress (weight lifted, volume, body weight trend).

## Expected Behavior
- A dedicated "Progress" or "Stats" section lets users log their body weight.
- A line graph shows body weight trend over time.
- Optionally: per-exercise graphs showing max weight or volume over sessions.

## Solution
- Add a `body_weight_logs` table in Supabase (`user_id`, `logged_at`, `weight_kg`).
- Use a lightweight charting library (e.g. `recharts` or `chart.js`) for the graph.
- Consider a simple date-picker for logging past entries.

## Files Affected
- New Progress/Stats page component
- Supabase schema (new migration)
- Navigation (add route/tab for stats)

## Acceptance Criteria
- User can log body weight with a date
- Graph shows weight trend over the last 30/90 days
- Graph is readable on mobile
