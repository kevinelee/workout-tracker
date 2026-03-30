# S4-008 — Weekly Schedule Preferences

**Priority**: P1
**Status**: Todo

## What

Let users set when their week starts and how many days per week they're targeting. This makes analytics (heatmap, volume charts, streaks) respect the user's actual schedule rather than assuming a 7-day obligation.

## Schema — Add to `profiles` table

- `week_start_day` (int, 0–6, default 1) — 0 = Sunday, 1 = Monday … 6 = Saturday
- `target_days_per_week` (int, 1–7, default 3)

## UI — Add to Profile Tab (Body Metrics section)

- **Week starts on**: segmented control or dropdown (Sunday / Monday)
- **Target days per week**: stepper or segmented control (1–7)
- Save on change (same pattern as other profile fields)

## How It's Used

- **Heatmap (S4-007)**: "this week" window is computed from `week_start_day`
- **Volume charts (S4-006)**: weekly buckets align to `week_start_day`
- **Streak logic**: a missed day only breaks the streak if the user was supposed to train that day relative to `target_days_per_week`

## Storage

- Add columns via Supabase migration (extend S4-001 migration or run a new one)
- `getProfile()` / `saveProfile()` already cover this — no new functions needed

## Acceptance Criteria

- User can set week start day and target days/week in the Profile tab
- Both values persist to Supabase
- Analytics views use `week_start_day` for weekly window calculations
- Streak does not penalize days outside the user's target frequency
