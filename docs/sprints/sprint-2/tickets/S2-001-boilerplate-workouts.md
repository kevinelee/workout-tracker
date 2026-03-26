# S2-001 — Boilerplate Starter Workouts

**Priority**: High
**Status**: Todo

## Problem
New users land on an empty home screen with no guidance. They have to know what exercises to add before they can do anything. High friction on day one.

## Solution
Add a set of pre-built starter templates. When a user has no templates, show a "Quick Start" section with common beginner-friendly programs they can load with one tap.

## Starter Templates to Include
- **Push Day** — Bench Press, Overhead Press, Tricep Pushdown, Lateral Raises
- **Pull Day** — Barbell Row, Lat Pulldown, Bicep Curl, Face Pulls
- **Leg Day** — Squat, Romanian Deadlift, Leg Press, Calf Raises
- **Full Body** — Squat, Bench Press, Barbell Row, Overhead Press, Deadlift
- **Upper Body** — Bench Press, Overhead Press, Barbell Row, Bicep Curl, Tricep Pushdown
- **Core & Cardio** — Plank, Crunches, Russian Twists, Treadmill

## Behavior
- Shown as a "Quick Start" card section below the empty state on HomeScreen
- Each option is a one-tap button that creates the template and takes the user to the builder to review/edit before saving
- Once the user has at least one template, the Quick Start section is hidden

## Files Affected
- `src/data/starterTemplates.js` (new)
- `src/screens/HomeScreen.jsx`
- `src/screens/HomeScreen.css`
