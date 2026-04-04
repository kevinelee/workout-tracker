-- Migration: add onboarding fields to profiles
-- Run this in the Supabase SQL editor

alter table profiles
  add column if not exists onboarding_complete    boolean not null default false,
  add column if not exists fitness_profile_summary text;
