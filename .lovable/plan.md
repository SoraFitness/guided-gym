## Fitness App — Neon Athlete

Building an iOS-styled fitness web app (mobile-first, framed in an iPhone container for desktop preview). Look: black base with neon lime (#C6FF3D), inspired by your second screenshot.

### Design tokens
- Background `#0A0A0A`, surface `#1F1F1F`, accent neon `#C6FF3D`, text white
- Typography: Sora (display) + Manrope (body)
- Rounded-3xl cards, pill CTAs, soft glow shadows on accent

### Onboarding flow (8 steps with progress bar)
1. Welcome — animated gradient blob athlete doing reps (pure CSS/SVG morph + bounce loop)
2. Name + age + gender
3. Height + weight (unit toggle)
4. Primary goal — Gain muscle / Lose weight / Body recomposition / Increase energy (icon cards like screenshot 1)
5. Activity level — Sedentary → Very active (slider)
6. Workout location + equipment — Home / Gym + chips (bodyweight, dumbbells, bands, full gym)
7. Diet preference + injuries/limitations (multi-select chips + free text)
8. Generating plan → animated figure loading screen → land in app

Data persisted to localStorage (no backend yet) under `fitness:profile`. Onboarding is skipped on revisit; route guard sends completed users straight to `/home`.

### App shell (bottom tab bar, 4 tabs)
- **Home** — "Hi, {name}" header, daily ring (calories/minutes/workouts), recommended workouts row, today's plan list
- **Workouts** — search, Popular Workouts horizontal cards, category tabs (Cardio, Strength, Mobility), workout list
- **Progress** — weekly streak, simple bar chart, stats cards
- **Profile** — user info, goals, edit onboarding, units, reset

Plus a **Workout detail** route (`/workout/$id`) matching screenshot 2: hero image, time/kcal chips, description, Rounds list, "Let's Workout" pill CTA.

### Animated gradient blob athlete
Custom SVG component: layered gradient blobs (lime → white → dark) with CSS keyframe morph + a stylized figure silhouette that cycles squat/pushup/jump frames via `@keyframes`. Used on welcome screen and the "generating your plan" screen. No external lottie/3d libs.

### Routes
```
/                       → redirect to /onboarding or /home
/onboarding             → multi-step flow (internal state, no sub-routes)
/home                   → dashboard (in tab shell)
/workouts               → workout library
/workout/$id            → detail page
/progress               → stats
/profile                → settings
```

### Technical notes
- TanStack Start file-based routing under `src/routes/`
- `_app.tsx` layout = tab shell (only mounts on `/home`, `/workouts`, `/progress`, `/profile`)
- Profile state via small Zustand-free context + localStorage hook
- Mock workout data in `src/lib/workouts.ts`
- All colors as semantic tokens in `src/styles.css`; no hardcoded hex in components
- Sample images for workout cards generated via `imagegen` (athletes in motion, neon lighting)

### Out of scope (ask if needed)
- Real auth / cloud sync (currently localStorage)
- Video playback for exercises
- Push notifications