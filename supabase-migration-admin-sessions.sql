-- Migration: admin_get_user_sessions
-- Returns the last N sessions for a user with per-exercise set counts.
-- Admin-only (requires profiles.role = 'admin').

CREATE OR REPLACE FUNCTION admin_get_user_sessions(target_user_id uuid, limit_n int DEFAULT 5)
RETURNS TABLE(
  session_id        text,
  template_name     text,
  started_at        timestamptz,
  finished_at       timestamptz,
  status            text,
  duration_seconds  int,
  exercise_id       text,
  exercise_position int,
  sets_total        bigint,
  sets_completed    bigint
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
      s.id                                                            AS session_id,
      wt.name                                                         AS template_name,
      s.started_at,
      s.finished_at,
      s.status,
      s.duration_seconds,
      sl.exercise_id,
      sl.position                                                     AS exercise_position,
      COUNT(ss.id)                                                    AS sets_total,
      COUNT(ss.id) FILTER (WHERE ss.completed = true)                AS sets_completed
    FROM (
      SELECT * FROM sessions
      WHERE user_id = target_user_id
      ORDER BY started_at DESC
      LIMIT limit_n
    ) s
    LEFT JOIN workout_templates wt ON wt.id = s.template_id
    LEFT JOIN session_logs sl      ON sl.session_id = s.id
    LEFT JOIN session_sets ss      ON ss.session_log_id = sl.id
    GROUP BY s.id, wt.name, s.started_at, s.finished_at, s.status, s.duration_seconds,
             sl.exercise_id, sl.position
    ORDER BY s.started_at DESC, sl.position ASC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION admin_get_user_sessions FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_user_sessions TO authenticated;
