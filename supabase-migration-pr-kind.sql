-- Migration: pr_kind on session_sets
--
-- `is_pr` only ever recorded that a set was *some* kind of PR, even though the
-- app already distinguishes a weight PR (heaviest ever) from a rep PR (most
-- reps ever at that weight) when it computes `is_pr` — the distinction was
-- just discarded before saving. This adds a column to keep it.
--
-- Values: 'weight' | 'reps' | 'both' | null (null when is_pr is false).

alter table session_sets
  add column if not exists pr_kind text
    check (pr_kind in ('weight', 'reps', 'both'));
