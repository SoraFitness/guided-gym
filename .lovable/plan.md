## Real AI food photo logging

Replace the random mock with a real Lovable AI vision call and a confirmation screen the user must approve before the meal is saved.

### Backend — new server function

**`src/lib/foodScan.functions.ts`** (new) using the same Lovable AI Gateway pattern as `bodyScan.functions.ts`:

- `createServerFn({ method: "POST" })`
- Input (Zod): `{ image: string /* data URL */ }`, ≤8 MB after base64.
- Model: `google/gemini-2.5-flash` (multimodal, fast, accurate for this task).
- Structured output via `Output.object({ schema })` matching the spec:
  ```ts
  {
    meal_name: string,
    confidence: number (0..1),
    items: Array<{
      name, estimated_amount, confidence,
      calories, protein, carbs, fat
    }>,
    total: { calories, protein, carbs, fat },
    needs_user_confirmation: boolean,
    notes?: string
  }
  ```
- Prompt instructs the model to: identify visible foods, estimate realistic portion sizes (g / cups / pieces), use standard nutrition database values (USDA-style) for macros, never invent precise numbers it can't justify, set `needs_user_confirmation: true` when any item confidence <0.7, round macros to integers, return total = sum of items.
- Re-compute `total` server-side from items (so it always matches even if the model drifts).
- On any model/parse failure → return `{ ok: false, reason: "unrecognized" }`. On success → `{ ok: true, result }`. No silent fallback to fake data.
- Ensure `LOVABLE_API_KEY` exists; call `ai_gateway--create` during build if missing.

### Frontend wiring

**`src/lib/foodLookup.ts`**
- Remove `mockImageMeals` and the random `aiFoodScanService.analyzeImage`. Keep barcode mock as-is (out of scope).
- Export new `FoodScanResult` type mirroring the server schema.

**`src/routes/_app.nutrition.tsx`** — replace `PhotoPanel`:

State machine:
1. **Idle** — dashed upload tile + small tip card: "💡 For best results, take the photo from above with the full plate visible."
2. **Preview** — show selected image, "Analyze meal" CTA, allow re-pick.
3. **Loading** — overlay spinner + "Analyzing your meal…".
4. **Confirm** — calls new `analyzeFoodImage` via `useServerFn`. On `{ok:true}` render `PhotoConfirm`. On `{ok:false}` render an error card:
   > "Couldn't detect this meal clearly. Try another photo or add food manually."
   with **Try again** and **Add manually** buttons (manual switches tab to `manual`).

`PhotoConfirm` (inline component):
- Title: **Confirm your meal**.
- Image thumbnail + detected `meal_name` + confidence pill (color: green ≥0.85, neon 0.7–0.84, amber <0.7).
- If `needs_user_confirmation || confidence < 0.7`: warning banner "We're not fully sure. Please confirm the foods and portions."
- Editable list of `items`: name, estimated_amount, kcal, P/C/F inputs (numeric). Add/remove row. Live-computed totals row at bottom.
- Buttons: **Save Meal** (primary), **Re-analyze** (re-runs server fn on same image), **Edit manually** (collapses to plain form).
- On Save: call existing `addEntry` once per item with `meal` from current meal selector, `servings: 1`, `custom: { name, serving: estimated_amount, kcal, protein, carbs, fat, source: "image" }`. Close panel and return to log view.

Mobile: same dark/neon style, single column, sticky CTA inside the sheet area.

### Validation / safety

- Zod parse every field server-side; clamp negatives to 0; round to ints; cap items at 12.
- Reject images >8 MB before upload.
- Never auto-save without explicit Save Meal tap.
- No hardcoded foods anywhere in the new flow.

### Verification

Upload three different real meal photos:
- Each yields different, plausible items with the same model — not the same mock list.
- Low-confidence photo shows the amber banner.
- Network/API failure shows the "Couldn't detect" card with manual fallback.
- Saved meals appear in the nutrition log with correct totals.
- No `LOVABLE_API_KEY` leaked to the client bundle.
