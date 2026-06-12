## Profile rows: make every action functional

Scope is the Profile route plus a small additive change to the profile data model. Existing Progress and Body Scan routes already exist — taps just need to actually reach them.

### Root cause of broken taps

In `src/routes/_app.profile.tsx`, the `Row` component renders its own `<button>`. It's wrapped in `<Link>` or another `<button>`, which is invalid nested-interactive HTML — browsers (and mobile Safari especially) drop/garble the outer click. Goal / Equipment / Injuries / Reset rows also have no handlers at all.

Fix: turn `Row` into a presentational `<div>` and put exactly one interactive element (`<Link>`, `<button>`) around each row.

### Edits

**`src/lib/profile.tsx`**
- Add optional `equipmentItems?: string[]` to `Profile`.
- Persist it through `setProfile` / `updateProfile` (already generic, no logic change).
- `migrate()`: default `equipmentItems` from existing `equipment` enum (e.g. `dumbbells` → `["Dumbbells"]`, `gym` → `["Full gym access"]`, `none` → `["No equipment"]`, `mixed` → `["Dumbbells","Bench"]`).
- Export `EQUIPMENT_OPTIONS = ["No equipment","Dumbbells","Barbell","Resistance bands","Machines","Kettlebells","Bench","Pull-up bar","Full gym access"]`.
- Export `GOAL_OPTIONS` covering: Lose weight, Build muscle, Maintain weight, Get stronger, Improve endurance, Improve overall fitness — mapped onto existing `Goal` enum (add `"get_stronger"` and `"overall"` to the union; update `GOAL_LABELS` and `migrate()` accordingly so old saves still load).

**`src/routes/_app.profile.tsx`**
- Refactor `Row` to a plain `<div>` (no `<button>` inside).
- Wrap each row in its own clickable element:
  - Progress → `<Link to="/progress">`
  - Body Scan history → `<Link to="/scan/body">`
  - App tour → `<button>` that calls `resetTour()` then `navigate({ to: "/home" })` (existing AppTour auto-opens when tour isn't completed).
  - Goal → opens `GoalSheet` (bottom sheet with radio list of `GOAL_OPTIONS`). On save: `updateProfile({ goal })`, close sheet. Row preview reflects new value immediately via `GOAL_LABELS`.
  - Equipment → opens `EquipmentSheet` (multi-select checkboxes from `EQUIPMENT_OPTIONS`). On save: `updateProfile({ equipmentItems, equipment })` where `equipment` is derived (none/dumbbells/gym/mixed) for downstream workout generation. Row preview shows joined list, e.g. "Dumbbells, Bench".
  - Injuries / notes → opens `InjuriesSheet` (textarea, save button). On save: `updateProfile({ injuries })`. Row preview shows first line / "Add notes" when empty.
  - Reset profile → opens `ResetConfirmDialog` with the required confirmation copy and Cancel / Reset Profile buttons. On confirm: clear `fitness:profile`, `resetTour()`, `navigate({ to: "/onboarding" })`.
- Sheets/dialog use existing shadcn `Sheet` and `AlertDialog` components — dark surface, neon accents, matching current style.

**No changes** to Progress page UI, Body Scan history UI, AppTour overlay, workout generation logic, or `tourStore`. The existing `/progress` and `/scan/body` routes already render real content (or their own empty states).

### Verification

In preview at `/profile`:
- Tap each row → correct screen / sheet / dialog opens.
- Change Goal → row label updates immediately; reload page → still updated.
- Change Equipment to a multi-select → row shows joined names; reload → persists.
- Edit injuries → preview updates; reload → persists.
- App tour row → lands on `/home` and the tour overlay opens.
- Reset profile → confirmation shows; Cancel does nothing; Reset clears profile, resets tour, navigates to `/onboarding`.
- No nested-button warnings in console.
