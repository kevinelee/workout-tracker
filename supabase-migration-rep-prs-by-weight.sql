-- Migration: personal_records_by_weight view
--
-- The existing `personal_records` view only tracks the single highest
-- weight ever lifted per exercise, so once a weight has been hit, a later
-- set at that same weight with far more reps was never recognized as a PR
-- (e.g. 35lb x 4 flags a PR the first time 35lb is hit, but a later 35lb x 8
-- never does, since 35 is not > 35).
--
-- This view tracks the best rep count ever recorded at each distinct weight
-- per exercise, so the app can additionally flag a "rep PR" whenever a set
-- beats the previous best reps at that specific weight — independent of
-- whether it's also a new all-time max weight.

create or replace view personal_records_by_weight as
select
  s.user_id,
  sl.exercise_id,
  ss.weight,
  max(ss.reps) as max_reps
from session_sets   ss
join session_logs   sl on sl.id = ss.session_log_id
join sessions        s on  s.id = sl.session_id
where ss.completed = true
  and  s.status    = 'finished'
  and  ss.weight    > 0
group by s.user_id, sl.exercise_id, ss.weight;
