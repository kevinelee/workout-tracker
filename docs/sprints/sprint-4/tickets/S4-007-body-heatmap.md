# S4-007 — Body Part Heatmap

**Priority**: P2
**Status**: Todo

## What
Visual front/back body silhouette in the Profile tab where muscle groups glow based on how much they've been trained this week vs last week.

## UI
- SVG body figure (front + back, side by side or toggle)
- Each muscle region highlighted with opacity proportional to volume this week
- Color: low activity = dim, high activity = bright accent
- Tap a muscle group to see volume number
- Time range: "This Week" / "Last 7 Days" / "Last 30 Days"

## Muscle Group Mapping
Map exercise muscleGroups to body regions:
| muscleGroup | Body region |
|-------------|-------------|
| Chest | Front: chest |
| Shoulders | Front/Back: shoulders |
| Triceps | Front: upper arm |
| Biceps | Front: upper arm |
| Back | Back: upper/mid back |
| Traps | Back: upper back |
| Lats | Back: mid back |
| Quads | Front: thighs |
| Hamstrings | Back: thighs |
| Glutes | Back: glutes |
| Calves | Back: lower leg |
| Abs | Front: abs |
| Full Body | All regions, low intensity |

## Implementation Notes
- SVG paths per muscle region with dynamic `fill-opacity` or `fill` color
- Use a custom SVG (can be simplified/abstract silhouette, no need for detailed anatomy)
- Volume normalization: max volume this week = 100% brightness, scale others relative
- Falls back gracefully if no recent sessions
