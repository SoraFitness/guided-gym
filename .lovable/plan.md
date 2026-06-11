# Sync Home & Nutrition + Premium Food Visuals

## Problem
Home shows hardcoded `kcal = 380`, `mins = 22`, `streak = 6 days`. Nutrition reads real data from `loadLog()`. They never match. Meal/food visuals are bare emoji.

## 1. Shared nutrition + progress store

**New file**: `src/lib/nutritionStore.ts`
- Tiny pub/sub on top of existing `loadLog`/`saveLog` in `src/lib/foods.ts` (keep storage key `fitness:foodlog` so nothing is lost).
- Exports a `useNutrition()` hook returning:
  - `entries`, `todayEntries`
  - `totals` (kcal/protein/carbs/fat for today, via existing `macrosFor`)
  - `goals` (from `loadGoals()`, recomputed when profile changes via `suggestNutrition`)
  - `remaining`, `progress` (0–1 per macro)
  - `addEntry`, `updateEntry`, `removeEntry` — all call `saveLog` and emit a change event so every subscriber re-renders.
- Listens to `storage` event so cross-tab edits sync too.

**New file**: `src/lib/progressStore.ts`
- `useProgress()` returning:
  - `workoutMinutesToday`, `workoutMinutesTarget` (from `profile.sessionMinutes`)
  - `completedThisWeek`, `streakDays`
- Backed by `localStorage` key `fitness:workoutLog` (array of `{ id, date, minutes, workoutId }`). For now, the workout detail page's "complete" action and the weekly schedule "mark complete" can push into this; reads work immediately and default to 0/empty.

Both stores are the **single source of truth**. Home and Nutrition import the same hook — no separate numbers anywhere.

## 2. Home screen rewrite (`src/routes/_app.home.tsx`)

Replace the hardcoded `kcal/mins/streak` block with:

- **Today's Nutrition card**: ring shows `totals.kcal / goals.kcal`, 3 macro bars (P/C/F) with eaten / target. Empty state: "Start by scanning or logging your first meal" + CTA to `/nutrition`.
- **Today's Activity card**: workout minutes ring, "X workouts this week", streak chip.
- Keep the weekly plan + recommended sections unchanged.

All values come from `useNutrition()` and `useProgress()`.

## 3. Nutrition screen polish (`src/routes/_app.nutrition.tsx`)

- Swap local state for `useNutrition()` so adds/removes propagate instantly.
- Goals read from same hook; if user edits goals in Profile, Nutrition + Home update on next render (we emit on save).
- Replace inline emoji meal headers with new `<MealThumbnail meal="breakfast" />`.
- Replace per-food emoji with new `<FoodThumbnail food={f} />`.
- Tighten visual: charcoal cards (`bg-surface`), `border border-white/[0.05]`, smaller pill "+ Add" buttons, lime accent reserved for active progress + primary CTA only.
- Meal card layout:
  - Thumbnail · Meal name · "N items · X kcal" · Add button
  - Expanded list of food rows: thumbnail · name · `1 serving · P6 · C6 · F14` · `165 kcal` · swipe/tap → edit/delete (existing actions kept).

## 4. Premium food/meal thumbnails

**New file**: `src/components/FoodThumbnail.tsx`
- Two exports: `FoodThumbnail` and `MealThumbnail`.
- Rounded-2xl 44–56px tile with a per-category gradient background, subtle inner border, soft shadow, and a centered lucide icon (or emoji at smaller size with drop-shadow for fallback).
- Category map (drives gradient + icon):
  - breakfast → warm amber/orange gradient + `EggFried`/`Coffee` icon
  - lunch → green/emerald gradient + `Salad` icon
  - dinner → deep indigo/violet gradient + `UtensilsCrossed` icon
  - snack → rose/pink gradient + `Cookie` icon
  - protein (chicken, salmon, shake, yogurt, eggs) → red/orange gradient + `Drumstick`/`MilkOff` icon
  - carbs (rice, oatmeal, toast, sweet potato, hashbrowns) → amber gradient + `Wheat` icon
  - fats (avocado, almonds) → lime gradient + `Nut` icon
  - fruit (apple, banana) → pink/red gradient + `Apple` icon
  - drink (coffee/latte) → brown gradient + `Coffee` icon
  - veg (broccoli) → green gradient + `Leaf` icon
  - fallback → neutral charcoal + `Utensils` icon
- Resolver: `categoryFor(food)` uses `food.tags` + id heuristics; works for both preset and custom logs.

No external images — everything is CSS gradients + lucide icons, so it stays premium without childish emoji and without asset uploads.

## 5. Profile → goals sync

`_app.profile.tsx` already writes goals via `saveGoals`. We wrap `saveGoals` in `nutritionStore` to also emit a change event so Home/Nutrition update instantly without a refresh.

## Files

- new: `src/lib/nutritionStore.ts`, `src/lib/progressStore.ts`, `src/components/FoodThumbnail.tsx`
- edit: `src/routes/_app.home.tsx` (remove hardcoded numbers, use stores)
- edit: `src/routes/_app.nutrition.tsx` (use store, swap thumbnails, polish)
- edit: `src/lib/foods.ts` (re-export `saveGoals` through store wrapper, or have store call it + emit)
- edit: `src/routes/_app.profile.tsx` (call store's `saveGoals` so subscribers update)

## Acceptance

- Log Almonds (165 kcal, P6/C6/F14) in Nutrition → Home immediately shows 165/2100 kcal, 1935 remaining, P6/140, C6/230, F14/70.
- Delete the entry → both screens drop to 0 in the same render.
- Change calorie target in Profile → both screens reflect the new target without reload.
- Refresh page → values persist (localStorage).
- No hardcoded `380`, `22`, or `6 days` anywhere.
