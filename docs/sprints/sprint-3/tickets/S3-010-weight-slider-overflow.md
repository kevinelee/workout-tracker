---
id: S3-010
title: Weight slider/bar bleeding off the page
priority: P2
status: Todo
---

## Problem
The weight input slider or its container overflows the viewport horizontally, causing layout bleed.

## Expected Behavior
The slider is fully contained within the screen width with appropriate padding.

## Solution
- Constrain slider container with `max-width: 100%` and `overflow: hidden`.
- Ensure parent container has no negative margins or overflow issues.
- Consider replacing a wide numeric slider with a more compact control (stepper + direct input) or ensure the range input has `width: 100%` with box-sizing handled correctly.

## Files Affected
- Weight input / slider component

## Acceptance Criteria
- Slider is fully visible and usable on all iPhone screen sizes
- No horizontal scroll triggered by the slider
