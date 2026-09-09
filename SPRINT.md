# SPRINT — workout-tracker

> Vite + React PWA, Supabase backend. This file tracks the active batch of work only.
> Superseded the old M0–M7 milestone tracker (stale — most of it already shipped; see git history for what actually happened).

---

## Active Batch: UX & Bug-Fix Sprint

Source: feature batch request, 2026-08-31. 12 items reviewed against the codebase below.
**Gamification (item 12) is intentionally excluded from this batch** — it's a separate,
long-term track with its own section at the bottom. Nothing in Phases A–C depends on it,
and it should not block or get bundled into these fixes.

Reordering vs. the original list: kept mostly as given, but pulled **Rep vs. Weight PR**
forward into Phase A — the hard part (distinguishing the two) turned out to already be
computed in code, just not persisted or displayed separately, so it's cheaper than its
original position implied. Everything else matched the given easy→hard ordering once
checked against the actual files.

**Added 2026-08-31**: three more small fixes folded into Phase A (#13-15) — AI weekly
insight using the wrong week boundary, Copy Last Session being repeatable mid-session,
and removing the low-context post-workout Share button.

---

### Phase A — Small, isolated fixes

#### 1. Disable input auto-zoom
**Understood**: iOS Safari zooms on focus for any input rendered below 16px font-size. Needs an app-wide audit, not a single fix.
**Touches**:
- Confirmed under-16px inputs so far: `.detail-set-input` (14px) in [SessionDetailScreen.css](src/screens/SessionDetailScreen.css:161), `.ex-notes` (14px) in [ExerciseRow.css](src/components/ExerciseRow.css:210), `.session-notes-input` (14px) in [SessionScreen.css](src/screens/SessionScreen.css:456)
- `.ssr-input` in [SessionSetRow.css](src/components/SessionSetRow.css:133) is already 16px — no work needed there
- Still need to check: SettingsScreen, ProfileScreen, AuthScreen, ExerciseSearch, HistoryScreen search, FeedbackModal, WeightChart, HomeScreen, NewWorkoutWizard, WorkoutBuilderScreen, SetRow.css (builder mode) — none individually confirmed yet
- [index.html](index.html:6) viewport meta already has no `maximum-scale`/`user-scalable=no`, so no pinch-zoom regression risk from that angle
**Depends on**: none
**Effort**: Small. Mechanical once the full list of offenders is enumerated — budget time for the audit itself, not the fix.

#### 2. Notes — visible/editable outside edit mode
**Understood**: confirmed exactly as described. In [SessionScreen.jsx:674](src/screens/SessionScreen.jsx:674), the notes textarea is wrapped in `{editVisible && (...)}` — it doesn't render at all outside edit mode.
**Touches**: [SessionScreen.jsx](src/screens/SessionScreen.jsx) (`editVisible` gate, `openNotes` toggle state), [SessionScreen.css](src/screens/SessionScreen.css) (`.session-notes-wrap`, `.session-notes-input`)
**Depends on**: none
**Effort**: Small. Mostly deciding the always-visible UI (inline expandable row vs. persistent field) and removing the gate.

#### 5. More sound alerts during countdowns
**Understood**: confirmed. [RestTimer.jsx](src/components/RestTimer.jsx) only calls `onDone()` at 0; [sound.js](src/utils/sound.js) has one `playChime()` used once, from [SessionScreen.jsx:780](src/screens/SessionScreen.jsx:780).
**Touches**: `RestTimer.jsx` (needs to fire callbacks at intermediate thresholds, not just 0), `sound.js` (add a distinct tick/cue sound so it doesn't sound identical to the completion chime)
**Depends on**: none
**Effort**: Small. The timer already polls every 500ms in a `setInterval`, so intermediate triggers are just extra threshold checks in the existing loop.

#### 6. Rep PR vs. Weight PR
**Understood**: distinguish "most reps at a given weight" from "heaviest weight ever."
**Key finding**: the distinction is already computed and then thrown away. In [SessionScreen.jsx:234-242](src/screens/SessionScreen.jsx:234), `isWeightPR` and `isRepPR` are calculated as separate booleans, but collapsed into a single `isPR = isWeightPR || isRepPR` before being stored on the set. The backend already supports this too — `personal_records_by_weight` (added today, see [supabase-migration-rep-prs-by-weight.sql](supabase-migration-rep-prs-by-weight.sql)) and `getPRMap()` in [storage.js:660](src/storage.js:660) already return a `repPRByWeightMap`.
**Touches**:
- Schema: `session_sets.is_pr` boolean needs to become two flags (or a `pr_type` column) — new migration
- [storage.js:464](src/storage.js:464) where `is_pr` is written
- [SessionScreen.jsx](src/screens/SessionScreen.jsx) — stop collapsing `isWeightPR`/`isRepPR`, store both
- Badge UI: `.ssr-pr-badge` in [SessionSetRow.jsx:107](src/components/SessionSetRow.jsx:107), plus the PR column in [SessionDetailScreen.jsx:324](src/screens/SessionDetailScreen.jsx:324) and `.pws-set--pr` in [PostWorkoutSummary.jsx:191](src/components/PostWorkoutSummary.jsx:191)
- "Both PR" combined badge is new visual work — currently there's only one badge state
**Depends on**: none, but needs a DB migration written and run before the UI change lands (same pattern as existing `supabase-migration-*.sql` files)
**Effort**: Small–Medium. Logic already exists; this is mostly plumbing the existing distinction through storage + three display surfaces, plus one new badge style.

#### 4. Sticky "Finish" workout button
**Understood**: confirmed. Finish only exists in-flow at [SessionScreen.jsx:743](src/screens/SessionScreen.jsx:743) (`.session-finish-inline`), no fixed/sticky version exists.
**Touches**: `SessionScreen.jsx` (needs scroll-position or `IntersectionObserver` check on the in-flow button to know when to show/hide the sticky one), `SessionScreen.css` (new fixed-position element, safe-area bottom inset — coordinate with item 8)
**Depends on**: none functionally, but shares the bottom safe-area concerns with item 8 — worth doing the safe-area audit with this in mind so the sticky button isn't re-touched twice
**Effort**: Small–Medium. The "don't duplicate when already visible" requirement needs an observer/scroll listener, which is the only non-trivial part.

#### 13. AI weekly insight — respect week-start setting, not a rolling 7 days
**Understood**: the AI breakdown complains about under-trained exercises using a trailing 7-day window, so a week that just started gets judged against days from the previous week.
**Key finding**: this isn't a missing feature, it's an inconsistency. The app already has a per-user `weekStartDay` setting (0=Sunday/1=Monday, default Monday) in the profile — see [ProfileScreen.jsx:183](src/screens/ProfileScreen.jsx:183) and `week_start_day` in [storage.js:97](src/storage.js:97) — and [HistoryScreen.jsx:81](src/screens/HistoryScreen.jsx:81)'s `getThisWeekDays(sessions, weekStartDay)` already implements the correct calendar-week boundary using it. But the two places that feed the AI weekly insight ignore that setting completely and use `Date.now() - 7 days` instead: [App.jsx:478](src/App.jsx:478) (`weekAgo`/`thisWeek`) and the duplicate logic in [ProfileScreen.jsx:127](src/screens/ProfileScreen.jsx:127).
**Recommendation**: rather than hardcoding Sunday, fix both call sites to compute "this week" the same way `getThisWeekDays` does — anchored to the user's `weekStartDay`. That's a smaller, more consistent fix than a new hardcoded convention, and if your profile is already set to Sunday, it produces exactly the behavior you're asking for. Flagging this instead of just hardcoding Sunday — say the word if you'd rather hardcode it.
**Touches**: `App.jsx` (~478-482), `ProfileScreen.jsx` (~127-132) — both call `generate-weekly-insight`; worth extracting the boundary calc into one shared helper (e.g. alongside `toWeekStartStr` in [streaks.js](src/utils/streaks.js:28)) since it's currently duplicated
**Depends on**: none
**Effort**: Small. The correct logic already exists in the codebase (`getThisWeekDays`) — this is reuse, not new design.

#### 14. Copy Last Session — should only apply once
**Understood**: confirmed exactly as described. In [SessionScreen.jsx:564](src/screens/SessionScreen.jsx:564), the "Copy last session" button's visibility is gated only on `lastSession && !copiedBanner` — and `copiedBanner` is a transient flag that resets to `false` after a 2-second `setTimeout` ([SessionScreen.jsx:192](src/screens/SessionScreen.jsx:192)). So the button reappears a couple seconds after use and can be tapped again at any point mid-session, silently overwriting whatever reps/weights the user has since entered via `updateLogsAndSync(newLogs, prMap)`.
**Touches**: `SessionScreen.jsx` — needs a persistent `hasCopied` (or similar) piece of state that permanently hides the button once used this session, separate from the transient banner-display flag
**Depends on**: none
**Effort**: Small. One extra piece of state; the copy logic itself is unchanged.

#### 15. Remove the post-workout Share button
**Understood**: remove for now — the share text is too generic to be worth keeping as-is.
**Touches**: [PostWorkoutSummary.jsx](src/components/PostWorkoutSummary.jsx) — `handleShare()` (line 89) and the `.pws-share-btn` button (line 270)
**Note**: the current text (`"Just finished {template.name}! 💪 {volume} {unit} volume..."`) is more than just "I worked out today" — it does include volume and PR count. If low-context is still the complaint after seeing this, worth deciding later whether the fix is better copy/a shareable image, or leaving it removed permanently. For now, straightforward removal.
**Depends on**: none
**Effort**: Small. Pure deletion.

---

### Phase B — Moderate, self-contained features

#### 3. Swipe-to-delete for sets
**Understood**: confirmed. The delete "✕" in [SessionSetRow.jsx:230](src/components/SessionSetRow.jsx:230) (`.ssr-delete-btn`) is a single tap, only shown in edit mode, no confirmation step.
**Touches**: `SessionSetRow.jsx`/`.css` — new swipe-gesture handling on `.ssr` row, plus a reveal-and-confirm interaction
**Note**: no gesture library in [package.json](package.json) (no `react-swipeable`, no `framer-motion`). `@dnd-kit` is present but it's built for drag-reordering, not swipe-to-reveal — likely faster to hand-roll with pointer events than to bend dnd-kit to this.
**Depends on**: none
**Effort**: Medium. Touch/pointer math + a confirm affordance that doesn't feel janky is the real work, not the deletion logic itself.

#### 7. Activity heatmap — scrollable, fewer blocks
**Understood**: confirmed the premise. [CalendarHeatmap.jsx:6-22](src/components/CalendarHeatmap.jsx:6) currently computes an *adaptive* week count (`MIN_WEEKS=4` to `MAX_WEEKS=16`) that grows with account age — it's designed to cram more in over time, the opposite of what's wanted.
**Touches**: `CalendarHeatmap.jsx` (drop the adaptive growth, fix a smaller default window), `CalendarHeatmap.css` (fixed cell size + `overflow-x: auto` instead of shrink-to-fit)
**Depends on**: none
**Effort**: Medium. Mostly CSS, but scroll-snap / "which week am I looking at" polish can expand scope if you want it to feel native rather than just technically scrollable.

#### 8. PWA safe-area / bezel spacing
**Understood**: confirmed as a recurring problem — recent commits ([d380a5c](https://github.com/kevinelee/workout-tracker/commit/d380a5c), [3099e28](https://github.com/kevinelee/workout-tracker/commit/3099e28)) already patched related `--app-height`/viewport issues, and this item describes the same family of bug (inconsistent `env(safe-area-inset-*)` usage) resurfacing.
**Touches**: [index.css](src/index.css) (`--safe-top`/`--safe-bottom` are only defined when `display-mode: standalone`, see lines 44-51), `App.css` `.app-nav` (already uses `padding-bottom: var(--safe-bottom)`), and **per-screen** back buttons — at least `.settings-back-btn` ([SettingsScreen.css](src/screens/SettingsScreen.css:15)) and `.profile-back-btn` ([ProfileScreen.css](src/screens/ProfileScreen.css:300)) are separately implemented, not shared components, so each screen's header needs auditing individually
**Depends on**: none, but do this before/alongside item 4 (sticky Finish also touches bottom safe-area) to avoid two separate passes over the same insets
**Effort**: Medium–Large. The CSS itself is simple; the cost is device-matrix testing (notch vs. Dynamic Island vs. no-notch) and the fact that this exact area has already needed multiple follow-up fixes. Use the iOS Simulator against at least two device profiles before calling it done, per the item's own acceptance criteria.

#### 9. Timer modal — minimize to ribbon
**Understood**: confirmed. Today, tapping `.rest-timer-backdrop` in [SessionScreen.jsx:772](src/screens/SessionScreen.jsx:772) fully dismisses the timer (`setRestDuration(null)`) — no minimize state exists at all.
**Touches**: `RestTimer.jsx` (needs a minimized/ribbon render mode, not just full-modal), `RestTimer.css` (ribbon layout + the morph animation between states), `SessionScreen.jsx` (backdrop tap should toggle a "minimized" flag instead of clearing `restDuration`, and the timer's internal countdown — driven by `endAtRef`, not the backdrop — should be unaffected either way)
**Note**: no animation library in the project; this will be hand-rolled CSS transitions/keyframes, consistent with how `RestTimer.css` already does its scale-in animation.
**Depends on**: none directly, but item 11 (workout screen revamp) explicitly wants this done first if feasible
**Effort**: Medium–Large. State model is simple (the countdown already survives visibility changes via `endAtRef`/timestamp math, not a running interval that could desync), but the docked-ribbon layout and a smooth modal→ribbon morph is genuine animation work.

#### 10. Dial slider for number entry
**Understood**: reps/weight currently use tap-to-edit (`EditableValue` in [SessionSetRow.jsx:5](src/components/SessionSetRow.jsx:5)) plus +/- steppers (`HoldButton` for weight, plain buttons for reps). Item asks for a dial/slider as an additional or alternative input method.
**Touches**: `SessionSetRow.jsx` (new control alongside/replacing steppers), `SessionSetRow.css`
**Note**: no slider/dial library in dependencies — custom pointer-drag math needed. Must integrate with existing kg/lbs conversion (`dispWeight`/`storeWeight` in [SessionSetRow.jsx:53-55](src/components/SessionSetRow.jsx:53)) and the cardio/stretch/"both" row variants, which already branch into several different stepper layouts — the dial needs a design decision per variant, not just the plain reps/weight case.
**Depends on**: none, but the "alongside or replacing steppers" decision affects how much of item 11's layout work is redundant if done before it
**Effort**: Medium–Large. The gesture math itself is bounded; the real cost is that `SessionSetRow` already has five distinct layout branches (plain, stretch, cardio-distance, cardio-time, "both") and the dial needs to work in each.

---

### Phase C — Design pass (gated)

#### 11. Current workout UI revamp
**Understood**: as specified — a cohesive pass on the active-workout screen once its underlying interactions have changed shape.
**Touches**: [SessionScreen.jsx](src/screens/SessionScreen.jsx) / `.css` (largest file in the set, ~800+ lines), [SessionSetRow.jsx](src/components/SessionSetRow.jsx) / `.css`
**Depends on**: 2, 3, 4, 10, and ideally 9 — matches the user's own framing. Confirmed by file overlap: every one of those items edits `SessionScreen.jsx`/`SessionSetRow.jsx` directly, so sequencing this last avoids redesigning around interactions that are about to change again.
**Effort**: Large. Explicitly scoped as "do it once, at the end of Phase A/B," not estimated as its own atomic task — treat it as a short design-focused sub-sprint once its dependencies land.

---

## Separate Track: Gamification (not part of this batch)

#### 12. Difficulty-weighted points
**Status**: Parked. Explicitly **not** to be bundled into the batch above — per-request, this needs its own spec before any implementation ticket is opened.
**Understood**: needs (a) a difficulty-per-pound scale per exercise, (b) a points formula, (c) a friend-challenge model (head-to-head vs. leaderboard vs. both), (d) resulting schema changes.
**Note**: the existing `difficultyLabel`/`difficultyDecimal` fields on exercises (e.g. [exerciseLibrary.js:57](src/data/exerciseLibrary.js:57), used for cardio machine settings like resistance/incline) are **not** reusable for this — they're a UI label for a per-set input, not a per-exercise difficulty-per-pound multiplier. This needs a genuinely new field.
**Touches (once specced)**: `data/models.js`/`exerciseLibrary.js` (new difficulty field), new Supabase tables (points ledger, challenges/leaderboard, friend relationships — check whether friend relationships exist yet before assuming greenfield), `storage.js`, likely a new screen/tab for challenges
**Depends on**: nothing in Phases A–C; nothing in Phases A–C depends on it either
**Effort**: Large, and unestimated on purpose — the item's own "done when" is a written mini-spec, not shipped code. Treat implementation as its own future multi-step sprint, scoped only after that spec exists.

---

## Git Conventions

### Branch Naming
```
feat/short-description    ← new features
fix/short-description     ← bug fixes
chore/short-description   ← setup, deps, config
refactor/short-description
```

### Commit Format
```
type(scope): short description
```

### Workflow
1. Branch from `main` per item (or small group of related items in Phase A)
2. Commit small and often
3. PR → merge → delete branch
4. Never commit directly to `main`
