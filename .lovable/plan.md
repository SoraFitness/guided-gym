## Plan

### 1. Make every workout start button actually start a session
- Update all workout start entry points to call the session store before navigating:
  - Detail page hero play button
  - Detail page exercise-row Start buttons
  - Sticky “Let’s workout” button
  - Weekly schedule Start buttons
  - 3D demo “Start workout” button
- Use a shared `startWorkoutAndNavigate(workoutId)` helper so behavior is consistent.
- Ensure buttons are regular tappable controls with no disabled state or overlay blocking them.

### 2. Harden workout session state
- Keep the existing `fitness:activeSession` store, but make it safer:
  - Create a new session when the route opens and no active session exists.
  - Reset stale/completed sessions for a different workout.
  - Add fallback workout data if a workout unexpectedly has no exercises.
- Track the required session fields through the route state/UI:
  - `workoutStarted`
  - `currentExerciseIndex`
  - `currentExercise`
  - `currentSet`
  - `totalSets`
  - `targetReps`
  - `isResting`
  - `restTimeRemaining`
  - `workoutCompleted`

### 3. Fix the active workout progression flow
- Refactor `/workout/$id/session` so the first loaded screen immediately shows:
  - Exercise name
  - `Set 1 of 3`
  - target reps/time
  - animated exercise demo
  - Complete Set, Rest, Skip Exercise, End Workout controls
- Fix progression logic:
  - Complete Set increments the current set.
  - Rest screen appears after a completed set.
  - Next Set exits rest and advances to the next set or next exercise.
  - After the final set of the final exercise, show Workout Complete.
- Keep mobile-safe tap targets and visible active feedback.

### 4. Add a reusable reliable exercise animation component
- Create `ExerciseAnimation({ exerciseName })` as the session-facing animation component.
- Internally map exercise names to animation types:
  - Squats → squat
  - Push Ups → pushup
  - Lunges → lunge
  - Bicep Curls → curl
  - press/plank/other movements fallback appropriately
- Use the existing React Three Fiber primitive avatar as the primary animation and keep it autoplaying/looping.

### 5. Guarantee no blank 3D area
- Improve the 3D viewer fallback path so it never stays blank if WebGL, Canvas, or model rendering fails.
- Add clear states inside the animation area:
  - Loading: “Loading 3D demo...”
  - Fallback: “3D demo fallback loaded” while still showing an animated mannequin/silhouette.
- Avoid external model dependency for the workout session by using primitive Three.js geometry fallback that ships in code.

### 6. Validation after implementation
- Verify the app behavior in preview:
  - Tap “Let’s workout” and confirm the session route opens.
  - Confirm the screen starts at Squats/first exercise, Set 1 of 3, with reps visible.
  - Confirm the animation is visible and moving.
  - Complete Set starts rest.
  - Next Set moves forward.
  - Final exercise ends on Workout Complete.
  - Check console for no new workout/3D errors.

### Technical notes
- I will not edit `routeTree.gen.ts`; route generation will be handled by the router plugin.
- The existing route `/workout/$id/session` already exists, so I’ll fix and harden it rather than adding a duplicate route unless a simpler alias is needed later.
- The current likely root cause is that navigation occurs before session state is created, and the route relies on a delayed effect plus possibly fragile 3D Canvas fallback behavior.