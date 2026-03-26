-- ================================================================
-- Workout Tracker — Full Supabase Schema
-- Run this entire file in: Supabase → SQL Editor → New query
-- ================================================================


-- ── Helpers ──────────────────────────────────────────────────

-- Generic updated_at trigger (reused on every table that has it)
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ── 1. Profiles ───────────────────────────────────────────────
-- Public info about each user; auto-created on signup.

create table if not exists profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  role         text        not null default 'user',  -- 'user' | 'admin'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: owner full access"
  on profiles for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();


-- ── 2. Settings ───────────────────────────────────────────────
-- One row per user; auto-created on signup.

create table if not exists settings (
  user_id             uuid    primary key references auth.users(id) on delete cascade,
  unit                text    not null default 'lbs',      -- 'lbs' | 'kg'
  theme               text    not null default 'dark',     -- 'dark' | 'light' | 'amoled'
  controller_side     text    not null default 'right',    -- 'left' | 'right'
  rest_timer_duration int     not null default 90,         -- seconds; 0 = off
  check_in_enabled    boolean not null default true,
  updated_at          timestamptz not null default now()
);

alter table settings enable row level security;

create policy "settings: owner full access"
  on settings for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger settings_updated_at
  before update on settings
  for each row execute function set_updated_at();


-- ── 3. Custom Exercises ───────────────────────────────────────
-- User-defined exercises that extend the built-in library.

create table if not exists custom_exercises (
  id           text        primary key,   -- nanoid generated in app
  user_id      uuid        not null references auth.users(id) on delete cascade,
  name         text        not null,
  category     text        not null,      -- 'Push'|'Pull'|'Legs'|'Core'|'Cardio'
  muscle_group text        not null,
  created_at   timestamptz not null default now()
);

alter table custom_exercises enable row level security;

create policy "custom_exercises: owner full access"
  on custom_exercises for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists custom_exercises_user_idx on custom_exercises (user_id);


-- ── 4. Workout Templates ──────────────────────────────────────
-- Named workout plans ("Push Day", "Full Body", etc.)

create table if not exists workout_templates (
  id         text        primary key,   -- nanoid
  user_id    uuid        not null references auth.users(id) on delete cascade,
  name       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table workout_templates enable row level security;

create policy "workout_templates: owner full access"
  on workout_templates for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists workout_templates_user_idx on workout_templates (user_id);

create trigger workout_templates_updated_at
  before update on workout_templates
  for each row execute function set_updated_at();


-- ── 5. Template Exercises ─────────────────────────────────────
-- Ordered exercises within a template.

create table if not exists template_exercises (
  id          text primary key,   -- nanoid
  template_id text not null references workout_templates(id) on delete cascade,
  exercise_id text not null,      -- built-in string id OR custom_exercises.id
  position    int  not null default 0,
  notes       text not null default ''
);

alter table template_exercises enable row level security;

-- Access granted through the parent template (same user)
create policy "template_exercises: owner full access"
  on template_exercises for all
  using (
    exists (
      select 1 from workout_templates t
      where t.id = template_exercises.template_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workout_templates t
      where t.id = template_exercises.template_id
        and t.user_id = auth.uid()
    )
  );

create index if not exists template_exercises_template_idx on template_exercises (template_id);


-- ── 6. Template Sets ──────────────────────────────────────────
-- Default rep/weight targets for each exercise in a template.

create table if not exists template_sets (
  id                   text    primary key,   -- nanoid
  template_exercise_id text    not null references template_exercises(id) on delete cascade,
  position             int     not null default 0,
  reps                 int     not null default 0,
  weight               numeric not null default 0
);

alter table template_sets enable row level security;

create policy "template_sets: owner full access"
  on template_sets for all
  using (
    exists (
      select 1
      from template_exercises te
      join workout_templates t on t.id = te.template_id
      where te.id = template_sets.template_exercise_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from template_exercises te
      join workout_templates t on t.id = te.template_id
      where te.id = template_sets.template_exercise_id
        and t.user_id = auth.uid()
    )
  );

create index if not exists template_sets_exercise_idx on template_sets (template_exercise_id);


-- ── 7. Sessions ───────────────────────────────────────────────
-- Each workout attempt, active or finished.

create table if not exists sessions (
  id               text        primary key,   -- nanoid
  user_id          uuid        not null references auth.users(id) on delete cascade,
  template_id      text        references workout_templates(id) on delete set null,
  started_at       timestamptz not null,
  finished_at      timestamptz,
  duration_seconds int,
  status           text        not null default 'active',  -- 'active' | 'finished' | 'abandoned'
  pr_map           jsonb       not null default '{}'       -- { [exerciseId]: maxWeight }
);

alter table sessions enable row level security;

create policy "sessions: owner full access"
  on sessions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists sessions_user_idx        on sessions (user_id);
create index if not exists sessions_template_idx    on sessions (template_id);
create index if not exists sessions_status_idx      on sessions (user_id, status);
create index if not exists sessions_finished_at_idx on sessions (user_id, finished_at desc);


-- ── 8. Session Logs ───────────────────────────────────────────
-- One row per exercise per session.

create table if not exists session_logs (
  id          text primary key,   -- nanoid
  session_id  text not null references sessions(id) on delete cascade,
  exercise_id text not null,
  position    int  not null default 0,
  notes       text not null default ''
);

alter table session_logs enable row level security;

create policy "session_logs: owner full access"
  on session_logs for all
  using (
    exists (
      select 1 from sessions s
      where s.id = session_logs.session_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from sessions s
      where s.id = session_logs.session_id
        and s.user_id = auth.uid()
    )
  );

create index if not exists session_logs_session_idx on session_logs (session_id);


-- ── 9. Session Sets ───────────────────────────────────────────
-- Individual sets logged during a session.
-- These are the source of truth for PRs and volume data.

create table if not exists session_sets (
  id             text    primary key,   -- nanoid
  session_log_id text    not null references session_logs(id) on delete cascade,
  position       int     not null default 0,
  reps           int     not null default 0,
  weight         numeric not null default 0,
  completed      boolean not null default false,
  is_pr          boolean not null default false
);

alter table session_sets enable row level security;

create policy "session_sets: owner full access"
  on session_sets for all
  using (
    exists (
      select 1
      from session_logs sl
      join sessions s on s.id = sl.session_id
      where sl.id = session_sets.session_log_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from session_logs sl
      join sessions s on s.id = sl.session_id
      where sl.id = session_sets.session_log_id
        and s.user_id = auth.uid()
    )
  );

create index if not exists session_sets_log_idx on session_sets (session_log_id);


-- ── 10. Check-Ins ─────────────────────────────────────────────
-- One row per day the user checks in.

create table if not exists check_ins (
  id      bigserial   primary key,
  user_id uuid        not null references auth.users(id) on delete cascade,
  date    date        not null,
  unique (user_id, date)
);

alter table check_ins enable row level security;

create policy "check_ins: owner full access"
  on check_ins for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists check_ins_user_idx on check_ins (user_id);


-- ── 11. Useful views ─────────────────────────────────────────

-- PR per exercise per user (max completed weight across all sessions)
create or replace view personal_records as
select
  s.user_id,
  sl.exercise_id,
  max(ss.weight) as max_weight
from session_sets   ss
join session_logs   sl on sl.id = ss.session_log_id
join sessions        s on  s.id = sl.session_id
where ss.completed = true
  and ss.weight    > 0
  and  s.status    = 'finished'
group by s.user_id, sl.exercise_id;


-- Total volume per session (sum of weight × reps for completed sets)
create or replace view session_volume as
select
  s.id      as session_id,
  s.user_id,
  s.template_id,
  s.finished_at,
  sum(ss.weight * ss.reps) as total_volume,
  count(ss.id)             as total_sets
from sessions   s
join session_logs sl on sl.session_id = s.id
join session_sets ss on ss.session_log_id = sl.id
where ss.completed = true
group by s.id, s.user_id, s.template_id, s.finished_at;


-- ── 12. Auto-create profile + settings on signup ─────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id)  values (new.id) on conflict do nothing;
  insert into public.settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ── Done ─────────────────────────────────────────────────────
-- Tables:  profiles, settings, custom_exercises,
--          workout_templates, template_exercises, template_sets,
--          sessions, session_logs, session_sets, check_ins
-- Views:   personal_records, session_volume
-- Triggers: auto-create profile+settings, auto-update updated_at
