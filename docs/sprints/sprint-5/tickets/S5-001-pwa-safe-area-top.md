# S5-001 — PWA Safe Area Top Overflow

**Priority**: P0
**Status**: Todo

## What
When installed as a PWA (Add to Home Screen), the app header bleeds under the iOS status bar because `safe-area-inset-top` is not applied. Bottom is already handled; top is missing.

## Fix
Add `padding-top: env(safe-area-inset-top)` to `.app-header` in App.css.
