-- Migration: add max_reps to personal_records view
-- Supports reps-based PRs for bodyweight exercises (pull-ups, push-ups, etc.)
-- Removed the `weight > 0` filter so reps-only sets are included.

create or replace view personal_records as
select
  s.user_id,
  sl.exercise_id,
  max(ss.weight) as max_weight,
  max(ss.reps)   as max_reps
from session_sets   ss
join session_logs   sl on sl.id = ss.session_log_id
join sessions        s on  s.id = sl.session_id
where ss.completed = true
  and  s.status    = 'finished'
group by s.user_id, sl.exercise_id;
