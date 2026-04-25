-- ================================================================
-- Sprint 7 Migration — Programs table + link workouts to program
-- Run this in: Supabase → SQL Editor → New query
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE)
-- ================================================================


-- ── 1. Programs table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS programs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  is_active  boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'programs' AND policyname = 'programs: owner full access'
  ) THEN
    CREATE POLICY "programs: owner full access" ON programs FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;


-- ── 2. Link workout_templates → programs ─────────────────────────

ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES programs(id) ON DELETE SET NULL;


-- ── 3. Ensure template_sets RLS policy exists ────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'template_sets' AND policyname = 'template_sets: owner full access'
  ) THEN
    CREATE POLICY "template_sets: owner full access"
      ON template_sets FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM   template_exercises te
          JOIN   workout_templates  t ON t.id = te.template_id
          WHERE  te.id = template_sets.template_exercise_id
            AND  t.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM   template_exercises te
          JOIN   workout_templates  t ON t.id = te.template_id
          WHERE  te.id = template_sets.template_exercise_id
            AND  t.user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- ── Done ─────────────────────────────────────────────────────────
-- New:     programs table with RLS
-- New:     workout_templates.program_id (nullable FK → programs)
-- Ensured: template_sets RLS policy present (no-op if already exists)
