---
id: S3-025
title: Finish button shows spinner instead of "Saving…" text
priority: P1
status: Done
---

## Problem
When the Finish button is tapped, it changes to "Saving…" which is longer than "Finish", making the button wider and causing a layout jump in the sticky header.

## Expected Behavior
- The button stays the same size.
- A circular spinner replaces the label while saving, with no text.

## Solution
- Fix the button to a set width.
- When `finishing === true`, render an inline SVG spinner instead of text.
- Same treatment for the "Finish Workout" big button at the bottom.

## Files Affected
- `src/screens/SessionScreen.jsx`
- `src/screens/SessionScreen.css`

## Acceptance Criteria
- Button does not resize when transitioning to saving state
- Spinner is clearly visible
- No "Saving…" text
