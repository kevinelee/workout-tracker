# S7-004 — Enforce 1-program limit for free users

**Priority**: P2
**Status**: Todo
**Depends on**: S7-003, S6-002 (useProGate)

## What
Free users can only have 1 program. Attempting to create a second triggers the upgrade modal.

## Logic
- Before creating a new program, check: `programs.count >= 1 && !isPro`
- If true: call `requirePro()` → shows upgrade modal, aborts program creation
- The "New Program" option in the switcher can still be visible (to show what's possible) but fires the gate on tap

## Acceptance Criteria
- Free user with 1 program: tapping "New Program" shows upgrade modal
- Pro user: can create programs without any gate
- Gate fires before any DB write — no half-created programs
