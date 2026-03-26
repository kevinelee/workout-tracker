---
id: S3-014
title: Screen flash / alert when rest timer ends
priority: P2
status: Todo
---

## Problem
When the rest timer reaches zero, there's no strong visual or audio cue. Users who aren't watching the screen miss the notification.

## Expected Behavior
- Screen flashes briefly (white or accent color) when the timer hits 0.
- Optional: a short vibration via the Vibration API.
- Optional: a soft chime sound.

## Solution
- On timer completion, briefly add a full-screen overlay with high opacity then fade out.
- `navigator.vibrate([200, 100, 200])` for haptic feedback on supported devices.
- Play a short audio tone using the Web Audio API.

## Files Affected
- Rest timer component

## Acceptance Criteria
- Timer end triggers a visible screen flash
- Haptic vibration fires on supported devices
- Flash is brief and non-disruptive to ongoing interaction
