# Sprint 7 — Programs

**Date**: 2026-04-25
**Branch**: `feat/sprint-7-programs`
**Status**: Done

## Goal

Give users a way to organize their workout templates into named Programs. Free users get 1 program; Pro users get unlimited. The home screen gets a program switcher dropdown so switching contexts (e.g. cut vs bulk, powerlifting block vs hypertrophy block) is a single tap.

---

## Tickets

### P0 — Schema

| ID | Title | Status |
|----|-------|--------|
| [S7-001](tickets/S7-001-programs-schema.md) | Programs table + link workouts to program | Todo |

### P1 — Core UI

| ID | Title | Status |
|----|-------|--------|
| [S7-002](tickets/S7-002-program-switcher.md) | Home screen program switcher dropdown | Todo |
| [S7-003](tickets/S7-003-program-management.md) | Program management: create, rename, delete | Todo |

### P2 — Pro Gating

| ID | Title | Status |
|----|-------|--------|
| [S7-004](tickets/S7-004-pro-gate-programs.md) | Enforce 1-program limit for free users | Todo |

---

## Build Order

```
S7-001 (schema) → S7-002 (switcher) → S7-003 (management) → S7-004 (pro gate)
```

---

## Technical Notes

- New `programs` table: `id, user_id, name, created_at, is_active (bool)`
- Existing workout templates get a `program_id` foreign key (nullable = belongs to default "My Workouts" program)
- On first load, if user has no programs, auto-create a default "My Workouts" program and assign all existing templates to it
- `is_active` flag tracks which program the home screen is currently showing — only one can be active at a time
- Pro gate: before creating a 2nd program, call `requirePro()` from S6-002

## Open Questions

- [ ] Should AI-generated plans auto-create a program? (likely yes)
- [ ] Can free users see other programs in read-only mode, or is it fully hidden?

---

## Sprint Acceptance Criteria

- `programs` table exists; all existing workout templates are migrated to a default program
- Home screen shows a dropdown/switcher with the active program name
- Switching programs updates the displayed workout list immediately
- User can create a new program, rename it, and delete it (with confirmation)
- Creating a 2nd program as a free user shows the upgrade modal
- Pro users can create unlimited programs
