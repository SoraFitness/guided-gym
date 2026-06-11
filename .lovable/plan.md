# Weekly Schedule Tab

Add a personalized weekly workout schedule to the Workouts page, driven by onboarding answers (goal, experience, equipment, days/week, session length, focus areas).

## New top-level tabs on Workouts page

Replace the current chip row with a 3-tab segmented control:
- **Recommended** — current scored list (existing behavior)
- **Weekly Schedule** — new personalized 7-day plan
- **All Workouts** — current category-filtered list, with the existing category chips moved below the tab

Tab state persists in component state; smooth Framer Motion transitions between tabs.

## Weekly Schedule generation

New file: `src/lib/weeklySchedule.ts`

```text
WeeklyScheduleDay {
  id, dayName, date?, workoutId?, workoutTitle, focus,
  duration, difficulty, equipment, estimatedCalories,
  exercises: string[],   // exercise name previews
  isRestDay, isToday, isCompleted
}
```

`weeklyScheduleService.generateSchedule(profile)` returns 7 days (Mon–Sun) using these splits:

- 2d: Full Body Strength, Rest, Full Body Conditioning, Rest, Rest, Rest, Rest
- 3d: Push, Rest, Pull, Rest, Legs, Rest, Rest
- 4d: Upper, Rest, Lower, Rest, Push, Pull+Core, Rest
- 5d: Push, Pull, Legs, Rest, Upper, Conditioning/Core, Rest
- 6d: Push, Pull, Legs, Rest, Push, Pull, Legs

For each training day, the service:
- Picks a matching workout from `workouts` (filtered by `profile.equipment`).
- Builds a Gym-Mode exercise preview list using equipment-specific exercise pools:
  - **gym**: barbell squat, bench press, lat pulldown, leg press, cable row, shoulder press, hamstring curl, triceps pushdown, bicep curl, cable crunch
  - **dumbbells**: DB bench, DB row, goblet squat, RDL, DB shoulder press, hammer curl, skullcrusher, DB lunge
  - **none**: push ups, squats, lunges, glute bridge, plank, mountain climbers, pike push ups
- Tunes duration to `profile.sessionMinutes`, difficulty to `profile.experience`, and biases workout pick toward `profile.focusAreas` and `profile.goal`.
- Marks `isToday` based on `new Date().getDay()`.

Completion stored in `localStorage` key `fitness:weeklyCompletion` as `{ weekStartISO: string, completed: Record<dayId, true> }`. New week (different Monday) resets completion.

`rebuildSchedule()` simply regenerates from the current profile and clears completion for days in the past week if profile changed.

## UI

`src/routes/_app.workouts.tsx` updated to render the new tabs. Weekly Schedule renders a vertical stack of day cards:

**Training day card** (rounded, dark elevated surface, lime accent on Today badge & Start button):
- Top row: Day name (large) + status badge (Today / Completed / Upcoming)
- Workout title
- Focus area subtitle (e.g. "Chest, Shoulders, Triceps")
- Meta row: duration · difficulty · equipment
- Exercise preview chips (first 4 names)
- Estimated calories pill
- Buttons: **Start Workout** (primary lime) → `/workout/$id`, **View Details** (ghost) → same route, **Mark Complete** (icon toggle)

**Rest day card**: softer muted surface, "Rest & Recovery" + "Stretch, walk, hydrate, and recover.", optional "Mobility Session" button linking to `mobility-recovery` workout.

Sticky header area inside Weekly Schedule with **Rebuild Weekly Plan** button; on tap, regenerates schedule and shows a brief toast/inline confirmation "Plan rebuilt".

Framer Motion: stagger-fade day cards on mount and on rebuild; tab content cross-fades.

Bottom padding `pb-28` so cards clear the bottom nav.

## Files

- **New**: `src/lib/weeklySchedule.ts` (types + service + localStorage helpers)
- **Edit**: `src/routes/_app.workouts.tsx` (tabs, Weekly Schedule UI, Recommended + All sub-views preserved)
- **Edit**: `src/lib/workouts.ts` *(only if needed)* — export a small helper to look up workout by split label; otherwise reuse existing `workoutRecommendationService`

No changes to onboarding, profile, or other routes. No new deps (Framer Motion, Tailwind already installed).

## Acceptance

- Recommended and All Workouts tabs continue to work exactly as today.
- Weekly Schedule reflects `profile.daysPerWeek`, equipment, experience.
- Today badge appears on the correct weekday.
- Marking a day complete persists across reload.
- Rebuild button regenerates and shows confirmation.
- Build and dev both pass with no TS errors.
