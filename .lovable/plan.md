# Plan: Working Workout Flow + 3D Exercise Demo

## 1. Fix all "Start workout" buttons

Currently `src/routes/workout.$id.tsx`'s "Let's workout" button is a plain `<button>` with no handler. Same problem on the hero play circle. Home + Weekly Schedule "Start" links already route to `/workout/$id`, but there's no session screen yet.

Changes:
- `workout.$id.tsx`: make "Let's workout" + hero play circle navigate to `/workout/$id/session`. Add a "Watch 3D Demo" button to each exercise row that opens the demo modal/route for that exercise.
- `_app.workouts.tsx` (Weekly Schedule "Start"): already navigates to detail — also add a direct "Start now" that jumps straight to the session screen for that day's workout. Falls back to a default `bodyweight-starter` workout when no schedule match.

## 2. New Workout Session screen

New route: `src/routes/workout.$id.session.tsx`.

Layout (mobile-first, dark):
- Top bar: back arrow (confirm exit), workout title, exercise `n / total`.
- Progress bar across all exercises × sets.
- Big card: current exercise name, target muscle, equipment, difficulty, sets × reps / time, rest.
- Embedded `Exercise3DViewer` showing the matching animation.
- Timer: counts up during a set; auto rest countdown between sets.
- Buttons: Previous · Mark Set Complete · Next Exercise · Watch 3D Demo (fullscreen) · Finish Workout.

State held in new `src/lib/workoutSessionStore.ts` (localStorage):
- `WorkoutSession { id, workoutId, startedAt, completedAt?, currentExerciseIndex, completedSets: Record<exerciseId, number>, status }`
- `CompletedWorkout { id, workoutId, workoutTitle, completedAt, durationMin, calories, exercisesCompleted }`
- Resumes active session if user navigates away and back.

On Finish:
- Persist `CompletedWorkout`, call existing `logWorkout(minutes, workoutId)` (`progressStore`) so Home stats/streak/weekly count update automatically.
- Show completion screen with duration, exercises, calories, new streak, "Back to Home" + "Do another".

## 3. 3D Exercise Demo (React Three Fiber)

Install (if missing): `three`, `@react-three/fiber`, `@react-three/drei`.

New files in `src/components/exercise3d/`:
- `AvatarModel.tsx` — procedural humanoid built from Three.js primitives (sphere head, capsule torso/limbs). Two proportion presets:
  - `male`: wider shoulders, narrower hips, darker shorts + tank.
  - `female`: narrower shoulders, wider hips, sports-bra + shorts.
  - `neutral`: balanced athletic build.
  Single skin material, gym-appropriate clothing. No nudity / sexualized geometry. Accepts a `pose` prop = per-joint rotations.
- `ExerciseAnimationController.tsx` — maps `demoType` / exercise name → animation function `(t) => pose`. Keyframe interpolation for: squat, push-up, lunge, plank (subtle breathing), shoulder press, bicep curl, generic standing idle. Supports play/pause + speed.
- `Exercise3DViewer.tsx` — `<Canvas>` with fixed 3/4 camera (toggle Front / Side), soft lighting, contact shadow, floor plane, no orbit (or clamped). Reads gender via `useProfile()` to pick avatar preset. Exposes play/pause + slow-mo controls.

Name → animation mapping by substring: `squat`, `push up`/`push-up`/`pushup`, `lunge`, `plank`, `shoulder press`/`ohp`/`overhead press`, `curl` → bicep curl. Otherwise neutral idle.

SSR safety: Canvas mounted client-only (dynamic import or `typeof window` guard) so build doesn't break.

## 4. Demo screen

Route: `src/routes/workout.$id.demo.$exerciseId.tsx` (also reachable as overlay from session/detail).

Shows: back, exercise title, `Exercise3DViewer`, controls (Play/Pause, Slow-mo, Front/Side), Form tips, Common mistakes, Target muscles, Safety note. Tips/mistakes come from a new `EXERCISE_COACHING` map keyed by demoType, with beginner vs advanced cues chosen from `profile.experience`, plus goal-flavored extra tip.

## 5. Personalization hookup

`Exercise3DViewer` and demo screen pull from `useProfile()`:
- `gender` → avatar preset.
- `experience` → default animation speed + which coaching cue set.
- `goal` → extra tip line (conditioning vs hypertrophy).

## 6. Files touched / created

Created:
- `src/routes/workout.$id.session.tsx`
- `src/routes/workout.$id.demo.$exerciseId.tsx`
- `src/lib/workoutSessionStore.ts`
- `src/lib/exerciseCoaching.ts`
- `src/components/exercise3d/Exercise3DViewer.tsx`
- `src/components/exercise3d/AvatarModel.tsx`
- `src/components/exercise3d/ExerciseAnimationController.tsx`

Edited (minimal, additive):
- `src/routes/workout.$id.tsx` — wire buttons, add per-exercise Demo + Start links.
- `src/routes/_app.workouts.tsx` — Weekly Schedule "Start" jumps to session.
- `package.json` / lockfile — add three + r3f + drei.

Nothing existing removed. Home, Nutrition, Profile, Scan, Onboarding, stores untouched except additive imports.

## 7. Quality bar

- Type-check clean, no new lint errors.
- Canvas wrapped so SSR/prerender doesn't import `three` at module top-level of a route loader.
- Buttons all wired; no dead handlers.
- Procedural avatar fallback always renders even without external GLB assets.
- Session screen mobile-first, content padded above bottom nav.

## How to preview after build

1. Open `/workouts` → tap any workout → "Let's workout" → lands on session screen.
2. Inside session, tap "Watch 3D Demo" → 3D avatar animates the current exercise; gender from onboarding determines avatar.
3. Tap Finish → completion screen → Home now shows updated minutes / streak / weekly count.
