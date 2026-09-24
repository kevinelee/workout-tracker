-- Migration: circuit workouts
--
-- A workout template with a `circuit` config runs as a timed circuit: each
-- exercise gets a work interval, then a rest showing what's up next, round
-- after round. Null means a regular set-by-set workout.
--
--   { "rounds": 3, "work": 40, "rest": 20, "roundRest": 60 }   -- seconds
--
-- Run this in: Supabase → SQL Editor → New query. Safe to run more than once.

alter table workout_templates
  add column if not exists circuit jsonb;
