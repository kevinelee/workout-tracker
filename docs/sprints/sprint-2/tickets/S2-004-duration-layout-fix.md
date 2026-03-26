# S2-004 — Fix Rest Timer Segmented Control Layout

**Priority**: Low
**Status**: Todo

## Problem
The "Default Rest Timer" section in Settings has 6 options (30s, 45s, 1m, 90s, 2m, 3m). The SegmentedControl wraps into 2 rows of 3 buttons, but the second row isn't centered — it left-aligns, making it look broken.

## Solution
Switch the segmented control to use CSS Grid with `auto-fit` columns so all items stay on one row if there's room, or wrap evenly centered if they must break.

## Files Affected
- `src/screens/SettingsScreen.css`
