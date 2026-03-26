---
id: S3-004
title: Rapid double-tap creates duplicate saves
priority: P0
status: Todo
---

## Problem
Tapping Save (or any mutation button) twice quickly creates duplicate records. Confirmed: hitting Save twice created two copies of the same entry.

## Expected Behavior
A save/submit action fires exactly once regardless of how fast the user taps. Subsequent taps while a save is in-flight are ignored.

## Solution
- Add a `loading` / `submitting` state to the handler; disable or ignore the button while the async call is pending.
- Alternatively apply a debounce (150–300 ms) on the click/tap handler.
- Visually disable or show a spinner on the button during the in-flight request.

## Files Affected
- Any component with a Save, Complete, or Create mutation button
- Shared button component if one exists

## Acceptance Criteria
- Tapping Save rapidly N times produces exactly one record
- Button is visually disabled while the request is in-flight
- No duplicate records in Supabase after double-tap
