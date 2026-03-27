# S4-002 — Profile Tab

**Priority**: P0
**Status**: Todo

## What
New "Profile" tab (5th tab) showing user identity, body metrics form, and summary stats.

## Sections
1. **Avatar + name** (display_name from profiles, email from auth)
2. **Body metrics form** — height, weight, age, gender, activity level (all optional, saved on blur/change)
3. **Stats summary** — total sessions, total volume lifted, longest streak, total workout time

## Notes
- Height input: ft/in (US) or cm based on unit setting
- Weight input: lbs or kg based on unit setting
- Stats are derived from existing sessions data — no new queries needed
- Tab icon: 👤, label: "Profile"
