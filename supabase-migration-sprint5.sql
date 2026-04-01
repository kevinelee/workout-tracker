-- ================================================================
-- Sprint 5 Migration — Weekly schedule preferences
-- Run this in: Supabase → SQL Editor → New query
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ================================================================


-- ── Add schedule columns to profiles ─────────────────────────

alter table profiles
  add column if not exists week_start_day       smallint    default 1,   -- 0 = Sunday, 1 = Monday
  add column if not exists target_days_per_week smallint    default 3,   -- 1–7
  add column if not exists updated_at           timestamptz not null default now();
  -- updated_at is required by the profiles_updated_at trigger


-- ── Done ─────────────────────────────────────────────────────
-- profiles: +week_start_day, +target_days_per_week, +updated_at (trigger fix)
