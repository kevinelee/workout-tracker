# Sprint 6 — Pro Infrastructure + Landing Page

**Date**: 2026-04-25
**Branch**: `feat/sprint-6-pro-infra`
**Status**: Planning

## Goal

Lay the groundwork for a freemium model without any payment infrastructure yet. All users get full Pro access during beta (`is_pro` defaults to `true`). The gates are wired up in code so flipping to paid later is a schema default change + adding Stripe — not a refactor.

Landing page gets updated copy and a pricing section so visitors understand the model is coming.

---

## Tickets

### P0 — Foundation

| ID | Title | Status |
|----|-------|--------|
| [S6-001](tickets/S6-001-pro-flag-schema.md) | Add `is_pro` column to profiles table (default `true` for beta) | Todo |
| [S6-002](tickets/S6-002-pro-gate-hook.md) | `useProGate` hook + pro context provider | Todo |

### P1 — Landing Page

| ID | Title | Status |
|----|-------|--------|
| [S6-003](tickets/S6-005-landing-copy.md) | Update landing page copy (remove "free forever" messaging) | Todo |
| [S6-004](tickets/S6-006-pricing-section.md) | Add pricing section (Free vs Pro comparison) | Todo |

### Deferred (post-beta)

| ID | Title | Notes |
|----|-------|-------|
| S6-005 | Upgrade to Pro modal | Needed when payments go live |
| S6-006 | Stripe checkout integration | Post-beta |

---

## Build Order

```
S6-001 (schema) → S6-002 (hook)
S6-003 (copy) → S6-004 (pricing)   ← parallel
```

---

## Technical Notes

- **Beta default**: `is_pro` column defaults to `true` — all users (new and existing) get full access
- When payments go live: change default to `false`, add Stripe webhook to flip it on checkout
- `useProGate` should return `{ isPro, requirePro }` — components call `requirePro()` on locked actions; during beta it always returns `true` so no gates ever fire
- The hook is still worth building now so Sprint 7 components can use it without changes later

## Open Questions (post-beta)

- [ ] Final price point for Pro (suggested: $7/mo or $60/yr)
- [ ] Stripe or RevenueCat (if mobile becomes priority)

---

## Sprint Acceptance Criteria

- `profiles` table has `is_pro` boolean, default `true`
- Any component can call `useProGate()` and get current pro status
- Landing page no longer says "free forever" / "no paywalls"
- Landing page has a visible Free vs Pro pricing section
