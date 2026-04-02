-- ================================================================
-- Sprint 6 Migration — Admin user email lookup
-- Run this in: Supabase → SQL Editor → New query
-- Safe to run multiple times (uses CREATE OR REPLACE)
-- ================================================================


-- ── Secure RPC: only admins can fetch all user emails ─────────
-- Uses SECURITY DEFINER to access auth.users (normally RLS-blocked)
-- Guards against non-admin callers by checking profiles.role

CREATE OR REPLACE FUNCTION get_user_emails()
RETURNS TABLE(id uuid, email text)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  RETURN QUERY
    SELECT au.id, au.email::text
    FROM auth.users au;
END;
$$;

-- Revoke broad access, grant only to authenticated users
-- (the function itself enforces admin-only via the role check)
REVOKE ALL ON FUNCTION get_user_emails FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_emails TO authenticated;


-- ── Secure RPC: admin can fetch stats for any user ───────────

CREATE OR REPLACE FUNCTION admin_get_user_stats(target_user_id uuid)
RETURNS TABLE(
  total_sessions          bigint,
  total_duration_seconds  bigint,
  current_session_id      text,
  current_session_started_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  RETURN QUERY
    SELECT
      COUNT(*)           FILTER (WHERE status = 'finished')::bigint             AS total_sessions,
      COALESCE(SUM(duration_seconds) FILTER (WHERE status = 'finished'), 0)::bigint AS total_duration_seconds,
      MAX(id)            FILTER (WHERE status = 'active')                        AS current_session_id,
      MAX(started_at)    FILTER (WHERE status = 'active')                        AS current_session_started_at
    FROM sessions
    WHERE user_id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION admin_get_user_stats FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_user_stats TO authenticated;


-- ── Secure RPC: admin can terminate any active session ───────

CREATE OR REPLACE FUNCTION admin_terminate_session(target_session_id text)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  UPDATE sessions
  SET status      = 'abandoned',
      finished_at = now()
  WHERE id     = target_session_id
    AND status = 'active';
END;
$$;

REVOKE ALL ON FUNCTION admin_terminate_session FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_terminate_session TO authenticated;


-- ── Stale session cleanup ─────────────────────────────────────
-- Abandons any session that has been 'active' for more than 3 hours.
-- Runs as a plain function (no SECURITY DEFINER needed — called by pg_cron as postgres).

CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void
LANGUAGE sql AS $$
  UPDATE sessions
  SET status      = 'abandoned',
      finished_at = now()
  WHERE status     = 'active'
    AND started_at < now() - interval '3 hours';
$$;


-- ── One-time backfill: clean up any existing stale sessions ───
SELECT cleanup_stale_sessions();


-- ── Nightly cron: run every day at 03:00 UTC ──────────────────
-- Requires pg_cron extension. Enable it first:
--   Supabase dashboard → Database → Extensions → search "pg_cron" → Enable
--
-- If pg_cron is already enabled, this is safe to re-run (unschedules old job first).

SELECT cron.unschedule('cleanup-stale-sessions') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stale-sessions'
);

SELECT cron.schedule(
  'cleanup-stale-sessions',
  '0 3 * * *',
  $$ SELECT cleanup_stale_sessions(); $$
);


-- ── Done ─────────────────────────────────────────────────────
-- New functions:
--   get_user_emails()                    — admin-only, returns (id, email) for all auth users
--   admin_get_user_stats(user_id)        — admin-only, returns session stats for any user
--   admin_terminate_session(session_id)  — admin-only, marks an active session as abandoned
--   cleanup_stale_sessions()             — abandons active sessions older than 3 hours (cron target)
-- Cron job: cleanup-stale-sessions      — runs nightly at 03:00 UTC
