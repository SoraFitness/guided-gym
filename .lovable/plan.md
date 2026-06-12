# Interactive App Tour after Onboarding

A guided overlay walks new users through every main feature the first time they reach `/home`, with Back / Next / Skip / Finish controls, completion persisted to `localStorage`, and a restart entry in Profile.

## 1. State + persistence

`src/lib/tourStore.ts` (new)
- Key: `fitness:tourCompleted` in `localStorage`.
- `useTourCompleted()` hook via `useSyncExternalStore` (mirrors existing stores in `src/lib`).
- `markTourCompleted()`, `resetTour()` helpers + custom-event broadcast.

## 2. Tour engine

`src/components/tour/AppTour.tsx` (new)
- Props: `steps: TourStep[]`, `open`, `onClose(completed: boolean)`.
- Step shape: `{ id, targetId, title, body, icon, placement?: "top"|"bottom"|"center", route?: "/home"|"/workouts"|... }`.
- Target lookup: `document.querySelector(\`[data-tour="\${targetId}"]\`)` → `getBoundingClientRect()` on mount, on resize, on scroll, and on step change.
- Renders a fixed full-screen layer with:
  - Dark backdrop (`bg-black/75 backdrop-blur-sm`) using an SVG mask cut-out around the target's rect (rounded 16px, 8px padding). When `placement: "center"` or target missing, no cut-out — just a centered modal.
  - Neon glow ring around the cut-out (`ring-2 ring-neon shadow-[0_0_40px_oklch(0.92_0.21_130/0.55)]`).
  - Tooltip card (framer-motion `motion.div`, spring transition) positioned above or below the cut-out, auto-flips if off-screen; pinned to viewport center when no target.
  - Card: step counter pill (`3 / 8`), icon + title, short body, progress dots, **Back / Skip Tour / Next** (or **Finish** on last step).
- Behavior:
  - If `step.route` differs from current path → `navigate({ to: step.route })` then re-measure after route mounts (rAF + 60ms timeout).
  - Esc and backdrop click → Skip (treated as completed = true, won't reshow).
  - Locks page scroll while open.
  - Smooth scrolls target into view if needed (`scrollIntoView({ block: "center", behavior: "smooth" })`).
- Animations: backdrop fade, cut-out rect tweened, card spring-in per step.

## 3. Tour steps (`src/lib/tourSteps.ts` new)

Ordered list, each with `route` and `targetId`:
1. **Welcome** — center modal, no target. "Quick tour of Pulse."
2. **Home** — `/home`, target `tour-home-header`.
3. **Today's Nutrition** — `/home`, target `tour-nutrition-card`.
4. **Progress tracker** — `/home`, target `tour-progress-card`.
5. **Start Workout** — `/home`, target `tour-today-workout` (today's workout hero).
6. **Workout Schedule** — `/workouts`, target `tour-workouts-plan`.
7. **3D Exercise Demos** — `/workouts`, target `tour-3d-demo` (first workout card, with note: "Tap any exercise to see the 3D trainer.").
8. **Body Scan** — `/scan`, target `tour-bodyscan`.
9. **Nutrition log** — `/nutrition`, target `tour-nutrition-log`.
10. **Profile & Settings** — `/profile`, target `tour-profile-settings`. Finish.

## 4. Anchoring (only `data-tour` attributes, no layout changes)

Add `data-tour="..."` to existing elements:
- `src/routes/_app.home.tsx`: header wrapper, nutrition card, progress section, today's workout block.
- `src/routes/_app.workouts.tsx`: weekly plan section, first workout card.
- `src/routes/_app.scan.index.tsx`: body-scan CTA card.
- `src/routes/_app.nutrition.tsx`: today's log card / add-food button.
- `src/routes/_app.profile.tsx`: settings row.

No visual changes — purely attributes.

## 5. Auto-launch + restart

`src/routes/_app.home.tsx`
- Add `useEffect`: if `profile && !tourCompleted` → `setTourOpen(true)` once.
- Render `<AppTour open={tourOpen} steps={TOUR_STEPS} onClose={(done) => { if (done) markTourCompleted(); setTourOpen(false); }} />` at the page root.
  - Mounted from home so it can navigate through the app while staying alive (overlay is `fixed` so it survives Outlet swaps; we keep the component mounted as long as `open`).
  - When the tour navigates to other tabs, the engine itself stays mounted because it lives inside `_app/home` route component. To handle this, the engine listens to `useRouterState` for pathname changes and re-anchors; the home route stays in the React tree only while pathname is `/home`. → To avoid unmount on navigation, mount the engine in `src/routes/_app.tsx` (the layout) instead, gated by a local `tourOpen` state hook reading `tourCompleted`. **Final placement: `_app.tsx`** — outside the `<Outlet />`.

`src/routes/_app.profile.tsx`
- Add a "Restart app tour" row in the settings/list area that calls `resetTour()` and navigates to `/home`. The home layout effect re-detects `!tourCompleted` and reopens the tour.

## 6. Things preserved

- Onboarding route, profile store, navigation, all existing screens untouched aside from added `data-tour` attributes and one Profile row.
- No new deps (framer-motion already present).
- If a `data-tour` target is missing on slower mounts, the engine falls back to a centered modal for that step — never blocks the user.

## Files

**New**
- `src/lib/tourStore.ts`
- `src/lib/tourSteps.ts`
- `src/components/tour/AppTour.tsx`

**Edited (attributes + small wiring only)**
- `src/routes/_app.tsx` — mount `<AppTour>` once, auto-open on first visit with a profile.
- `src/routes/_app.home.tsx` — `data-tour` attrs.
- `src/routes/_app.workouts.tsx` — `data-tour` attrs.
- `src/routes/_app.scan.index.tsx` — `data-tour` attr.
- `src/routes/_app.nutrition.tsx` — `data-tour` attr.
- `src/routes/_app.profile.tsx` — `data-tour` attr + "Restart app tour" row.

## Acceptance

- Finish onboarding → land on `/home` → tour overlay opens automatically.
- Back / Next move between steps; Skip Tour and Finish both persist completion.
- Reload `/home` → tour does not reappear.
- Profile → "Restart app tour" reopens it from step 1.
- During the tour, the active feature is visibly highlighted with a neon cut-out; tooltip card explains it; tab navigation between steps is automatic.
- If a target element isn't found on a step, the tour shows a centered modal for that step instead of breaking.
