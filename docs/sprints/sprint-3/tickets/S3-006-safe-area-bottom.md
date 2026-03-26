---
id: S3-006
title: Buttons too close to bottom bezel / covered by iOS bar
priority: P1
status: Todo
---

## Problem
Action buttons near the bottom of the screen are partially hidden or too close to the iOS home indicator / browser navigation bar, making them hard or impossible to tap.

## Expected Behavior
All interactive buttons sit above the iOS safe area. No button is obscured by the system UI.

## Solution
- Use `env(safe-area-inset-bottom)` in CSS for bottom padding on fixed/sticky footer elements.
- In Tailwind, add a utility class or use `pb-safe` (if the plugin is configured) or inline `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}`.
- Ensure the `<meta name="viewport">` tag includes `viewport-fit=cover`.

## Files Affected
- Global layout / App shell
- Any fixed-bottom button bars or footers

## Acceptance Criteria
- No button is cut off or obscured by the iOS bar on iPhone with home indicator
- Tested on iPhone Safari and Chrome
