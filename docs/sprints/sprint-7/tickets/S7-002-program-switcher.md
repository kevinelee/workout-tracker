# S7-002 — Home screen program switcher dropdown

**Priority**: P1
**Status**: Todo
**Depends on**: S7-001

## What
A dropdown on the home screen that shows the active program name and lets the user switch between programs. When switched, the workout list updates to show only templates in the selected program.

## UI Spec
- Placement: top of home screen, where the current section header is
- Shows active program name + a chevron/caret to indicate it's tappable
- Tapping opens a bottom sheet or inline dropdown listing all programs
- Selecting a program: sets it as active, dismisses dropdown, re-renders workout list
- If user has only 1 program, the dropdown is still present but just shows the name (no list to switch to)

## Acceptance Criteria
- Dropdown shows correct active program name on load
- Switching programs immediately updates the displayed workout templates
- Active program persists across page refreshes (stored in DB as `is_active`)
- Works on mobile viewport without layout issues
