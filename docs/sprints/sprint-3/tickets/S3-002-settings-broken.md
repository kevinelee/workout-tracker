---
id: S3-002
title: Settings page broken
priority: P0
status: Todo
---

## Problem
The Settings page is non-functional. Exact failure mode TBD (crash, blank screen, save not persisting).

## Expected Behavior
Settings page loads, user can modify preferences, changes persist.

## Files to Investigate
- Settings component/page
- Any Supabase profile/preferences table interactions

## Acceptance Criteria
- Settings page renders without errors
- Any user preferences can be saved and persist across sessions
