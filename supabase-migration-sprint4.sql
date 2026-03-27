-- ================================================================
-- Sprint 4 Migration — Profile metrics + Body weight logs
-- Run this in: Supabase → SQL Editor → New query
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks)
-- ================================================================


-- ── 1. Add metric columns to profiles ────────────────────────

alter table profiles
  add column if not exists height_cm      numeric,
  add column if not exists weight_kg      numeric,
  add column if not exists age            int,
  add column if not exists gender         text,        -- 'male' | 'female' | 'other'
  add column if not exists activity_level text;        -- 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'


-- ── 2. Body weight logs ───────────────────────────────────────

create table if not exists body_weight_logs (
  id         text        primary key,   -- nanoid generated in app
  user_id    uuid        not null references auth.users(id) on delete cascade,
  weight_kg  numeric     not null,
  logged_at  timestamptz not null default now()
);

alter table body_weight_logs enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'body_weight_logs'
      and policyname = 'body_weight_logs: owner full access'
  ) then
    create policy "body_weight_logs: owner full access"
      on body_weight_logs for all
      using  (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists body_weight_logs_user_idx
  on body_weight_logs (user_id, logged_at asc);


-- ── Done ─────────────────────────────────────────────────────
-- profiles: +height_cm, +weight_kg, +age, +gender, +activity_level
-- new table: body_weight_logs
