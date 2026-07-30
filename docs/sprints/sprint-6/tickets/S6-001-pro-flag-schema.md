# S6-001 — Add `is_pro` column to profiles table

**Priority**: P0
**Status**: Todo

## What
Add an `is_pro` boolean column to the existing `profiles` table in Supabase.

## Beta behavior
Default is `true` — all users (new and existing) get full Pro access during the beta testing period.

When payments go live, change the column default to `false` and let the Stripe webhook flip it on successful checkout.

## Schema

```sql
alter table profiles add column is_pro boolean not null default true;
```

## RLS
- Users can read their own `is_pro` value
- Only service role can update `is_pro` (app code never writes this directly)

## Acceptance Criteria
- Column exists with default `true`
- Existing rows are backfilled to `true`
- Users can read but not write their own `is_pro` value
