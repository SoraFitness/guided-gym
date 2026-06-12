# Fix Start Workout flow + 3D animation

The Start buttons already route to `/workout/$id/session`, but the session screen doesn't behave like a guided trainer (no explicit "Set 1 of N", no rest timer, no Skip/End buttons) and the 3D viewer has no loading/error fallback. Plan focuses on the session screen and the 3D viewer — nothing else changes.

## 1. Session state machine (`src/routes/workout.$id.session.tsx`)

Extend `useActiveSession` usage with a local phase machine:

- `phase`: `"exercise" | "rest" | "complete"`
- `currentSet` (1-based, derived from `completedSets[exerciseId] + 1`)
- `restTimeRemaining` (seconds, parsed from `ex.rest`, e.g. "60s" → 60)
- `restTotal` (for the ring progress)

Flow:
1. Mount → `startSession(workoutId)`, phase = `"exercise"`, set 1.
2. **Complete Set** → `incrementSet(ex.id)`; if set < totalSets → phase = `"rest"` with countdown; if last set of last exercise → phase = `"complete"`; otherwise after rest auto-advance to next exercise set 1.
3. **Rest screen** ticks 1/s via `setInterval`; shows "Rest 0:45", **Skip Rest / Next Set** button, large ring.
4. **Skip Exercise** → set `completedSets[ex.id] = ex.sets`, advance `currentExerciseIndex`, reset to set 1, phase = `"exercise"`.
5. **End Workout** → confirm → save partial via existing `saveCompletedWorkout` + `logWorkout`, phase = `"complete"`.

Helper: `parseRest("60s" | "1m" | "90") → number`.

## 2. Exercise screen UI (same route)

Header: back, workout title, "Exercise i of N", progress bar (existing).

Hero block:
- Exercise name (big)
- `Set {currentSet} of {ex.sets}` pill
- Target: `{ex.reps ?? ex.time}` pill (large, "10 reps" style)
- Muscle group + difficulty chips

3D viewer below (always looping; controls hidden so it just plays — `showControls={false}` and `defaultSpeed={1}`).

Action stack (sticky bottom):
- Primary: **Complete Set** (neon, large)
- Row of three secondary: **Rest** (manual switch to rest phase), **Skip Exercise**, **End Workout**
- Replace existing Previous/Next + "Watch 3D Demo" + "Finish workout" row.

## 3. Rest screen overlay

Same route, swap content when `phase === "rest"`:
- Big "Rest" heading + countdown `m:ss`
- Circular SVG ring filling down
- Next-up preview: "Next: Set X of Y · {reps}" (or next exercise name if set is rolling over)
- Buttons: **+15s**, **−15s**, **Skip Rest / Next Set** (primary)
- When timer hits 0 → auto switch back to `"exercise"` phase

## 4. Completion screen
Reuse existing `CompletionScreen` (already present, fine).

## 5. 3D viewer robustness (`src/components/exercise3d/Exercise3DViewer.tsx`)

- Wrap `<Canvas>` in a React error boundary (`Exercise3DErrorBoundary`) — on any Three/WebGL error, render `<Fallback exercise={animation} />` instead of a black screen.
- Detect WebGL support on mount; if unavailable, render the fallback immediately.
- `Suspense fallback` becomes a visible skeleton (animated gradient + spinning loader + "Loading 3D demo…").
- Fallback component: animated SVG silhouette (uses existing `AnimatedAthlete` look-and-feel) with the exercise name overlay — still loops, still on-brand.
- Add `gl={{ powerPreference: "high-performance", antialias: true, failIfMajorPerformanceCaveat: false }}` and `frameloop="always"` so the avatar keeps looping while the screen is open.

## 6. Things explicitly preserved

- `/workout/$id` detail page, hero, lists, "3D Demo" deep links — untouched.
- Onboarding, nutrition, home, profile — untouched.
- `workoutSessionStore`, `progressStore`, `exerciseCoaching` data model — untouched (only consumed differently).
- Existing `workout.$id.demo.$exerciseId.tsx` page stays as a standalone demo.

## Files changed

- `src/routes/workout.$id.session.tsx` — rewrite for phase machine, set/rest UI, new buttons.
- `src/components/exercise3d/Exercise3DViewer.tsx` — error boundary, WebGL guard, loading skeleton, fallback.
- `src/components/exercise3d/ExerciseFallback.tsx` *(new)* — SVG/CSS animated fallback per `AnimationType`.

## Acceptance

- Tapping any **Start / Let's Workout / Play** button on a workout opens the session at Set 1 with reps shown and the 3D avatar looping.
- **Complete Set** → rest screen with countdown; auto-advances when timer ends or when user taps Next Set.
- After last set of last exercise → "Workout complete" screen (existing).
- **Skip Exercise** jumps to the next exercise at Set 1; **End Workout** confirms, logs partial progress, returns home.
- If WebGL fails or Three throws, the screen shows a clean animated fallback — never a blank/broken viewer.
