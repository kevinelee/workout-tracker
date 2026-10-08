-- Migration: streak pauses
--
-- A pause covers weeks that miss their goal (injury, travel) so they don't
-- break the streak. Weeks are identified by their Monday, matching the streak
-- maths in src/utils/streaks.js. end_week is the last covered week, null
-- while the pause is still running.
--
-- The limits (8 covered weeks per 52, one week of backdating from created_at)
-- are applied when the streak is computed, not here.
--
-- Run this in: Supabase → SQL Editor → New query. Safe to run more than once.

create table if not exists streak_pauses (
  id         bigserial   primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  start_week date        not null,
  end_week   date,
  reason     text,
  created_at timestamptz not null default now()
);

alter table streak_pauses enable row level security;

drop policy if exists "streak_pauses: owner full access" on streak_pauses;
create policy "streak_pauses: owner full access"
  on streak_pauses for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists streak_pauses_user_idx on streak_pauses (user_id);
