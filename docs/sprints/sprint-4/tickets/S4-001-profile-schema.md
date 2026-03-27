# S4-001 — Schema Migration: profiles + body_weight_logs

**Priority**: P0
**Status**: Todo

## What
Add user metric columns to the `profiles` table and create a new `body_weight_logs` table.

## Profiles Table — Add Columns
- `height_cm` (numeric, nullable)
- `weight_kg` (numeric, nullable) — most recent logged weight (denormalized for fast reads)
- `age` (int, nullable)
- `gender` ('male' | 'female' | 'other', nullable)
- `activity_level` ('sedentary' | 'light' | 'moderate' | 'active' | 'very_active', nullable)

## New Table: body_weight_logs
```sql
create table body_weight_logs (
  id text primary key default nanoid(),
  user_id uuid references auth.users not null,
  weight numeric not null,
  unit text not null default 'lbs',
  logged_at timestamptz not null default now()
);
-- RLS: user can only see/write their own rows
```

## Storage Functions to Add
- `getProfile()` — load profile row for current user
- `saveProfile(data)` — upsert profile row
- `getBodyWeightLogs()` — all logs for user, ordered by logged_at asc
- `saveBodyWeightLog(weight, unit)` — insert new log entry
- `deleteBodyWeightLog(id)` — delete a specific entry
