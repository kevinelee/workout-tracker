# S4-003 — Body Weight Log + Progress Graph

**Priority**: P1
**Status**: Todo

## What
Section in the Profile tab where users can log their body weight and see a line graph of progress over time.

## UI
- "Log Weight" button → inline input (weight + today's date, saveable)
- Line chart (Recharts) — x: date, y: weight — with dots for each entry
- Shows last 90 days by default, scrollable/zoomable if many entries
- Each dot tappable to show exact value + date
- Option to delete an entry (swipe or long press)

## Formula Notes
- Store in kg internally, display in user's preferred unit (lbs or kg)
- Conversion: 1 kg = 2.20462 lbs
