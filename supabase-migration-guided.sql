-- Migration: guided workouts
--
-- A workout template with a `guided` plan runs in the guided player: every
-- set of an exercise, with rests between, then the next exercise — advancing
-- on its own. Null means a regular workout.
--
-- Each exercise is stored once with a set count, not once per set:
--   { "exercises": [
--       { "exerciseId": "plank", "sets": 3, "type": "hold",  "target": 30, "rest": 15 },
--       { "exerciseId": "crunch", "sets": 3, "type": "reps", "target": 15, "rest": 30 }
--   ] }
-- type: 'reps' (target = reps) | 'timed' | 'hold' (target = seconds). rest in
-- seconds. An exercise may later carry "setOverrides": [{...}, ...] for sets
-- that differ; the app already merges those.
--
-- Replaces the v1.2.0 `circuit` column: the app reads any existing circuit as
-- a guided plan and clears it the next time that workout is saved.
--
-- Run this in: Supabase → SQL Editor → New query. Safe to run more than once.

alter table workout_templates
  add column if not exists guided jsonb;
