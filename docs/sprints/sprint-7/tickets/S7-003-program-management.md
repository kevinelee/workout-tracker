# S7-003 — Program management: create, rename, delete

**Priority**: P1
**Status**: Todo
**Depends on**: S7-002

## What
UI for creating new programs, renaming existing ones, and deleting them.

## Flows

**Create**: "New Program" option at the bottom of the switcher dropdown → modal with a name input → creates program and switches to it

**Rename**: Long-press or edit icon on a program in the dropdown → inline edit or modal

**Delete**: Destructive action in program management → confirmation modal → deletes program and reassigns its workouts to the default program (or prompts user to choose)

## Acceptance Criteria
- User can create a new program with a custom name
- User can rename any program (including the default one)
- User can delete a program — workout templates are not lost (reassigned to another program)
- Deleting the only program is not allowed (must always have at least one)
- Deleting the active program auto-switches to another program
