# S7-001 — Programs table + link workouts to program

**Priority**: P0
**Status**: Todo

## What
Create a `programs` table and add a `program_id` foreign key to workout templates.

## Schema

```sql
create table programs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- RLS: users can only see/edit their own programs
alter table workouts add column program_id uuid references programs(id) on delete set null;
```

## Migration logic
- On first sign-in after migration: if user has workout templates and no programs, create a "My Workouts" program and assign all their templates to it
- Set that program as `is_active = true`

## Acceptance Criteria
- Table exists with correct schema and RLS policies
- All existing workout templates have a valid `program_id`
- Only one program per user can have `is_active = true` (enforced by trigger or app logic)
