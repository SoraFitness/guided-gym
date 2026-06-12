## Goal

Replace the current placeholder calorie math (flat ±250/±400 kcal applied to TDEE) with a real, formula-driven Goal & Calories engine. The user's calorie target, daily deficit, workout burn target, weekly loss estimate and goal date all derive from profile data + goal-weight delta + target date. A weekly adaptive layer (no AI) re-estimates true maintenance from observed weight change vs. logged intake.

## What gets built

### 1. New calorie engine module — `src/lib/calorieEngine.ts`
Pure functions, fully unit-convertible, with all formulas in one place:

- `lbsToKg`, `kgToLbs`, `inToCm`, `cmToFtIn`
- `bmrMifflin({ gender, weightKg, heightCm, age })`
- `tdee(bmr, activityLevel)` with the 5 multipliers from the spec (sedentary 1.2 → athlete 1.9). Activity comes from a new explicit profile field, not from `daysPerWeek`, to avoid double-counting workouts.
- `weightDeltaKg(currentKg, goalKg)`
- `estimatedTotalDeficitKcal(deltaKg)` = `deltaKg × 7700` (flagged as estimate)
- `daysBetween(today, targetDate)`
- `computePlan({ profile, goalWeightKg, targetDate, goalType, splitPreset })` returns:
  ```
  {
    maintenanceKcal,
    recommendedIntakeKcal,
    dailyDeficitKcal,        // negative for surplus
    foodDeficitKcal,         // intake reduction
    exerciseBurnTargetKcal,  // daily burn target
    weeklyChangeLb,          // negative = loss
    estimatedGoalDate,       // may differ from user's target if clamped
    isAggressive,            // boolean
    safeAlternative?: { targetDate, weeklyChangeLb, dailyDeficitKcal },
    notes: string[]          // human explanations
  }
  ```
- Goal-type handling:
  - `lose_weight`: deficit driven by delta + timeline.
  - `build_muscle`: surplus = TDEE × (lean 7% / faster 12%). Selectable.
  - `maintain`: intake = TDEE, no burn target.
  - `recomp`: small deficit (~7% TDEE).
- Split presets: `mostly_diet` (90/10), `balanced` (70/30), `mostly_exercise` (50/50).
- Safety clamps:
  - Min intake: 1500 male / 1200 female (warn + push back).
  - Max weekly loss: 1% of body weight or 1 kg/week — whichever is lower.
  - If user's date forces breach, compute `safeAlternative` with a longer date and surface the warning. No silent unsafe targets.

### 2. Profile extensions — `src/lib/profile.tsx`
Add fields with migration defaults:

- `activityLevel: "sedentary" | "light" | "moderate" | "very" | "athlete"` (default derived from current `daysPerWeek`)
- `goalTargetDate: string` (ISO; default = today + 12 weeks)
- `bodyFatPct?: number`
- `avgStepsPerDay?: number`
- `deficitSplit: "mostly_diet" | "balanced" | "mostly_exercise"` (default `balanced`)
- `bulkPace?: "lean" | "faster"` (used when goal = build_muscle)

`suggestNutrition()` is rewritten to call `computePlan` and return the resulting kcal + macro split (protein/kg unchanged; carbs as remainder). All consumers (Home, Nutrition, Profile editor) automatically pick up the new numbers.

### 3. Weight log + adaptive recalibration — `src/lib/weightLogStore.ts` (new)
- localStorage-backed reactive store (same pattern as `foodHistoryStore`).
- `logWeight({ kg, date })`, `getWeightHistory()`, `getLatestWeight()`.
- `recalibrateMaintenance({ weightHistory, intakeHistory, currentPlan })`:
  - Needs ≥ 7 days of both weights and logged intake.
  - Observed weekly change × 7700 / 7 = observed daily delta vs. avg intake.
  - `observedMaintenance = avgDailyIntake + observedDailyDelta`.
  - Blend with formula TDEE (70% observed / 30% formula) once ≥ 14 days of data; smooth to avoid week-to-week whiplash.
  - Returns `{ adjustedMaintenanceKcal, confidence, suggestion: string }`.
- Pulls intake from existing `nutritionStore` daily totals.

### 4. Onboarding additions — `src/routes/onboarding.tsx`
- New step **"Daily activity"** with the 5-level activity selector (icon cards) and an "Avg daily steps (optional)" field.
- New step **"Your timeline"**: goal target date picker + deficit-split preset (3 cards) + (when bulking) lean vs. faster bulk toggle.
- Body-fat % becomes an optional input on the existing body step.

### 5. Goal & Calories panel in Progress — `src/routes/_app.progress.tsx`
Adds a new section above the current charts:

- **Header card**: Current weight, goal weight, target date, progress bar.
- **Plan summary grid** (4 tiles): Maintenance, Recommended intake, Daily deficit, Workout burn target.
- **Weekly forecast**: estimated weekly change (lb/kg per profile units), projected goal date, "On track / Aggressive" badge.
- **Deficit split selector** (3 chips → recomputes live).
- **Log weight** quick-add button (writes to `weightLogStore`).
- **Weekly recalibration card**: shows adjusted maintenance + suggestion if enough data, otherwise "Log weight 7+ days to enable smart adjustments."
- **Edit goal** sheet: targetDate, goalWeight, activity level, body fat %, steps, bulk pace.
- **How we calculated this** disclosure with the BMR/TDEE/deficit/split breakdown using the user's actual numbers.

Warnings (aggressive plan, sub-min intake, unrealistic timeline) render inline with the suggested safer alternative and a one-tap "Use safer plan" button that updates the profile.

### 6. UI cleanup
- Profile page "Daily targets" editor keeps manual override but adds a "Reset to calculated" button that re-pulls from `computePlan`.
- Remove the hardcoded `nutritionPlan` ± 250 / ± 400 path from `nutritionService.ts` — kcal now flows from `computePlan` end-to-end.

## What stays untouched
3D exercise guidance, workout plans, nutrition logging UI, branded food search, body scan, paywall, app tour, profile settings, workout tracker. No DB / backend changes — everything stays client-side in localStorage.

## Verification
- Spot-check formulas against the spec for a male 30 / 180 cm / 90 kg → 80 kg in 12 weeks: BMR ≈ 1880, TDEE @ moderate ≈ 2914, deficit ≈ 916/day, balanced split → eat ~2273, burn ~275, ~1.8 lb/week (flagged aggressive at 1% rule).
- Confirm safety clamps engage on a 10 kg in 4 weeks request and surface a safer alternative.
- Confirm Home + Nutrition pages now read kcal from `computePlan` (no flat ±250).
- Confirm weight log persists and recalibration card unlocks at 7+ entries.
