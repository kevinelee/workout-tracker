# S6-003 — Upgrade to Pro modal

**Priority**: P1
**Status**: Todo
**Depends on**: S6-002

## What
An in-app modal that appears whenever a user hits a pro-gated feature. Shows what they'll unlock and a CTA to upgrade.

## Content
- Headline: "Unlock Pro"
- 4–5 bullet points of what Pro includes (programs, analytics, AI recaps, data export, history)
- Primary CTA: "Upgrade — $7/mo" → triggers Stripe checkout (S6-004)
- Secondary: "Maybe later" → dismisses

## Acceptance Criteria
- Modal renders correctly on mobile viewport
- Triggered via `requirePro()` from S6-002
- CTA links to Stripe checkout URL (or sets flag directly in dev/test mode)
- Dismissing does not block the user from using free features
