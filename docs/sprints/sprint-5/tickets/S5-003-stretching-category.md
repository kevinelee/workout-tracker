# S5-003 — Stretching / Mobility Category

**Priority**: P1
**Status**: Todo

## What
Add a Stretch category to the exercise library with common stretches. Stretches are time-based (hold duration in seconds), not weight/reps.

## Exercises to add
- Hip Flexor Stretch
- Hamstring Stretch
- Quad Stretch
- Shoulder Stretch
- Chest Opener
- Pigeon Pose
- Cat-Cow
- Child's Pose
- Spinal Twist
- Calf Stretch

## Implementation
- New category: 'Stretch', muscleGroup: relevant body part
- In SetRow: when isStretch, show a single "sec" stepper (seconds hold)
- MuscleIcon: add a stretch icon
- Exclude from 1RM and calorie MET calculations
- MET for stretching: 2.5 (light mobility work)
