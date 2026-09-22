-- Allow 'archived' as a feedback status. Safe to re-run.
--
-- The admin dashboard's Archive action sets feedback.status = 'archived',
-- but the table's check constraint only ever allowed 'new' and 'reviewed',
-- so every archive attempt fails with:
--   new row for relation "feedback" violates check constraint "feedback_status_check"

alter table feedback drop constraint if exists feedback_status_check;
alter table feedback add constraint feedback_status_check
  check (status in ('new', 'reviewed', 'archived'));
